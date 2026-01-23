targetScope = 'subscription'

// Role assignment module for VMs to access storage accounts
@description('Principal ID of the managed identity')
param principalId string

@description('Role to assign (Storage Blob Data Reader or Storage Blob Data Contributor)')
param roleDefinitionId string = '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1' // Storage Blob Data Reader

// Assign role at subscription scope
resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, principalId, roleDefinitionId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roleDefinitionId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output roleAssignmentId string = roleAssignment.id
