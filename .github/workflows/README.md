# GitHub Actions Setup for Deployment

This document explains the GitHub Actions workflows configured for the Azure SRE Demo Manager project.

## Overview

The project uses multiple deployment workflows:

1. **Infrastructure** - Azure infrastructure provisioning using Bicep (IaC)
2. **Lisbon API** - Container App deployment
3. **Berlin API** - Container App deployment
4. **Chaos Control** - Container App deployment
5. **Lisbon Chaos Alerts** - Azure Monitor scheduled query alerts deployment
6. **Madrid API** - Windows VM deployment (self-hosted runner)
7. **Paris API** - Linux VM deployment (self-hosted runner)
8. **Frontend** - Azure App Service deployment

---

## Infrastructure Workflows

### 1. Infrastructure What-If Analysis

**File:** `.github/workflows/infra-whatif.yml`

Runs a preview analysis of infrastructure changes for pull requests without making any actual deployments.

**Purpose:**

- Validates Bicep templates before merging
- Shows what resources will be created, modified, or deleted
- Prevents accidental infrastructure changes

**Triggers:**

- Pull requests affecting `infrastructure/**` paths
- Changes to the workflow file itself

**Required Secrets:**

- `AZURE_CREDENTIALS` - Service principal JSON (same as other workflows)

**How it works:**

1. Detects changes to infrastructure files
2. Runs `az deployment sub what-if` command
3. Posts analysis results to the PR summary
4. Fails if template validation fails

**No Variables Required** - Uses default parameters from `infrastructure/main.parameters.json`

---

### 2. Infrastructure Deployment (Manual)

**File:** `.github/workflows/infra-deploy.yml`

Manually deploys Azure infrastructure using Bicep templates at subscription scope.

**Purpose:**

- Deploy all infrastructure resources (VMs, networking, Container Apps, App Services, ACR)
- Support multiple environments (dev, test, prod)
- Provide safe, auditable infrastructure changes

**Trigger:** Manual only (`workflow_dispatch`)

**Required Secrets:**

- `AZURE_CREDENTIALS` - Service principal JSON

**Workflow Inputs:**

- `environment` - Environment to deploy (dev/test/prod) - **Required**
- `location` - Azure region (default: westeurope) - **Required**
- `parametersFile` - Path to parameters file (default: infrastructure/main.parameters.json) - **Required**
- `confirmDeployment` - Type "DEPLOY" to confirm - **Required**

**How to run:**

1. Go to **Actions** tab in GitHub
2. Select **Deploy Infrastructure to Azure**
3. Click **Run workflow**
4. Fill in the inputs:
   - Environment: Choose `dev`, `test`, or `prod`
   - Location: Azure region (e.g., `westeurope`, `swedencentral`)
   - Parameters File: Path to parameter file (usually `infrastructure/main.parameters.json`)
   - Confirmation: Type `DEPLOY` to proceed
5. Click **Run workflow**

**GitHub Environments:**
This workflow supports GitHub environment protection rules. You can configure:

- Environment-specific approvals
- Environment-specific secrets/variables
- Deployment branches restrictions

To set up environments:

1. Go to **Settings** → **Environments**
2. Create environments: `dev`, `test`, `prod`
3. Add protection rules (e.g., require reviewers for `prod`)

**What it deploys:**

- Resource groups for each component (hub, frontend, Lisbon, Madrid, Paris)
- VNet and networking (hub infrastructure)
- Log Analytics workspace
- Azure Container Registry (ACR)
- Container App for Lisbon API
- Windows VM for Madrid API
- Linux VM for Paris API
- App Service for Frontend

**Deployment Outputs:**
The workflow captures and displays:

- Resource group names
- VNet and networking details
- Container Registry URL and credentials
- Frontend URL
- API endpoints
- VM names and IPs

**Post-infra deploy variables (dev example):**

After a successful `infra-deploy` run, set GitHub repository variables for application workflows.

Use this concrete `dev` example (based on current deployment outputs):

```text
AZURE_CONTAINER_REGISTRY=acrparkingdev725vs7xw6g7qg
LISBON_RESOURCE_GROUP=rg-parking-lisbon-dev
BERLIN_RESOURCE_GROUP=rg-parking-berlin-dev
FRONTEND_RESOURCE_GROUP=rg-parking-frontend-dev
CHAOS_CONTROL_RESOURCE_GROUP=rg-parking-chaos-dev
CHAOS_CONTROL_CONTAINER_APP_NAME=ca-chaos-control
```

Notes:

- `CHAOS_CONTROL_RESOURCE_GROUP` should be the resource group where your Chaos Control Container App exists.
- `CHAOS_CONTROL_CONTAINER_APP_NAME` must match the existing Container App name used by `.github/workflows/deploy-chaos-control.yml`.

---

