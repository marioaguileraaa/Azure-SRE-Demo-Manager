# Deployment Changes Summary

## Overview
This document outlines the changes made to the infrastructure deployment process to:
1. Use the `main.parameters.json` file for deployment configuration
2. Add a private Azure Container Registry (ACR) to the infrastructure

## Changes Made

### 1. Updated deploy.sh Script
The deployment script now uses the `main.parameters.json` file instead of prompting for all parameters interactively.

**Key Changes:**
- Checks for the existence of `main.parameters.json` before proceeding
- Reads location from the parameters file
- Only prompts for the admin password (for security reasons - passwords should not be stored in parameter files)
- Uses `--parameters "@main.parameters.json"` in the Azure CLI deployment commands
- Simplified validation and deployment commands

**Security Note:** The admin password is still required to be entered at runtime and is not stored in the parameters file.

### 2. Added Container Registry Module
Created a new Bicep module: `modules/container-registry.bicep`

**Features:**
- Creates an Azure Container Registry with a unique name
- Supports Basic, Standard, and Premium SKUs
- Admin user enabled by default for easy authentication
- Includes proper outputs for registry name, login server, and URL
- Follows Azure best practices for container registry configuration

### 3. Updated main.bicep
Integrated the Container Registry into the main infrastructure template.

**Changes:**
- Added `createContainerRegistry` parameter (default: true) to optionally create ACR
- Added `containerRegistrySku` parameter to choose the registry tier
- Created a new resource group for the container registry
- Added ACR module deployment with conditional creation
- Added new outputs for container registry information:
  - `containerRegistryName`
  - `containerRegistryLoginServer` 
  - `containerRegistryUrl`

### 4. Updated main.parameters.json
Added new parameters for container registry configuration:

```json
"createContainerRegistry": {
  "value": true
},
"containerRegistrySku": {
  "value": "Basic"
}
```

## How to Use

### Deploying with the New Configuration

1. **Edit the parameters file:**
   ```bash
   cd infrastructure
   nano main.parameters.json
   ```
   
   Update values as needed:
   - `location`: Your preferred Azure region
   - `environment`: dev, test, or prod
   - `adminUsername`: VM administrator username
   - `createContainerRegistry`: Set to `true` to create ACR, `false` to skip
   - `containerRegistrySku`: Choose Basic, Standard, or Premium

2. **Run the deployment:**
   ```bash
   ./deploy.sh
   ```
   
   You will only be prompted for:
   - Admin password (for VMs)
   - Confirmation to proceed

3. **After deployment:**
   The script will output the Container Registry details including:
   - Registry name
   - Login server URL
   - Access credentials

### Using the Container Registry

After deployment, you can:

1. **Login to the registry:**
   ```bash
   az acr login --name <registry-name>
   ```

2. **Get credentials:**
   ```bash
   az acr credential show --name <registry-name>
   ```

3. **Push images:**
   ```bash
   docker tag myimage:latest <registry-name>.azurecr.io/myimage:latest
   docker push <registry-name>.azurecr.io/myimage:latest
   ```

4. **Update Container Apps or VMs to use the private registry:**
   - Use the registry login server URL
   - Configure with admin credentials or managed identity

## Resource Groups Created

The deployment now creates the following resource groups:
- `rg-parking-hub-{environment}` - Networking and Log Analytics
- `rg-parking-frontend-{environment}` - Frontend App Service
- `rg-parking-lisbon-{environment}` - Lisbon Container App
- `rg-parking-madrid-{environment}` - Madrid Windows VM
- `rg-parking-paris-{environment}` - Paris Linux VM
- `rg-parking-registry-{environment}` - **NEW** Azure Container Registry

## Container Registry Naming

The ACR name is automatically generated as:
```
acrparking{environment}{uniqueString}
```

For example: `acrparkingdevxyz123abc`

This ensures global uniqueness as ACR names must be unique across all of Azure.

## Cost Considerations

**Basic SKU:**
- Suitable for development and testing
- 10 GB storage included
- Limited throughput

**Standard SKU:**
- Recommended for production workloads
- 100 GB storage included
- Better performance

**Premium SKU:**
- Advanced features (geo-replication, private link)
- 500 GB storage included
- Best performance

For development environments, Basic SKU is recommended to minimize costs.

## Next Steps

1. Push your container images to the new private registry
2. Update the `lisbonContainerImage` parameter to use images from your private registry
3. Consider configuring managed identity for Container Apps to access the registry without passwords
4. Set up retention policies and security scanning in the Azure Portal

## Rollback

To disable the container registry creation:
1. Edit `main.parameters.json`
2. Set `"createContainerRegistry": { "value": false }`
3. Redeploy

The existing registry will remain but won't be managed by future deployments.
