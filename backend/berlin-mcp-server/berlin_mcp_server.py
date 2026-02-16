from mcp.server import Server
from mcp.types import Tool, TextContent
import httpx
import json
import logging
from datetime import datetime
from opencensus.ext.azure.log_exporter import AzureLogHandler
import os

# Configuration
BERLIN_API_URL = os.getenv("BERLIN_API_URL", "https://ca-parking-berlin.braveocean-195c6009.swedencentral.azurecontainerapps.io")
APPINSIGHTS_CONNECTION = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")

# Setup Application Insights logging
logger = logging.getLogger(__name__)
if APPINSIGHTS_CONNECTION:
    logger.addHandler(AzureLogHandler(connection_string=APPINSIGHTS_CONNECTION))
    logger.setLevel(logging.INFO)

app = Server("berlin-monitoring")

# Track MCP server metrics
class MCPMetrics:
    def __init__(self):
        self.tool_calls = {}
        self.errors = {}
        self.response_times = {}
    
    def track_call(self, tool_name: str, duration_ms: float, success: bool):
        if tool_name not in self.tool_calls:
            self.tool_calls[tool_name] = 0
            self.errors[tool_name] = 0
            self.response_times[tool_name] = []
        
        self.tool_calls[tool_name] += 1
        if not success:
            self.errors[tool_name] += 1
        self.response_times[tool_name].append(duration_ms)
        
        if APPINSIGHTS_CONNECTION:
            logger.info(f"MCP Tool Call: {tool_name}", extra={
                'custom_dimensions': {
                    'tool': tool_name,
                    'duration_ms': duration_ms,
                    'success': success,
                    'target_api': 'berlin-parking'
                }
            })

metrics = MCPMetrics()

@app.tool()
async def check_health() -> str:
    """Check if the Berlin parking API is healthy and responding"""
    start = datetime.now()
    success = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BERLIN_API_URL}/health")
            data = response.json()
            success = response.status_code == 200
            
            status_emoji = "✅" if data['status'] == 'healthy' else "❌"
            result = f"""
{status_emoji} Berlin API Health Status:
- Status: {data['status']}
- Service: {data['service']}
- City: {data['city']}
- Uptime: {data['uptime']} seconds
- Last checked: {data['timestamp']}
- Response time: {(datetime.now() - start).total_seconds() * 1000:.0f}ms
"""
            return result
    except Exception as e:
        if APPINSIGHTS_CONNECTION:
            logger.error(f"Health check failed: {e}")
        return f"❌ Berlin API is UNREACHABLE: {str(e)}"
    finally:
        duration_ms = (datetime.now() - start).total_seconds() * 1000
        metrics.track_call("check_health", duration_ms, success)

@app.tool()
async def get_metrics_summary() -> str:
    """Get current parking and performance metrics summary"""
    start = datetime.now()
    success = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BERLIN_API_URL}/api/parking/metrics")
            data = response.json()['data']
            success = response.status_code == 200
            
            return f"""
Berlin Parking Metrics:
- Total Slots: {data['totalSlots']}
- Available: {data['totalAvailable']}
- Occupied: {data['totalOccupied']}
- Occupancy Rate: {data['occupancyRate']}%
- Electric Chargers: {data['availableElectricChargers']}
- Last Updated: {data['lastUpdated']}
"""
    except Exception as e:
        if APPINSIGHTS_CONNECTION:
            logger.error(f"Metrics fetch failed: {e}")
        return f"❌ Failed to fetch metrics: {str(e)}"
    finally:
        duration_ms = (datetime.now() - start).total_seconds() * 1000
        metrics.track_call("get_metrics_summary", duration_ms, success)

@app.tool()
async def get_performance_metrics() -> str:
    """Get detailed OpenTelemetry performance metrics for SRE analysis"""
    start = datetime.now()
    success = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BERLIN_API_URL}/metrics/opentelemetry")
            otel_data = response.json()
            success = response.status_code == 200
            
            # Extract key metrics
            metrics_data = {}
            for scope_metric in otel_data['resourceMetrics'][0]['scopeMetrics']:
                for metric in scope_metric['metrics']:
                    metrics_data[metric['name']] = metric
            
            # Parse critical SRE metrics
            response_time = metrics_data.get('http.server.duration.avg', {}).get('gauge', {}).get('dataPoints', [{}])[0].get('asDouble', 0)
            p95 = metrics_data.get('http.server.duration.p95', {}).get('gauge', {}).get('dataPoints', [{}])[0].get('asDouble', 0)
            p99 = metrics_data.get('http.server.duration.p99', {}).get('gauge', {}).get('dataPoints', [{}])[0].get('asDouble', 0)
            request_count = metrics_data.get('http.server.request.count', {}).get('sum', {}).get('dataPoints', [{}])[0].get('asInt', 0)
            error_rate = metrics_data.get('http.server.error.rate', {}).get('gauge', {}).get('dataPoints', [{}])[0].get('asDouble', 0)
            requests_per_min = metrics_data.get('http.server.requests_per_minute', {}).get('gauge', {}).get('dataPoints', [{}])[0].get('asInt', 0)
            
            return f"""
Berlin API Performance Metrics:
📊 Response Time:
- Average: {response_time:.2f}ms
- P95: {p95:.2f}ms
- P99: {p99:.2f}ms

📈 Throughput:
- Total Requests: {request_count}
- Requests/min: {requests_per_min}

❌ Errors:
- Error Rate: {error_rate:.2f}%
"""
    except Exception as e:
        if APPINSIGHTS_CONNECTION:
            logger.error(f"Performance metrics fetch failed: {e}")
        return f"❌ Failed to fetch performance metrics: {str(e)}"
    finally:
        duration_ms = (datetime.now() - start).total_seconds() * 1000
        metrics.track_call("get_performance_metrics", duration_ms, success)

