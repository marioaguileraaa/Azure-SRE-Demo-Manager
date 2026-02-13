# Azure Infrastructure for SRE Demo Manager

This directory contains the Bicep templates to deploy the complete Azure infrastructure for the Parking Manager application.

## Architecture Overview

The infrastructure is organized into multiple resource groups for better management and cost tracking:

### Resource Groups

1. **Hub Resource Group** (`rg-parking-hub-{env}`)
   - Virtual Network (VNet) with subnets
   - Log Analytics Workspace (shared across all components)
   - Network Security Groups

2. **Frontend Resource Group** (`rg-parking-frontend-{env}`)
   - Azure App Service Plan (Linux, B1 tier)
   - Azure App Service (React application)
   - Application Insights

3. **Lisbon API Resource Group** (`rg-parking-lisbon-{env}`)
   - Container App Environment
   - Container App (Docker-based API)
   - Application Insights

4. **Madrid API Resource Group** (`rg-parking-madrid-{env}`)
   - Windows Server 2022 VM (Standard_B2s)
   - Network Interface
   - Public IP (optional)
   - Application Insights

5. **Paris API Resource Group** (`rg-parking-paris-{env}`)
   - Ubuntu Server 22.04 LTS VM (Standard_B2s)
   - Network Interface
   - Public IP (optional)
   - Application Insights

## Cost Optimization Strategy

The infrastructure is designed for cost optimization:

- **App Service Plan**: B1 tier (Basic) - ~$13/month
- **Virtual Machines**: Standard_B2s (2 vCPUs, 4GB RAM) - ~$30/month each
- **Container Apps**: Consumption-based pricing with 0.25 vCPU and 0.5Gi memory
- **Storage**: StandardSSD_LRS for VM disks
- **Log Analytics**: Pay-as-you-go with 30-day retention
- **Network**: Standard public IPs (optional, can be disabled)

**Estimated Monthly Cost**: ~$120-150 (depending on usage)

## Prerequisites

1. **Azure CLI** version 2.50.0 or later
2. **Azure Subscription** with Contributor access
3. **Bicep CLI** (automatically installed with Azure CLI 2.20.0+)

To verify your setup:
```bash
az --version
az bicep version
```

## Parameters

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `location` | Azure region for resources | `westeurope` |
| `environment` | Environment name (dev/test/prod) | `dev` |
| `adminUsername` | Admin username for VMs | `azureadmin` |
| `adminPassword` | Admin password for VMs (secure) | `P@ssw0rd123!` |

### Optional Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `lisbonContainerImage` | Container image for Lisbon API | `mcr.microsoft.com/azuredocs/containerapps-helloworld:latest` |
| `containerRegistry` | Private container registry URL | `""` (empty) |
| `createPublicIps` | Create public IPs for VMs | `true` |
| `vnetAddressPrefix` | VNet address space | `10.0.0.0/16` |
| `vmSubnetPrefix` | VM subnet address space | `10.0.1.0/24` |
| `containerSubnetPrefix` | Container Apps subnet address space | `10.0.2.0/23` |

## Deployment

### Step 1: Login to Azure

```bash
az login
az account set --subscription "<your-subscription-id>"
```

### Step 2: Validate the Bicep Template

```bash
cd infrastructure
az deployment sub validate \
  --location westeurope \
  --template-file main.bicep \
  --parameters main.parameters.json \
  --parameters adminPassword='<your-secure-password>'
```

### Step 3: Deploy the Infrastructure

#### Quick Deploy (with inline parameters)

```bash
az deployment sub create \
  --location westeurope \
  --template-file main.bicep \
  --parameters environment=dev \
  --parameters adminUsername=azureadmin \
  --parameters adminPassword='<your-secure-password>' \
  --parameters location=westeurope
```

#### Deploy with Parameters File

1. Create a copy of the parameters file:
   ```bash
   cp main.parameters.json main.parameters.local.json
   ```

2. Edit `main.parameters.local.json` and update the values:
   - Replace `{subscription-id}`, `{rg-name}`, `{vault-name}` if using Key Vault
   - Or provide the password directly (not recommended for production)

