// Hub infrastructure module - VNet and Log Analytics Workspace
@description('Location for all hub resources')
param location string

@description('Virtual Network address prefix')
param vnetAddressPrefix string = '10.0.0.0/16'

@description('Subnet address prefix for VMs')
param vmSubnetPrefix string = '10.0.1.0/24'

@description('Subnet address prefix for Container Apps')
param containerSubnetPrefix string = '10.0.2.0/23'

@description('Allowed source IP address prefix for SSH/RDP access. Use specific IP ranges in production.')
param allowedSourceIpPrefix string = '*'

@description('Tags to apply to resources')
param tags object = {}

// Network Security Group for VMs
// Note: In production, restrict SSH/RDP access to specific IP ranges using allowedSourceIpPrefix parameter
resource nsgVms 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: 'nsg-vms'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowHTTP'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '80'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'AllowHTTPS'
        properties: {
          priority: 110
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '443'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'AllowAPIPort3002'
        properties: {
          priority: 120
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '3002'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'AllowAPIPort3003'
        properties: {
          priority: 130
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '3003'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'AllowSSH'
        properties: {
          priority: 200
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '22'
          sourceAddressPrefix: allowedSourceIpPrefix
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'AllowRDP'
        properties: {
          priority: 210
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '3389'
          sourceAddressPrefix: allowedSourceIpPrefix
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

// Create Virtual Network
resource vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: 'vnet-parking-hub'
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        vnetAddressPrefix
      ]
    }
    subnets: [
      {
        name: 'snet-vms'
        properties: {
          addressPrefix: vmSubnetPrefix
          networkSecurityGroup: {
            id: nsgVms.id
          }
        }
      }
      {
        name: 'snet-container-apps'
        properties: {
          addressPrefix: containerSubnetPrefix
          delegations: [
            {
              name: 'Microsoft.App/environments'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
    ]
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'law-parking-hub'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Outputs
output vnetId string = vnet.id
output vnetName string = vnet.name
output vmSubnetId string = vnet.properties.subnets[0].id
output containerSubnetId string = vnet.properties.subnets[1].id
output logAnalyticsWorkspaceId string = logAnalytics.id
output logAnalyticsWorkspaceName string = logAnalytics.name
output logAnalyticsCustomerId string = logAnalytics.properties.customerId
