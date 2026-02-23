@description('Azure region for scheduled query rules (usually same region as Log Analytics workspace).')
param location string

@description('Log Analytics workspace resource ID that stores Lisbon custom logs.')
param logAnalyticsWorkspaceId string

@description('Action Group resource ID to notify when alerts fire. Leave empty to create rules without action groups.')
param actionGroupResourceId string = ''

@description('Enable or disable all Lisbon chaos alerts.')
param enabled bool = true

@description('How often the alert query runs.')
param evaluationFrequency string = 'PT5M'

@description('Lookback window used by alert queries.')
param windowSize string = 'PT5M'

@description('Optional prefix for alert rule names.')
param namePrefix string = 'lisbon-chaos'

type AlertSpec = {
  key: string
  severity: int
  threshold: int
  query: string
}

var alertSpecs = [
  {
    key: 'generic'
    severity: 3
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED'
| summarize totalChaosInjected = count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'http-error'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'httpError'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'dependency-failure'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'dependencyFailure'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'https-error'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'httpsError'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'exception'
    severity: 1
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'exception'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'disconnect'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'disconnect'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'timeout'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'timeout'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'bad-payload'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'badPayload'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'high-cpu'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'highCpu'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'high-memory'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend detailsRaw = tostring(coalesce(column_ifexists('details_s', ''), column_ifexists('details', '')))
| extend details = iif(isempty(detailsRaw), dynamic({}), parse_json(detailsRaw))
| where operation == 'CHAOS_INJECTED' and tostring(details.faultType) == 'highMemory'
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'latency-performance'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend responseTimeMs = todouble(coalesce(column_ifexists('responseTimeMs_d', real(null)), column_ifexists('responseTimeMs', real(null))))
| where operation == 'HTTP_RESPONSE' and isnotnull(responseTimeMs)
| where responseTimeMs > 1500
| summarize slowRequests = count(), p95 = percentile(responseTimeMs, 95) by bin(TimeGenerated, 5m)
'''
  }
  {
    key: 'high-memory-guard-429'
    severity: 2
    threshold: 0
    query: '''
LisbonParkingLogs_CL
| extend operation = tostring(coalesce(column_ifexists('operation_s', ''), column_ifexists('operation', '')))
| extend statusCode = toint(coalesce(column_ifexists('statusCode_d', int(null)), column_ifexists('statusCode', int(null))))
| where operation == 'HTTP_RESPONSE'
| where statusCode == 429
| summarize count() by bin(TimeGenerated, 5m)
'''
  }
]

resource chaosAlerts 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = [for spec in alertSpecs: {
  name: '${namePrefix}-${spec.key}'
  location: location
  properties: {
    displayName: '${namePrefix}-${spec.key}'
    description: 'Lisbon chaos alert for ${spec.key}'
    severity: spec.severity
    enabled: enabled
    scopes: [
      logAnalyticsWorkspaceId
    ]
    evaluationFrequency: evaluationFrequency
    windowSize: windowSize
    autoMitigate: false
    criteria: {
      allOf: [
        {
          query: spec.query
          timeAggregation: 'Count'
          operator: 'GreaterThan'
          threshold: spec.threshold
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: empty(actionGroupResourceId) ? {
      actionGroups: []
    } : {
      actionGroups: [
        actionGroupResourceId
      ]
    }
  }
}]

output createdAlertNames array = [for spec in alertSpecs: '${namePrefix}-${spec.key}']