3. Deploy:
   ```bash
   az deployment sub create \
     --location westeurope \
     --template-file main.bicep \
     --parameters main.parameters.local.json \
     --parameters adminPassword='<your-secure-password>'
   ```

### Step 4: Monitor Deployment

```bash
# List all deployments
az deployment sub list --output table

# Show deployment details
az deployment sub show --name main-deployment
```

## Post-Deployment Steps

### 1. Configure Container Image for Lisbon API

If you're using a custom container image:

```bash
# Build and push your Lisbon API image
cd backend/lisbon-parking-api
docker build -t <your-registry>.azurecr.io/lisbon-parking-api:latest .
az acr login --name <your-registry>
docker push <your-registry>.azurecr.io/lisbon-parking-api:latest

# Update the Container App
az containerapp update \
  --name ca-parking-lisbon \
  --resource-group rg-parking-lisbon-dev \
  --image <your-registry>.azurecr.io/lisbon-parking-api:latest
```

### 2. Deploy Madrid API to Windows VM

SSH/RDP into the Madrid VM and deploy the Node.js application:

```powershell
# RDP into the Windows VM
# Then download and setup the Madrid API

# Create application directory
New-Item -ItemType Directory -Path C:\parking-api

# Clone or copy the application code
# Install dependencies
cd C:\parking-api
npm install

# Install as Windows Service (optional)
npm install -g node-windows
node install-service.js

# Or run manually
npm start
```

### 3. Deploy Paris API to Linux VM

SSH into the Paris VM and deploy the Node.js application:

```bash
# SSH into the Ubuntu VM
ssh azureadmin@<paris-vm-fqdn>

# Create application directory
sudo mkdir -p /opt/parking-api
sudo chown $USER:$USER /opt/parking-api

# Clone or copy the application code
cd /opt/parking-api
npm install

# Create systemd service
sudo nano /etc/systemd/system/paris-parking-api.service
```

Example systemd service file:
```ini
[Unit]
Description=Paris Parking API
After=network.target

[Service]
Type=simple
User=azureadmin
WorkingDirectory=/opt/parking-api
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable paris-parking-api
sudo systemctl start paris-parking-api
```

### 4. Deploy Frontend to App Service

```bash
# Build the frontend
cd frontend/parking-manager
npm install
npm run build

# Deploy using Azure CLI
az webapp up \
  --name <app-service-name> \
  --resource-group rg-parking-frontend-dev \
  --plan asp-parking-frontend \
  --runtime "NODE:18-lts" \
  --src-path ./build
```

Or use GitHub Actions / Azure DevOps for CI/CD.

## Accessing the Resources

After deployment, retrieve the outputs:

```bash
az deployment sub show \
  --name main-deployment \
  --query properties.outputs
```

Key outputs:
- **Frontend URL**: https://app-parking-frontend-*.azurewebsites.net
- **Lisbon API URL**: https://ca-parking-lisbon.*.azurecontainerapps.io
- **Madrid API URL**: http://madrid-parking-*.westeurope.cloudapp.azure.com:3002
- **Paris API URL**: http://paris-parking-*.westeurope.cloudapp.azure.com:3003

## Updating the Infrastructure

To update resources:

```bash
# Modify the Bicep files as needed
# Run deployment again (Bicep is idempotent)
az deployment sub create \
  --location westeurope \
  --template-file main.bicep \
  --parameters main.parameters.local.json \
  --parameters adminPassword='<your-secure-password>'
```

## Cleaning Up

To delete all resources:

```bash
# Delete all resource groups
az group delete --name rg-parking-hub-dev --yes --no-wait
az group delete --name rg-parking-frontend-dev --yes --no-wait
az group delete --name rg-parking-lisbon-dev --yes --no-wait
az group delete --name rg-parking-madrid-dev --yes --no-wait
az group delete --name rg-parking-paris-dev --yes --no-wait
```

## Troubleshooting

### GitHub Runners Subnet Deployment

**Issue**: Deployment fails with error `InUseSubnetCannotBeDeleted` for `snet-github-runners` subnet.

