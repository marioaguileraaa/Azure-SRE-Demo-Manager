// Main Bicep file for Azure SRE Demo Manager Infrastructure
targetScope = 'subscription'

@description('Primary location for all resources')
param location string = 'swedencentral'

@description('Environment name (e.g., dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environment string = 'dev'

@description('Admin username for VMs')
param adminUsername string

@description('Admin password for VMs')
@secure()
param adminPassword string

@description('Container image for Lisbon API')
param lisbonContainerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Container registry server (if using private registry)')
param containerRegistry string = ''

@description('Create public IPs for VMs')
param createPublicIps bool = true

@description('Virtual Network address prefix')
param vnetAddressPrefix string = '10.0.0.0/16'

@description('Subnet address prefix for VMs')
param vmSubnetPrefix string = '10.0.1.0/24'

@description('Subnet address prefix for Container Apps')
param containerSubnetPrefix string = '10.0.2.0/23'

@description('Allowed source IP address prefix for SSH/RDP access (use specific IPs in production)')
param allowedSourceIpPrefix string = '*'

@description('Create a private Azure Container Registry')
param createContainerRegistry bool = true

@description('Container Registry SKU')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param containerRegistrySku string = 'Basic'

@description('GitHub Actions Service Principal Object ID (for deployment storage access)')
param githubActionsPrincipalId string = ''

// Common tags
var tags = {
  Environment: environment
  Project: 'Azure-SRE-Demo-Manager'
  ManagedBy: 'Bicep'
}

// Resource Group names
var hubRgName = 'rg-parking-hub-${environment}'
var frontendRgName = 'rg-parking-frontend-${environment}'
var lisbonRgName = 'rg-parking-lisbon-${environment}'
var madridRgName = 'rg-parking-madrid-${environment}'
var parisRgName = 'rg-parking-paris-${environment}'

// ========================================
// Resource Groups
// ========================================

resource hubRg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: hubRgName
  location: location
  tags: tags
}

resource frontendRg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: frontendRgName
  location: location
  tags: tags
}

resource lisbonRg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: lisbonRgName
  location: location
  tags: tags
}

resource madridRg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: madridRgName
  location: location
  tags: tags
}

resource parisRg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: parisRgName
  location: location
  tags: tags
}

// ========================================
// Hub Infrastructure (VNet + Log Analytics)
// ========================================

module hub 'modules/hub.bicep' = {
  scope: hubRg
  name: 'hub-deployment'
  params: {
    location: location
    vnetAddressPrefix: vnetAddressPrefix
    vmSubnetPrefix: vmSubnetPrefix
    containerSubnetPrefix: containerSubnetPrefix
    allowedSourceIpPrefix: allowedSourceIpPrefix
    tags: tags
  }
}

// ========================================
// Deployment Storage Account (for CI/CD)
// ========================================

module deploymentStorage 'modules/deployment-storage.bicep' = {
  scope: hubRg
  name: 'deployment-storage'
  params: {
    location: location
    tags: tags
  }
}

// Grant GitHub Actions SP access to deployment storage
module spStorageAccess 'modules/sp-storage-access.bicep' = if (!empty(githubActionsPrincipalId)) {
  scope: hubRg
  name: 'sp-storage-access'
  params: {
    principalId: githubActionsPrincipalId
    storageAccountId: deploymentStorage.outputs.storageAccountId
  }
}

// ========================================
// Container Registry
// ========================================

module acr 'modules/container-registry.bicep' = if (createContainerRegistry) {
  scope: hubRg
  name: 'container-registry-deployment'
  params: {
    location: location
    environment: environment
    sku: containerRegistrySku
    adminUserEnabled: true
    tags: tags
  }
}

// ========================================
// Lisbon API (Container App)
// ========================================

module lisbonApi 'modules/lisbon-api.bicep' = {
  scope: lisbonRg
  name: 'lisbon-api-deployment'
  params: {
    location: location
    containerSubnetId: hub.outputs.containerSubnetId
    logAnalyticsWorkspaceId: hub.outputs.logAnalyticsWorkspaceId
    logAnalyticsCustomerId: hub.outputs.logAnalyticsCustomerId
    containerImage: lisbonContainerImage
    containerRegistry: createContainerRegistry ? acr!.outputs.loginServer : containerRegistry
    tags: tags
  }
}

