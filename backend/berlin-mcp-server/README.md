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
