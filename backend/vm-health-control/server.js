require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3095;

app.use(cors());
app.use(express.json());

// Log Analytics configuration
const LOG_ANALYTICS_WORKSPACE_ID = process.env.LOG_ANALYTICS_WORKSPACE_ID || '';
const LOG_ANALYTICS_SHARED_KEY = process.env.LOG_ANALYTICS_SHARED_KEY || '';
const LOG_TYPE = process.env.LOG_TYPE || 'VMHealthStatus';

// In-memory state tracking
const state = {
  updatedAt: new Date().toISOString(),
  vms: {
    madrid: { healthy: true, lastChanged: null, lastLogSent: null },
    paris: { healthy: true, lastChanged: null, lastLogSent: null }
  }
};

// --- Log Analytics helpers (same pattern as azureLogger.js) ---

function buildSignature(workspaceId, sharedKey, date, contentLength, method, contentType, resource) {
  const xHeaders = `x-ms-date:${date}`;
  const stringToHash = `${method}\n${contentLength}\n${contentType}\n${xHeaders}\n${resource}`;
  const bytesToHash = Buffer.from(stringToHash, 'utf8');
  const keyBytes = Buffer.from(sharedKey, 'base64');
  const hmac = crypto.createHmac('sha256', keyBytes);
  hmac.update(bytesToHash);
  const calculatedHash = hmac.digest('base64');
  return `SharedKey ${workspaceId}:${calculatedHash}`;
}

async function sendToLogAnalytics(logData) {
  if (!LOG_ANALYTICS_WORKSPACE_ID || !LOG_ANALYTICS_SHARED_KEY) {
    console.log('[Log Analytics] Not configured — log would be sent:', JSON.stringify(logData));
    return { success: false, configured: false, message: 'Log Analytics not configured' };
  }

  const body = JSON.stringify(logData);
  const contentLength = Buffer.byteLength(body, 'utf8');
  const rfc1123date = new Date().toUTCString();
  const contentType = 'application/json';
  const method = 'POST';
  const resource = '/api/logs';

  const signature = buildSignature(
    LOG_ANALYTICS_WORKSPACE_ID,
    LOG_ANALYTICS_SHARED_KEY,
    rfc1123date,
    contentLength,
    method,
    contentType,
    resource
  );

  const uri = `https://${LOG_ANALYTICS_WORKSPACE_ID}.ods.opinsights.azure.com${resource}?api-version=2016-04-01`;

  try {
    const response = await axios.post(uri, body, {
      headers: {
        'Content-Type': contentType,
        'Authorization': signature,
        'Log-Type': LOG_TYPE,
        'x-ms-date': rfc1123date,
        'time-generated-field': 'timestamp'
      },
      timeout: 10000
    });

    console.log(`[Log Analytics] Log sent successfully: ${response.status}`);
    return { success: true, status: response.status };
  } catch (error) {
    console.error('[Log Analytics] Error sending log:', error.message);
    return { success: false, error: error.message };
  }
}

// --- Routes ---

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'vm-health-control',
    timestamp: new Date().toISOString()
  });
});

// Get current state of all VMs
app.get('/api/vm-health/state', (_req, res) => {
  res.json({ success: true, data: state });
});

// Set a specific VM healthy or unhealthy
app.patch('/api/vm-health/:vmName', async (req, res) => {
  const { vmName } = req.params;

  if (!state.vms[vmName]) {
    return res.status(404).json({
      success: false,
      error: `Unknown VM: ${vmName}. Valid values: ${Object.keys(state.vms).join(', ')}`
    });
  }

  const { healthy } = req.body;

  if (typeof healthy !== 'boolean') {
    return res.status(400).json({ success: false, error: 'healthy must be a boolean' });
  }

  const previousState = state.vms[vmName].healthy;
  state.vms[vmName].healthy = healthy;
  state.vms[vmName].lastChanged = new Date().toISOString();
  state.updatedAt = new Date().toISOString();

  // Build and send the log entry
  const logEntry = [{
    timestamp: new Date().toISOString(),
    vmName: `vm-parking-${vmName}`,
    city: vmName.charAt(0).toUpperCase() + vmName.slice(1),
    healthState: healthy ? 'Healthy' : 'Unhealthy',
    previousState: previousState ? 'Healthy' : 'Unhealthy',
    severity: healthy ? 'Info' : 'Critical',
    source: 'vm-health-control',
    message: healthy
      ? `VM vm-parking-${vmName} has recovered and is now healthy.`
      : `VM vm-parking-${vmName} is reporting unhealthy status. Potential issues detected.`,
    resourceGroup: `rg-parking-${vmName}`,
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || 'demo-subscription',
    resourceType: 'Microsoft.Compute/virtualMachines'
  }];

  const logResult = await sendToLogAnalytics(logEntry);
  state.vms[vmName].lastLogSent = logResult.success ? new Date().toISOString() : null;

  return res.json({
    success: true,
    data: {
      vm: vmName,
      healthy,
      previousState,
      logResult
    }
  });
});

app.listen(PORT, () => {
  console.log(`VM Health Control running on port ${PORT}`);
  console.log(`Log Analytics workspace: ${LOG_ANALYTICS_WORKSPACE_ID ? 'configured' : 'NOT configured (dry-run mode)'}`);
  console.log(`Custom log type: ${LOG_TYPE}_CL`);
});
