// Berlin MCP Server module - Container Instance for monitoring Berlin API
@description('Location for all MCP server resources')
param location string

@description('Environment name (e.g., dev, prod)')
param environment string = 'dev'

@description('URL of the Berlin Parking API to monitor')
param berlinApiUrl string

@description('Container image for the MCP server')
param containerImage string = ''

@description('Container registry server (leave empty for public registries)')
param containerRegistry string = ''

@description('Tags to apply to resources')
param tags object = {}

// Log Analytics Workspace for MCP server logs
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'law-berlin-mcp-${environment}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights for MCP server monitoring
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-berlin-mcp-${environment}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Container Instance for MCP server
resource containerInstance 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: 'aci-berlin-mcp-${environment}'
  location: location
  tags: tags
  properties: {
    containers: [
      {
        name: 'berlin-mcp-server'
        properties: {
          image: empty(containerImage) ? 'mcr.microsoft.com/azuredocs/aci-helloworld:latest' : containerImage
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 1
            }
          }
          ports: [
            {
              port: 8080
              protocol: 'TCP'
            }
          ]
          environmentVariables: [
            {
              name: 'BERLIN_API_URL'
              value: berlinApiUrl
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: 'Always'
    ipAddress: {
      type: 'Public'
      ports: [
        {
          port: 8080
          protocol: 'TCP'
        }
      ]
      dnsNameLabel: 'berlin-mcp-${environment}-${uniqueString(resourceGroup().id)}'
    }
    imageRegistryCredentials: empty(containerRegistry) ? [] : [
      {
        server: containerRegistry
        identity: resourceGroup().id
      }
    ]
  }
  identity: {
    type: 'SystemAssigned'
  }
}

// Outputs
output containerInstanceName string = containerInstance.name
output mcpServerUrl string = 'http://${containerInstance.properties.ipAddress.fqdn}:8080'
output appInsightsName string = appInsights.name
output logAnalyticsWorkspaceName string = logAnalyticsWorkspace.name
output containerInstancePrincipalId string = containerInstance.identity.principalId
