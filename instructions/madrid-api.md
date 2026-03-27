# Madrid API

When refering to Madrid API, the resource is an Azure VM with the tags `role=api` and `service=madrid`. The API logs are stored in the Event table of the connected Log Analytics workspace, and the relevant logs have the source name 'madridparkingapi' (case insensitive).

## Relevant queries

### Check Madrid API response status codes, errors and response time in the last 24h

```kql
Event
| where TimeGenerated >= ago(24h)
| where tolower(Source) == "madridparkingapi"
| extend j = parse_json(tostring(parse_json(RenderedDescription)))
| where tostring(j.message) == 'HTTP Response'
| extend
    appTimestamp   = todatetime(j.timestamp),
    level          = tostring(j.level),
    method         = tostring(j.details.method),
    path           = tostring(j.details.path),
    statusCode     = toint(j.details.statusCode),
    responseTimeMs = toint(j.details.responseTimeMs),
    city           = tostring(j.details.city),
    appSource      = tostring(j.source)
| project
    TimeGenerated,
    Computer,
    Source,
    appTimestamp,
    level,
    method,
    path,
    statusCode,
    responseTimeMs,
    city,
    appSource
| order by TimeGenerated desc
```

### Check CPU and Memory of Madrid API in the last 24h

For this use the Madrid API Azure VM performance metrics in the connected Log Analytics workspace.

The Madrid API virtual machine has a tag `role=api` and another tag `service=madrid`, so you can also correlate the VM performance with the API telemetry by filtering the Syslog with `where tolower(Source) == "madridparkingapi"`.

### Check operations invoked/executed by Madrid API in the last 24h

```kql
Event
| where TimeGenerated >= ago(24h)
| where tolower(Source) == "madridparkingapi"
| extend j = parse_json(tostring(parse_json(RenderedDescription)))
| where tostring(j.message) startswith "Parking Operation"
| extend
    appTimestamp             = todatetime(j.timestamp),
    level                    = tostring(j.level),
    operation                = tostring(j.details.operation),
    parkId                   = tostring(j.details.parkId),
    city                     = tostring(j.details.city),
    appSource                = tostring(j.source)
| project
    TimeGenerated,
    Computer,
    Source,
    appTimestamp,
    level,
    operation,
    parkId,
    city,
    appSource
| order by TimeGenerated desc
```

### Count operations invoked/executed by Madrid API in the last 24h

```kql
Event
| where TimeGenerated >= ago(24h)
| where tolower(Source) == "madridparkingapi"
| extend j = parse_json(tostring(parse_json(RenderedDescription)))
| where tostring(j.message) startswith "Parking Operation"
| extend
    operation = tostring(j.details.operation),
    city = tostring(j.details.city)
| where isnotempty(operation)
| summarize operationCount = count() by city, operation
| order by city asc, operationCount desc
```
