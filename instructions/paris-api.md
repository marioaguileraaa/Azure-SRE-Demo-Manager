# Paris API

When refering to Paris API, the resource is an Azure VM with the tags `role=api` and `service=paris`. The API logs are stored in the Syslog table of the connected Log Analytics workspace, and the relevant logs have the process name 'parisparkingapi' (case insensitive).

## Relevant queries

### Check Paris API response status codes, errors and response time in the last 24h

```kql
Syslog
| where TimeGenerated >= ago(24h)
| where tolower(ProcessName) == "parisparkingapi"
| extend msg_raw = trim(@"""", SyslogMessage)
| extend msg = parse_json(msg_raw)
| where tostring(msg.message) == "HTTP Response"
| extend
logMessage = tostring(msg.message),
method = tostring(msg.details.method),
path = tostring(msg.details.path),
statusCode = toint(msg.details.statusCode),
responseTimeMs = toint(msg.details.responseTimeMs),
city = tostring(msg.details.city),
appTimestamp = todatetime(msg.timestamp)
| project
TimeGenerated,
HostName,
ProcessName,
logMessage,
method,
path,
statusCode,
responseTimeMs,
city,
appTimestamp
```

### Check external dependencies status of Paris API in the last 24h

```kql
Syslog
| where TimeGenerated >= ago(24h)
| where tolower(ProcessName) == "parisparkingapi"
| extend msg = parse_json(tostring(parse_json(SyslogMessage)))
| where tostring(msg.details.operation) == "GET_EXTERNAL_DEPENDENCY"
| extend
operation = tostring(msg.details.operation),
parkId = tostring(msg.details.parkId),
dependency = tostring(msg.details.dependency),
dependencyUrl = tostring(msg.details.url),
dependencyStatus = tostring(msg.details.status),
responseTimeMs = toint(msg.details.responseTimeMs),
appTimestamp = todatetime(msg.timestamp)
| project
TimeGenerated,
HostName,
ProcessName,
operation,
parkId,
dependency,
dependencyUrl,
dependencyStatus,
responseTimeMs,
appTimestamp
```

### Check CPU and Memory of Paris API in the last 24h

For this use the Paris API Azure VM performance metrics in the connected Log Analytics workspace.

The Paris API virtual machine has a tag `role=api` and another tag `service=paris`, so you can also correlate the VM performance with the API telemetry by filtering the Syslog with `where tolower(ProcessName) == "parisparkingapi"`.

### Check operations invoked/executed by Paris API in the last 24h

```kql
Syslog
| where TimeGenerated >= ago(24h)
| where tolower(ProcessName) == "parisparkingapi"
| extend msg = parse_json(tostring(parse_json(SyslogMessage)))
| where tostring(msg.message) startswith "Parking Operation"
| extend
operation = tostring(msg.details.operation),
parkId = tostring(msg.details.parkId),
appTimestamp = todatetime(msg.timestamp)
| project
TimeGenerated,
HostName,
ProcessName,
operation,
parkId,
appTimestamp
```