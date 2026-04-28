# Paris API Deployment Automation

The GitHub Actions workflow [`.github/workflows/deploy-paris-api.yml`](../.github/workflows/deploy-paris-api.yml) automates the full deployment of the Paris Parking API to the Linux VM.

## What the Workflow Does

1. Packages `backend/paris-parking-api/` into a ZIP archive
2. Uploads the package to Azure Storage
3. Uses Azure Run Command to deploy on the Paris VM:
   - Stops the existing service
   - Downloads and extracts the package to `/opt/paris-parking-api`
   - Installs npm dependencies
   - Generates HTTPS certificates (if not already present)
   - Creates the `.env` file with certificate paths
   - Creates/updates the systemd service
   - Enables and starts the service
   - Verifies the service is running
4. Cleans up the deployment package from storage

## Trigger

The workflow runs automatically when:
- Changes are pushed to `main` in `backend/paris-parking-api/**`
- Triggered manually via `workflow_dispatch`

## Required GitHub Variables and Secrets

### Secrets
- `AZURE_CREDENTIALS` — Azure service principal credentials

### Variables
- `PARIS_VM_NAME` — Name of the Paris VM
- `PARIS_RESOURCE_GROUP` — Resource group containing the Paris VM
- `DEPLOYMENT_STORAGE_ACCOUNT` — Storage account for deployment packages
- `HUB_RESOURCE_GROUP` — Resource group containing the storage account

## Deployment Options

### Option 1: Automatic (Recommended)
Push code changes to the `main` branch — the workflow triggers automatically.

### Option 2: Manual Trigger
1. Go to the **Actions** tab in GitHub
2. Select **Deploy Paris API to Linux VM**
3. Click **Run workflow** → select `main` → **Run workflow**

### Option 3: Manual Setup
If the workflow has not run yet, use `scripts/setup-paris-api.sh` directly on the Paris VM.

## Monitoring

- **GitHub Actions**: Watch real-time logs in the Actions tab
- **On the VM**: Check service status and logs after deployment

```bash
sudo systemctl status paris-parking-api
sudo journalctl -u paris-parking-api -f
sudo tail -f /var/log/syslog | grep ParisParkingAPI
curl --insecure https://localhost:3003/health
```

## Troubleshooting

### Upload to storage fails
The workflow includes retry logic (5 attempts, 10-second delay) for RBAC propagation delays.

### Deployment to VM fails
- Verify the VM is running: `az vm get-instance-view --name $VM_NAME --resource-group $RG`
- Ensure the VM has outbound internet connectivity (required for package download)
- Check firewall rules allow Azure services

### Service won't start after deployment
The workflow captures and displays service logs on failure. Review the failed step output in GitHub Actions.