## Application Deployment Workflows

### 1. Lisbon API Deployment (Container App)

**File:** `.github/workflows/deploy-lisbon-api.yml`

Deploys the Lisbon Parking API to Azure Container Apps using Docker.

**Required Variables:**

- `AZURE_CONTAINER_REGISTRY` - Your ACR name (e.g., `acrparkingdev725vs7xw6g7qg`)
- `LISBON_RESOURCE_GROUP` - Resource group name (e.g., `rg-parking-lisbon-dev`)

**Required Secrets:**

- `AZURE_CREDENTIALS` - Service principal JSON

**Triggers:** Push to `main` affecting `backend/lisbon-parking-api/**`

---

### 2. Berlin API Deployment (Container App)

**File:** `.github/workflows/deploy-berlin-api.yml`

Deploys the Berlin Parking API to Azure Container Apps using Docker.

**Required Variables:**

- `AZURE_CONTAINER_REGISTRY` - Your ACR name (e.g., `acrparkingdev725vs7xw6g7qg`)
- `BERLIN_RESOURCE_GROUP` - Resource group name (e.g., `rg-parking-berlin-dev`)

**Required Secrets:**

- `AZURE_CREDENTIALS` - Service principal JSON

**Triggers:** Push to `main` affecting `backend/berlin-parking-api/**`

---

### 3. Frontend Deployment (App Service)

**File:** `.github/workflows/deploy-frontend.yml`

Deploys the React frontend to Azure App Service.

**Required Variables:**
- `AZURE_WEBAPP_NAME` - App Service name (e.g., `app-parking-frontend-yd5hvpxzlffke`)
- `FRONTEND_RESOURCE_GROUP` - Resource group name (e.g., `rg-parking-frontend-dev`)

**Required Secrets:**
- `AZURE_CREDENTIALS` - Service principal JSON

**Triggers:** Push to `main` affecting `frontend/parking-manager/**`

---

### 4. Chaos Control Deployment (Container App)

**File:** `.github/workflows/deploy-chaos-control.yml`

Deploys the Chaos Control service to Azure Container Apps using Docker.

**Required Variables:**
- `AZURE_CONTAINER_REGISTRY` - Your ACR name (e.g., `acrparkingdev725vs7xw6g7qg`)
- `CHAOS_CONTROL_RESOURCE_GROUP` - Resource group name where Chaos Control Container App is deployed
- `CHAOS_CONTROL_CONTAINER_APP_NAME` - Chaos Control Container App name (e.g., `ca-chaos-control`)

**Required Secrets:**
- `AZURE_CREDENTIALS` - Service principal JSON

**Triggers:** Push to `main` affecting `backend/chaos-control/**`

---

### 5. Lisbon Chaos Alerts Deployment (Azure Monitor)

**File:** `.github/workflows/deploy-lisbon-chaos-alerts.yml`

Deploys Azure Monitor scheduled query alerts from `infrastructure/modules/lisbon-chaos-alerts.bicep`.

**Required Variables:**
- `HUB_RESOURCE_GROUP` - Resource group where alert rules are deployed (e.g., `rg-parking-hub-dev`)
- `LISBON_LOG_ANALYTICS_WORKSPACE_ID` - Full Log Analytics workspace resource ID used by Lisbon logs
- `LISBON_CHAOS_ALERTS_ACTION_GROUP_ID` - Full Action Group resource ID for notifications (optional)

**Required Secrets:**
- `AZURE_CREDENTIALS` - Service principal JSON

**Triggers:**
- Push to `main` affecting `infrastructure/modules/lisbon-chaos-alerts.bicep`
- Manual dispatch with custom `location`, `enabled`, `evaluationFrequency`, `windowSize`, `namePrefix`

---

### 6. Madrid API Deployment (Windows VM)

**File:** `.github/workflows/deploy-madrid-api.yml`

Deploys the Madrid Parking API to Windows VM using a self-hosted runner.

**Setup Required:** Install runner on Madrid VM using `scripts/setup-madrid-runner.ps1`
**Runner Labels:** `self-hosted`, `windows`, `madrid-vm`
**Triggers:** Push to `main` affecting `backend/madrid-parking-api/**`

---

### 7. Paris API Deployment (Linux VM)

**File:** `.github/workflows/deploy-paris-api.yml`

Deploys the Paris Parking API to Linux VM using a self-hosted runner.

**Setup Required:** Install runner on Paris VM using `scripts/setup-paris-runner.sh`
**Runner Labels:** `self-hosted`, `linux`, `paris-vm`
**Triggers:** Push to `main` affecting `backend/paris-parking-api/**`

---

## Configuration Setup

### GitHub Secrets

Configure these secrets in **Settings → Secrets and variables → Actions → Secrets**:

**AZURE_CREDENTIALS** (Required for ALL workflows)

Create a service principal with contributor access at the subscription level:

```bash
az ad sp create-for-rbac \
  --name "github-actions-parking-app" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

Copy the entire JSON output and add it as the `AZURE_CREDENTIALS` secret.

**Note:** This same secret is used by:
- Infrastructure deployment workflows (infra-whatif, infra-deploy)
- Application deployment workflows (Lisbon API, Frontend)

**Additional Secrets for Application Workflows:**

**ACR_USERNAME and ACR_PASSWORD** (Used by Lisbon API only)

Get your Azure Container Registry credentials:

```bash
# Get ACR username (admin user)
az acr credential show --name acrparkingdev725vs7xw6g7qg --query username -o tsv

# Get ACR password
az acr credential show --name acrparkingdev725vs7xw6g7qg --query passwords[0].value -o tsv
```

Add these as secrets:
- `ACR_USERNAME`: The username from the first command
- `ACR_PASSWORD`: The password from the second command

### GitHub Variables

Configure these variables in **Settings → Secrets and variables → Actions → Variables**:

**For Application Deployment Workflows:**

- `AZURE_CONTAINER_REGISTRY` - Your ACR name (e.g., `acrparkingdev725vs7xw6g7qg`)
- `RESOURCE_GROUP` - Resource group for Lisbon API (e.g., `rg-parking-lisbon-dev`)
- `LISBON_RESOURCE_GROUP` - Resource group for Lisbon API (e.g., `rg-parking-lisbon-dev`)
- `BERLIN_RESOURCE_GROUP` - Resource group for Berlin API (e.g., `rg-parking-berlin-dev`)
- `CHAOS_CONTROL_RESOURCE_GROUP` - Resource group for Chaos Control Container App
- `CHAOS_CONTROL_CONTAINER_APP_NAME` - Container App name for Chaos Control (e.g., `ca-chaos-control`)
- `HUB_RESOURCE_GROUP` - Resource group where Lisbon chaos alerts are deployed (e.g., `rg-parking-hub-dev`)
- `LISBON_LOG_ANALYTICS_WORKSPACE_ID` - Full resource ID of Log Analytics workspace used by Lisbon logs
- `LISBON_CHAOS_ALERTS_ACTION_GROUP_ID` - Full resource ID of Action Group for alert notifications (optional)
- `AZURE_WEBAPP_NAME` - App Service name (e.g., `app-parking-frontend-yd5hvpxzlffke`)
- `FRONTEND_RESOURCE_GROUP` - Resource group for frontend (e.g., `rg-parking-frontend-dev`)

**Note:** Infrastructure workflows don't require GitHub Variables - they use parameters from `infrastructure/main.parameters.json`

### Infrastructure Parameters

The infrastructure deployment workflows use parameter files in the `infrastructure/` directory:

- `main.parameters.json` - Default parameters (used by workflows)
- `main.parameters.example01.json` - Example configuration 1
- `main.parameters.example02.json` - Example configuration 2

**Key Parameters:**
- `location` - Azure region (e.g., `westeurope`, `swedencentral`)
- `environment` - Environment name (dev, test, prod)
- `adminUsername` - VM administrator username
- `adminPassword` - VM administrator password (keep secure!)
- `createPublicIps` - Whether to create public IPs for VMs (true/false)
- `createContainerRegistry` - Whether to create ACR (true/false)

**Important:** Update `main.parameters.json` with your desired configuration before running infrastructure deployments. Sensitive values like passwords should be managed securely.

## Configuration Summary

### Required for ALL Workflows

**Secrets:**
1. `AZURE_CREDENTIALS` - Service principal JSON (subscription-level contributor access)

### Additional for Application Deployment Workflows

**Variables:**
1. `AZURE_CONTAINER_REGISTRY` - ACR name (e.g., `acrparkingdev725vs7xw6g7qg`)
2. `LISBON_RESOURCE_GROUP` - Resource group for Lisbon API (e.g., `rg-parking-lisbon-dev`)
3. `BERLIN_RESOURCE_GROUP` - Resource group for Berlin API (e.g., `rg-parking-berlin-dev`)
4. `CHAOS_CONTROL_RESOURCE_GROUP` - Resource group for Chaos Control Container App
5. `CHAOS_CONTROL_CONTAINER_APP_NAME` - Container App name for Chaos Control (e.g., `ca-chaos-control`)
6. `AZURE_WEBAPP_NAME` - App Service name (e.g., `app-parking-frontend-yd5hvpxzlffke`)
7. `FRONTEND_RESOURCE_GROUP` - Resource group for frontend (e.g., `rg-parking-frontend-dev`)

**Secrets:**
1. `AZURE_CREDENTIALS` - Service principal JSON (subscription-level contributor access)

### Infrastructure Workflows Configuration

**No GitHub Variables Required** - Uses parameter files in `infrastructure/` directory

**Parameter File:** `infrastructure/main.parameters.json`
- Customize before deployment
- Contains environment settings, credentials, and resource configurations

## Setting Up GitHub Secrets and Variables

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add **Variables** tab:
   - Click **New repository variable**
   - Add `AZURE_CONTAINER_REGISTRY` and `RESOURCE_GROUP`
4. Add **Secrets** tab:
   - Click **New repository secret**
   - Add the three secrets mentioned above

## Workflow Triggers

The workflow runs automatically when:
- Code is pushed to the `main` branch in the `backend/lisbon-parking-api/` directory
- The workflow file itself is modified
- Manually triggered via the GitHub Actions UI

## What the Workflow Does

1. **Checks out the code** from the repository
2. **Logs in to Azure** using the service principal credentials
3. **Logs in to Azure Container Registry** to push Docker images
4. **Builds the Docker image** from the Dockerfile in `backend/lisbon-parking-api/`
5. **Tags the image** with both the commit SHA and `latest`
6. **Pushes the image** to Azure Container Registry
7. **Updates the Container App** to use the new image
8. **Provides a deployment summary** in the workflow run

## Monitoring Deployments

After the workflow completes:
- Check the GitHub Actions tab to see the deployment status
- View the Container App logs in Azure Portal
- Access the API at the URL shown in your deployment outputs

## Manual Deployment

You can also trigger the deployment manually:
1. Go to the **Actions** tab in your GitHub repository
2. Select **Deploy Lisbon API to Azure Container App**
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

## Updating the Workflow

If your infrastructure changes (e.g., different resource names), update these variables in **GitHub Settings → Secrets and variables → Actions → Variables**:

- `AZURE_CONTAINER_REGISTRY`: Your ACR name
- `RESOURCE_GROUP`: Your resource group name

## Troubleshooting

### Authentication Issues
- Verify `AZURE_CREDENTIALS` secret is correct and not expired
- Check that the service principal has appropriate permissions (Contributor role at subscription level)
- Ensure the service principal hasn't been deleted or disabled

### Infrastructure Deployment Issues

**What-If Analysis Failures:**
- Check Bicep template syntax using `az bicep build --file infrastructure/main.bicep`
- Verify parameter file is valid JSON
- Ensure all required parameters are provided

**Deployment Failures:**
- Review deployment logs in Azure Portal (Deployments section)
- Check for resource naming conflicts
- Verify subscription has sufficient quota for requested resources
- Ensure parameter values meet Azure resource requirements (naming, regions, etc.)

**Common Issues:**
- **VM Password Requirements:** Must meet Azure complexity requirements (12+ chars, upper, lower, number, special)
- **Region Availability:** Not all Azure regions support all resource types
- **Naming Conflicts:** Resource names must be unique within their scope

### Registry Access Issues
- Ensure `ACR_USERNAME` and `ACR_PASSWORD` are correct
- Verify admin user is enabled on the Container Registry
- Check ACR exists and is accessible from your subscription

### Application Deployment Failures
- Check the Container App logs in Azure Portal
- Verify the image was successfully pushed to ACR
- Ensure the Container App environment is healthy
- Verify resource group and resource names in GitHub Variables are correct

## Deployment Order

For a fresh deployment, follow this order:

1. **Deploy Infrastructure First** (Manual)
   - Run `Deploy Infrastructure to Azure` workflow
   - Wait for completion and note the output resource names
   - Update GitHub Variables with the created resource names

2. **Update GitHub Variables** (One-time setup)
   - Add `AZURE_CONTAINER_REGISTRY` (from infrastructure outputs)
   - Add `LISBON_RESOURCE_GROUP` for Lisbon API
   - Add `BERLIN_RESOURCE_GROUP` for Berlin API
   - Add `AZURE_WEBAPP_NAME` (from infrastructure outputs)
   - Add `FRONTEND_RESOURCE_GROUP`

3. **Deploy Applications** (Can be automatic or manual)
   - Deploy Lisbon API (pushes to ACR and updates Container App)
   - Deploy Berlin API (pushes to ACR and updates Container App)
   - Deploy Frontend (builds and deploys to App Service)
   - Deploy Madrid/Paris APIs if using VMs with self-hosted runners

## Best Practices

### Infrastructure
- Always review What-If analysis before merging infrastructure changes
- Use manual deployment for infrastructure (never automatic on push)
- Test infrastructure changes in dev environment first
- Use parameter files for different environments
- Keep sensitive values secure (use Azure Key Vault references in production)

### Application Deployments
- Automatic deployment on push to main is acceptable for applications
- Review PR builds and tests before merging
- Monitor deployment summaries in GitHub Actions
- Check application health after deployment