**Cause**: The subnet has a service association link from GitHub Actions networking that prevents deletion during VNet state reconciliation.

**Solution**: **FIXED (February 13, 2026)** - The infrastructure has been updated to prevent this issue:
- VNet subnets are now created as separate child resources instead of inline definitions
- This prevents Azure from attempting to delete existing subnets during redeployment
- The `snet-github-runners` subnet is managed by the `github-runner-network.bicep` module with proper GitHub delegation

**For existing deployments experiencing this issue:**
If you have an older infrastructure deployment and encounter this error:
- The subnet cannot be modified or removed while the service association link exists
- You can either:
  1. **Recommended**: Pull the latest infrastructure code and redeploy (the fix will prevent future occurrences)
  2. **Manual cleanup** (if needed): Remove the GitHub Network Settings resource first:
     ```bash
     az resource delete \
       --resource-group rg-parking-hub-dev \
       --name github-actions-network-settings \
       --resource-type GitHub.Network/networkSettings
     ```
     Then redeploy the infrastructure

**Note**: With the February 13, 2026 fix, redeployments work without manual intervention.

### Bicep Compilation Errors

```bash
# Validate Bicep syntax
az bicep build --file main.bicep
```

### Deployment Errors

```bash
# Get deployment error details
az deployment sub show \
  --name main-deployment \
  --query properties.error

# View deployment operations
az deployment operation sub list \
  --name main-deployment
```

### VM Access Issues

```bash
# Reset VM password
az vm user update \
  --resource-group rg-parking-madrid-dev \
  --name vm-madrid-api \
  --username azureadmin \
  --password '<new-password>'

# Enable boot diagnostics
az vm boot-diagnostics enable \
  --resource-group rg-parking-madrid-dev \
  --name vm-madrid-api
```

## Security Considerations

### Critical Security Settings

1. **SSH/RDP Access**: By default, the NSG allows SSH (port 22) and RDP (port 3389) from any IP address (`*`). **This is for development/demo purposes only.**

   For production:
   ```bash
   # Deploy with restricted IP access
   az deployment sub create \
     --location westeurope \
     --template-file main.bicep \
     --parameters allowedSourceIpPrefix='YOUR.IP.ADDRESS.HERE/32'
   ```
   
   Or better yet, use **Azure Bastion** for secure VM access without public IPs:
   ```bash
   # Disable public IPs and use Bastion
   --parameters createPublicIps=false
   ```

2. **Container Registry Authentication**: The default configuration uses username/password for private registries. For production:
   - Use **Azure Container Registry** with **Managed Identity** authentication
   - Enable **admin user** only when necessary
   - Rotate credentials regularly if using username/password

### Additional Security Best Practices

3. **Use Key Vault** for storing sensitive parameters (VM passwords, container registry credentials)
4. **Enable Azure AD authentication** for App Service and Container Apps
5. **Configure NSG rules** to restrict access based on your needs
6. **Enable Azure Monitor** and Application Insights for all resources
7. **Use Managed Identities** instead of connection strings where possible
8. **Enable HTTPS only** for web applications
9. **Regular patching** of VMs through Azure Update Management
10. **Enable Azure Defender** for advanced threat protection

## Networking

The infrastructure uses a hub-and-spoke network topology:

- **Hub VNet**: 10.0.0.0/16
  - VM Subnet: 10.0.1.0/24 (254 addresses)
  - Container Apps Subnet: 10.0.2.0/23 (510 addresses)

All resources are connected to the hub VNet for centralized management and monitoring.

## Monitoring

All resources send logs to the centralized Log Analytics Workspace:

```kusto
// Query all API requests
AppRequests
| where TimeGenerated > ago(1h)
| summarize count() by cloud_RoleName, resultCode

// Check VM performance
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| summarize avg(CounterValue) by Computer
```

## Contributing

When modifying the infrastructure:

1. Test changes in a dev environment first
2. Use `az deployment sub what-if` to preview changes
3. Document any new parameters or outputs
4. Update this README with relevant information

## License

ISC
