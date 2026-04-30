// Pre-create standard Event and Syslog tables so DCRs validate successfully on
// fresh Log Analytics workspaces (some regions do not auto-provision them).
@description('Log Analytics workspace name')
param workspaceName string

resource workspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' existing = {
  name: workspaceName
}

resource eventTable 'Microsoft.OperationalInsights/workspaces/tables@2022-10-01' = {
  parent: workspace
  name: 'Event'
  properties: {
    plan: 'Analytics'
    retentionInDays: 30
    schema: {
      name: 'Event'
    }
  }
}

resource syslogTable 'Microsoft.OperationalInsights/workspaces/tables@2022-10-01' = {
  parent: workspace
  name: 'Syslog'
  properties: {
    plan: 'Analytics'
    retentionInDays: 30
    schema: {
      name: 'Syslog'
    }
  }
}

output eventTableName string = eventTable.name
output syslogTableName string = syslogTable.name
