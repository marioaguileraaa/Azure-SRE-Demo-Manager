# Berlin MCP Monitoring Server

A Model Context Protocol (MCP) server that provides monitoring and observability tools for the Berlin Parking API. This server acts as an integration layer between Azure SRE agents and the Berlin API.

## Purpose

The Berlin API represents an **external/third-party service** that you don't directly control or monitor. This MCP server:
- Lives in its own resource group (`rg-parking-berlin-mcp-dev`) 
- Provides tools for SRE agents to query the Berlin API
- Logs its own performance to Application Insights
- Allows SRE to monitor YOUR integration infrastructure, not the external API

## Architecture

```
Azure SRE Agent → MCP Server (rg-parking-berlin-mcp-dev) → Berlin API (rg-parking-berlin-dev)
                  [YOU MONITOR THIS]                       [EXTERNAL - NO MONITORING]
```

## Endpoints

The MCP server exposes the following HTTP endpoints:

### `GET /health`
Health check endpoint for Container App probes and monitoring.

**Response:**
```json
{
  "status": "healthy",
  "service": "berlin-mcp-server",
  "timestamp": "2026-02-16T15:50:00.000Z",
  "mcp_tools": 6,
  "target_api": "https://ca-parking-berlin..."
}
```

### `GET /`
Root endpoint with server information and available tools.

**Response:**
```json
{
  "service": "Berlin MCP Monitoring Server",
  "version": "1.0.0",
  "protocol": "MCP",
  "endpoints": {
    "health": "/health",
    "mcp_sse": "/sse"
  },
  "tools": ["check_health", "get_metrics_summary", ...]
}
```

### `POST /sse`
MCP protocol endpoint for SSE (Server-Sent Events) transport.
Used by MCP clients to communicate with the server.

## Available Tools

The MCP server exposes these tools that SRE agents can call:

### 1. `check_health`
Check if the Berlin parking API is healthy and responding.

### 2. `get_metrics_summary`
Get current parking and performance metrics summary (occupancy, slots, etc.).

### 3. `get_performance_metrics`
Get detailed OpenTelemetry performance metrics (response times, throughput, errors).

### 4. `check_slo_compliance`
Check if the Berlin API meets SLO thresholds.
- Parameters:
  - `p95_threshold_ms` (float): P95 response time threshold in milliseconds (default: 100.0)
  - `error_rate_threshold` (float): Error rate threshold percentage (default: 1.0)

### 5. `get_level_status`
Get parking occupancy status by level.

### 6. `get_mcp_server_stats`
Get statistics about the MCP server itself (meta-monitoring).

## Environment Variables

- `BERLIN_API_URL` - URL of the Berlin Parking API
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Application Insights connection string for logging
- `MCP_AUTH_TOKEN` - Bearer token for authentication (optional, but recommended for production)

## Authentication

The MCP server supports **Bearer Token authentication** to secure the MCP endpoints.

### Environment Variable

Set the `MCP_AUTH_TOKEN` environment variable to enable authentication:

```bash
export MCP_AUTH_TOKEN="your-secret-token-here"
```

### Protected Endpoints

- ✅ `/sse` - MCP protocol endpoint (requires authentication)
- ❌ `/health` - Health check (public, no auth required)
- ❌ `/` - Server info (public, for discovery)

### MCP Client Configuration

Configure your MCP client with Bearer Token authentication:

```json
{
  "mcpServers": {
    "berlin-monitoring": {
      "url": "https://ca-berlin-mcp.ashyriver-65b8d9ff.swedencentral.azurecontainerapps.io/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer your-secret-token-here"
      }
    }
  }
}
```

### Testing Authentication

**Without token (should fail):**
```powershell
Invoke-WebRequest -Uri "https://ca-berlin-mcp.ashyriver-65b8d9ff.swedencentral.azurecontainerapps.io/sse"
# Expected: 401 Unauthorized
```

**With valid token (should succeed):**
```powershell
$headers = @{
    "Authorization" = "Bearer your-secret-token-here"
}
Invoke-WebRequest -Uri "https://ca-berlin-mcp.ashyriver-65b8d9ff.swedencentral.azurecontainerapps.io/sse" -Headers $headers
# Expected: 200 OK (connection established)
```

**Health endpoint (always public):**
```powershell
Invoke-RestMethod "https://ca-berlin-mcp.ashyriver-65b8d9ff.swedencentral.azurecontainerapps.io/health"
# Expected: 200 OK (no auth required)
```

### Generating a Secure Token

Generate a cryptographically secure token:

**PowerShell:**
```powershell
# Generate a secure random token
$bytes = New-Object Byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$token = [Convert]::ToBase64String($bytes)
Write-Host "MCP_AUTH_TOKEN=$token"
```

**Bash:**
```bash
# Generate a secure random token
openssl rand -base64 32
```

### Setting the Token in Azure Container App

```bash
# Update Container App with the token
az containerapp update \
  --name ca-berlin-mcp \
  --resource-group rg-parking-berlin-mcp-dev \
  --set-env-vars "MCP_AUTH_TOKEN=your-generated-token-here"
```

### Security Notes

- ✅ Use a cryptographically secure random token (at least 32 bytes)
- ✅ Store the token securely (Azure Key Vault recommended)
- ✅ Rotate the token periodically
- ⚠️ Never commit the token to source control
- ⚠️ Use HTTPS only (Container App enforces this)

### Backward Compatibility

If `MCP_AUTH_TOKEN` is not set, the server will:
- ⚠️ Log a warning
- ⚠️ Allow all requests (authentication disabled)
- This is for development/testing only - not recommended for production

## Testing

### Test Health Endpoint
```bash
curl https://ca-berlin-mcp.ashyriver-65b8d9ff.swedencentral.azurecontainerapps.io/health
```

### Test Server Info
```bash
curl https://ca-berlin-mcp.ashyriver-65b8d9ff.swedencentral.azurecontainerapps.io/
```

### Connect MCP Client
Configure your MCP client to use the SSE transport:
```json
{
  "mcpServers": {
    "berlin-monitoring": {
      "url": "https://ca-berlin-mcp.ashyriver-65b8d9ff.swedencentral.azurecontainerapps.io/sse",
      "transport": "sse"
    }
  }
}
```

## Deployment

The MCP server is deployed as an **Azure Container App**.

### Resource Names
- **Resource Group**: `rg-parking-berlin-mcp-dev`
- **Container App Environment**: `cae-berlin-mcp`
- **Container App**: `ca-berlin-mcp`
- **Log Analytics**: `law-berlin-mcp`
- **Application Insights**: `appi-parking-berlin-mcp`

### Manual Deployment

```bash
# Deploy infrastructure
az deployment group create \
  --resource-group rg-parking-berlin-mcp-dev \
  --template-file infrastructure/modules/berlin-mcp-server.bicep \
  --parameters \
    location=swedencentral \
    environment=dev \
    berlinApiUrl=https://ca-parking-berlin.braveocean-195c6009.swedencentral.azurecontainerapps.io \
    containerImage=<your-image>
```

## Monitoring

The MCP server logs all tool calls to Application Insights with:
- Tool name
- Duration
- Success/failure status
- Custom dimensions for filtering

Query example in Log Analytics:
```kusto
traces
| where customDimensions.tool != ""
| project timestamp, tool=customDimensions.tool, duration_ms=customDimensions.duration_ms, success=customDimensions.success
| summarize avg(todouble(duration_ms)), count() by tostring(tool)
```