@app.tool()
async def check_slo_compliance(p95_threshold_ms: float = 100.0, error_rate_threshold: float = 1.0) -> str:
    """Check if the Berlin API meets SLO thresholds"""
    start = datetime.now()
    success = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BERLIN_API_URL}/metrics/opentelemetry")
            otel_data = response.json()
            success = response.status_code == 200
            
            # Extract metrics
            metrics_data = {}
            for scope_metric in otel_data['resourceMetrics'][0]['scopeMetrics']:
                for metric in scope_metric['metrics']:
                    metrics_data[metric['name']] = metric
            
            p95 = metrics_data.get('http.server.duration.p95', {}).get('gauge', {}).get('dataPoints', [{}])[0].get('asDouble', 0)
            error_rate = metrics_data.get('http.server.error.rate', {}).get('gauge', {}).get('dataPoints', [{}])[0].get('asDouble', 0)
            availability = metrics_data.get('system.availability', {}).get('gauge', {}).get('dataPoints', [{}])[0].get('asDouble', 100)
            
            # Check SLOs
            p95_ok = p95 <= p95_threshold_ms
            error_ok = error_rate <= error_rate_threshold
            avail_ok = availability >= 99.9
            
            status = "✅ PASSING" if (p95_ok and error_ok and avail_ok) else "❌ FAILING"
            
            # Log SLO check result
            if APPINSIGHTS_CONNECTION:
                logger.warning(f"SLO Check: {status}", extra={
                    'custom_dimensions': {
                        'slo_status': status,
                        'p95': p95,
                        'error_rate': error_rate,
                        'availability': availability
                    }
                })
            
            return f"""
SLO Compliance Check - {status}

Performance SLO:
- P95 Response Time: {p95:.2f}ms (threshold: {p95_threshold_ms}ms) {'✅' if p95_ok else '❌'}
- Error Rate: {error_rate:.2f}% (threshold: {error_rate_threshold}%) {'✅' if error_ok else '❌'}
- Availability: {availability:.2f}% (threshold: 99.9%) {'✅' if avail_ok else '❌'}

{'⚠️ Action Required: SLOs are not being met!' if not (p95_ok and error_ok and avail_ok) else '✅ All SLOs are being met'}
"""
    except Exception as e:
        if APPINSIGHTS_CONNECTION:
            logger.error(f"SLO check failed: {e}")
        return f"❌ Failed to check SLO compliance: {str(e)}"
    finally:
        duration_ms = (datetime.now() - start).total_seconds() * 1000
        metrics.track_call("check_slo_compliance", duration_ms, success)

@app.tool()
async def get_level_status() -> str:
    """Get parking occupancy status by level"""
    start = datetime.now()
    success = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BERLIN_API_URL}/api/parking/levels")
            levels = response.json()['data']
            success = response.status_code == 200
            
            result = "Berlin Parking Levels:\n"
            for level in levels:
                result += f"\n- Level {level['level']}: {level['availableSlots']}/{level['totalSlots']} available ({level['occupancyRate']}% occupied)"
            
            return result
    except Exception as e:
        if APPINSIGHTS_CONNECTION:
            logger.error(f"Level status fetch failed: {e}")
        return f"❌ Failed to fetch level status: {str(e)}"
    finally:
        duration_ms = (datetime.now() - start).total_seconds() * 1000
        metrics.track_call("get_level_status", duration_ms, success)

@app.tool()
async def get_mcp_server_stats() -> str:
    """Get statistics about the MCP server itself (meta-monitoring)"""
    result = "MCP Server Statistics:\n\n"
    for tool_name, count in metrics.tool_calls.items():
        errors = metrics.errors.get(tool_name, 0)
        avg_time = sum(metrics.response_times[tool_name]) / len(metrics.response_times[tool_name]) if metrics.response_times[tool_name] else 0
        result += f"- {tool_name}: {count} calls, {errors} errors, avg {avg_time:.0f}ms\n"
    return result

if __name__ == "__main__":
    if APPINSIGHTS_CONNECTION:
        logger.info("MCP Server starting", extra={'custom_dimensions': {'service': 'berlin-mcp-server'}})
    print("Starting Berlin MCP Monitoring Server...")
    app.run()
