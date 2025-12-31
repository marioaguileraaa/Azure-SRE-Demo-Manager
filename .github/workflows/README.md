# GitHub Actions Setup for Deployment

This document explains the GitHub Actions workflows configured for the Azure SRE Demo Manager project.

## Overview

The project uses multiple deployment workflows:
1. **Lisbon API** - Container App deployment
2. **Madrid API** - Windows VM deployment (self-hosted runner)
3. **Paris API** - Linux VM deployment (self-hosted runner)
4. **Frontend** - Azure App Service deployment

---

## Workflows

### 1. Lisbon API Deployment (Container App)

**File:** `.github/workflows/deploy-lisbon-api.yml`

Deploys the Lisbon Parking API to Azure Container Apps using Docker.

Deploys the Lisbon Parking API to Azure Container Apps using Docker.

**Required Variables:**
- `AZURE_CONTAINER_REGISTRY` - Your ACR name (e.g., `acrparkingdev725vs7xw6g7qg`)
- `RESOURCE_GROUP` - Resource group name (e.g., `rg-parking-lisbon-dev`)

**Required Secrets:**
- `AZURE_CREDENTIALS` - Service principal JSON
- `ACR_USERNAME` - Container registry username  
- `ACR_PASSWORD` - Container registry password

**Triggers:** Push to `main` affecting `backend/lisbon-parking-api/**`

---

### 2. Frontend Deployment (App Service)

**File:** `.github/workflows/deploy-frontend.yml`

Deploys the React frontend to Azure App Service.

**Required Variables:**
- `AZURE_WEBAPP_NAME` - App Service name (e.g., `app-parking-frontend-yd5hvpxzlffke`)
- `FRONTEND_RESOURCE_GROUP` - Resource group name (e.g., `rg-parking-frontend-dev`)

**Required Secrets:**
- `AZURE_CREDENTIALS` - Service principal JSON

**Triggers:** Push to `main` affecting `frontend/parking-manager/**`

---

### 3. Madrid API Deployment (Windows VM)

**File:** `.github/workflows/deploy-madrid-api.yml`

Deploys the Madrid Parking API to Windows VM using a self-hosted runner.

**Setup Required:** Install runner on Madrid VM using `scripts/setup-madrid-runner.ps1`
**Runner Labels:** `self-hosted`, `windows`, `madrid-vm`
**Triggers:** Push to `main` affecting `backend/madrid-parking-api/**`

---

### 4. Paris API Deployment (Linux VM)

**File:** `.github/workflows/deploy-paris-api.yml`

Deploys the Paris Parking API to Linux VM using a self-hosted runner.

**Setup Required:** Install runner on Paris VM using `scripts/setup-paris-runner.sh`
**Runner Labels:** `self-hosted`, `linux`, `paris-vm`
**Triggers:** Push to `main` affecting `backend/paris-parking-api/**`

---

## Configuration Setup

### GitHub Variables

Configure these variables in **Settings → Secrets and variables → Actions → Variables**:

- `AZURE_CONTAINER_REGISTRY` - Your ACR name (e.g., `acrparkingdev725vs7xw6g7qg`)
- `RESOURCE_GROUP` - Resource group for Lisbon API (e.g., `rg-parking-lisbon-dev`)
- `AZURE_WEBAPP_NAME` - App Service name (e.g., `app-parking-frontend-yd5hvpxzlffke`)
- `FRONTEND_RESOURCE_GROUP` - Resource group for frontend (e.g., `rg-parking-frontend-dev`)

### GitHub Secrets

### GitHub Secrets

Configure these secrets in **Settings → Secrets and variables → Actions → Secrets**:

**1. AZURE_CREDENTIALS** (Used by Lisbon API and Frontend)

Create a service principal with contributor access:

```bash
az ad sp create-for-rbac \
  --name "github-actions-parking-app" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

Copy the entire JSON output and add it as the `AZURE_CREDENTIALS` secret.

**2. ACR_USERNAME and ACR_PASSWORD** (Used by Lisbon API)

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

## Configuration Summary

### Variables (Settings → Secrets and variables → Actions → Variables)
1. `AZURE_CONTAINER_REGISTRY` = `acrparkingdev725vs7xw6g7qg`
2. `RESOURCE_GROUP` = `rg-parking-lisbon-dev`

### Secrets (Settings → Secrets and variables → Actions → Secrets)
1. `AZURE_CREDENTIALS` - Service principal JSON
2. `ACR_USERNAME` - Container registry username
3. `ACR_PASSWORD` - Container registry password

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
- Check that the service principal has appropriate permissions

### Registry Access Issues
- Ensure `ACR_USERNAME` and `ACR_PASSWORD` are correct
- Verify admin user is enabled on the Container Registry

### Deployment Failures
- Check the Container App logs in Azure Portal
- Verify the image was successfully pushed to ACR
- Ensure the Container App environment is healthy