// Grant Container App access to ACR
module lisbonAcrAccess 'modules/acr-role-assignment.bicep' = if (createContainerRegistry) {
  scope: hubRg
  name: 'lisbon-acr-access'
  params: {
    principalId: lisbonApi.outputs.containerAppPrincipalId
    acrName: acr!.outputs.registryName
  }
}

// ========================================
// Madrid API (Windows Server VM)
// ========================================

module madridApi 'modules/madrid-api.bicep' = {
  scope: madridRg
  name: 'madrid-api-deployment'
  params: {
    location: location
    vmSubnetId: hub.outputs.vmSubnetId
    adminUsername: adminUsername
    adminPassword: adminPassword
    createPublicIp: createPublicIps
    deployVM: false // VM already exists; skip VM/ext redeploy to avoid conflicts
    tags: tags
  }
}

// ========================================
// Paris API (Ubuntu Server VM)
// ========================================

module parisApi 'modules/paris-api.bicep' = {
  scope: parisRg
  name: 'paris-api-deployment'
  params: {
    location: location
    vmSubnetId: hub.outputs.vmSubnetId
    adminUsername: adminUsername
    adminPassword: adminPassword
    createPublicIp: createPublicIps
    deployVM: true // VMs already exist, this prevents disk update conflicts
    tags: tags
  }
}

// ========================================
// Storage Role Assignments for VMs
// ========================================

module madridStorageAccess 'modules/storage-role-assignment.bicep' = if (!empty(madridApi.outputs.vmPrincipalId)) {
  scope: subscription()
  name: 'madrid-storage-access'
  params: {
    principalId: madridApi.outputs.vmPrincipalId
  }
}

module parisStorageAccess 'modules/storage-role-assignment.bicep' = if (!empty(parisApi.outputs.vmPrincipalId)) {
  scope: subscription()
  name: 'paris-storage-access'
  params: {
    principalId: parisApi.outputs.vmPrincipalId
  }
}

// ========================================
// Frontend (React App on App Service)
// ========================================

module frontend 'modules/frontend.bicep' = {
  scope: frontendRg
  name: 'frontend-deployment'
  params: {
    location: location
    logAnalyticsWorkspaceId: hub.outputs.logAnalyticsWorkspaceId
    lisbonApiUrl: lisbonApi.outputs.containerAppUrl
    madridApiUrl: madridApi.outputs.apiUrl
    parisApiUrl: parisApi.outputs.apiUrl
    tags: tags
  }
}

// ========================================
// Outputs
// ========================================

output hubResourceGroup string = hubRg.name
output frontendResourceGroup string = frontendRg.name
output lisbonResourceGroup string = lisbonRg.name
output madridResourceGroup string = madridRg.name
output parisResourceGroup string = parisRg.name

output vnetName string = hub.outputs.vnetName
output logAnalyticsWorkspaceName string = hub.outputs.logAnalyticsWorkspaceName

output containerRegistryName string = createContainerRegistry ? acr!.outputs.registryName : ''
output containerRegistryLoginServer string = createContainerRegistry ? acr!.outputs.loginServer : ''
output containerRegistryUrl string = createContainerRegistry ? acr!.outputs.registryUrl : ''

output deploymentStorageAccountName string = deploymentStorage.outputs.storageAccountName
output deploymentStorageBlobEndpoint string = deploymentStorage.outputs.blobEndpoint

output frontendUrl string = frontend.outputs.appServiceUrl
output lisbonApiUrl string = lisbonApi.outputs.containerAppUrl
output madridApiUrl string = madridApi.outputs.apiUrl
output parisApiUrl string = parisApi.outputs.apiUrl

output madridVmName string = madridApi.outputs.vmName
output madridPublicIp string = madridApi.outputs.publicIpAddress
output madridFqdn string = madridApi.outputs.fqdn

output parisVmName string = parisApi.outputs.vmName
output parisPublicIp string = parisApi.outputs.publicIpAddress
output parisFqdn string = parisApi.outputs.fqdn
