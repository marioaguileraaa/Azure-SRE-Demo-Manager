# Deployment Automation Summary

## ✅ YES - Your GitHub Runner WILL Deploy Paris API Automatically!

Your GitHub workflow **[deploy-paris-api.yml](.github/workflows/deploy-paris-api.yml)** will automatically:

1. ✅ **Deploy the application code** to `/opt/paris-parking-api`
2. ✅ **Install dependencies** (`npm ci`)
3. ✅ **Create `.env` file** with configuration
4. ✅ **Generate HTTPS certificates** (I just added this!)
5. ✅ **Create systemd service** 
6. ✅ **Start the service** automatically
7. ✅ **Enable auto-start on boot**

## 🚀 How It Works

### Trigger
The workflow runs automatically when:
- ✅ You push changes to `main` branch
- ✅ Changes are in `backend/paris-parking-api/**` folder
- ✅ You manually trigger it (workflow_dispatch)

### Runner
- Runs on: **`parking-hub-runner-linux`** (your GitHub self-hosted runner)
- Location: Likely running on your hub VM or a Linux VM in Azure

### Deployment Process

```
1. Checkout code
2. Login to Azure (using AZURE_CREDENTIALS secret)
3. Package Paris API into ZIP
4. Upload to Azure Storage (deployments container)
5. Generate SAS URL for download
6. Run deployment script on Paris VM via Azure Run Command:
   ├── Stop existing service
   ├── Download package from storage
   ├── Extract to /opt/paris-parking-api
   ├── Install npm dependencies
   ├── Generate HTTPS certificates (NEW! ✨)
   ├── Create .env file with certificate paths
   ├── Create systemd service
   ├── Enable and start service
   └── Verify service is running
7. Clean up deployment package
```

## 🆕 What I Just Added

I updated the workflow to **automatically generate HTTPS certificates** during deployment:

```bash
# Now included in the deployment:
if [ ! -f "$APP_DIR/paris.crt" ] || [ ! -f "$APP_DIR/paris.key" ]; then
  openssl genrsa -out "$APP_DIR/paris.key" 2048
  openssl req -new -x509 -key "$APP_DIR/paris.key" -out "$APP_DIR/paris.crt" \
    -days 365 -subj "/C=FR/ST=Paris/L=Paris/O=Parking/OU=API/CN=10.0.1.6"
  chmod 600 "$APP_DIR/paris.key"
  chmod 644 "$APP_DIR/paris.crt"
fi
```

The `.env` file now includes:
```bash
CERT_PATH=/opt/paris-parking-api/paris.crt
KEY_PATH=/opt/paris-parking-api/paris.key
```

## 📋 Required GitHub Variables & Secrets

Your workflow needs these configured in GitHub:

### Secrets
- `AZURE_CREDENTIALS` - Azure service principal credentials

### Variables
- `PARIS_VM_NAME` - Name of your Paris VM
- `PARIS_RESOURCE_GROUP` - Resource group containing Paris VM
- `DEPLOYMENT_STORAGE_ACCOUNT` - Storage account for deployment packages
- `HUB_RESOURCE_GROUP` - Resource group containing storage account

## 🎯 To Deploy Paris API Now

### Option 1: Automatic (Recommended)
```bash
# Commit and push your code
git add .
git commit -m "Update Paris API"
git push origin main

# The workflow will trigger automatically!
```

### Option 2: Manual Trigger
1. Go to GitHub Actions
2. Select "Deploy Paris API to Linux VM"
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow"

### Option 3: Manual Setup (If workflow hasn't run yet)
Use the setup script I created:
```bash
# On Paris VM
./setup-paris-api.sh
```

## 📊 Monitoring the Deployment

### GitHub Actions UI
1. Go to your repository
2. Click "Actions" tab
3. Find the running workflow
4. Watch real-time logs

### On the Paris VM
```bash
# Check service status
sudo systemctl status paris-parking-api

# View logs
sudo journalctl -u paris-parking-api -f

# Check syslog
sudo tail -f /var/log/syslog | grep ParisParkingAPI

# Test endpoints
curl --insecure https://localhost:3003/health
```

## 🔍 What Happens After Push

```
Your Push → GitHub
    ↓
GitHub detects change in backend/paris-parking-api/**
    ↓
Triggers workflow on parking-hub-runner-linux
    ↓
Runner packages and uploads to Azure Storage
    ↓
Azure Run Command executes deployment on Paris VM
    ↓
Service installed, configured, and started
    ↓
✅ Paris API is live on HTTPS port 3003!
```

## ✅ Verification After Deployment

The workflow automatically checks:
```bash
if sudo systemctl is-active --quiet paris-parking-api; then
  echo "✅ Service is running"
else
  echo "❌ Service failed to start"
  sudo journalctl -u paris-parking-api --no-pager -n 50
  exit 1
fi
```

If the service fails to start, the workflow will fail and show you the logs.

## 📁 Deployment Location on VM

```
/opt/paris-parking-api/
├── server.js
├── syslogLogger.js
├── package.json
├── package-lock.json
├── node_modules/
├── .env
├── paris.crt      # HTTPS certificate
└── paris.key      # Private key
```

## 🎛️ Service Management

After deployment, the service is managed by systemd:

```bash
# Start
sudo systemctl start paris-parking-api

# Stop
sudo systemctl stop paris-parking-api

# Restart
sudo systemctl restart paris-parking-api

# Status
sudo systemctl status paris-parking-api

# Enable auto-start
sudo systemctl enable paris-parking-api

# Disable auto-start
sudo systemctl disable paris-parking-api

# View logs
sudo journalctl -u paris-parking-api -f
```

## 🔥 Troubleshooting Deployment

### Workflow fails at "Upload to storage"
**Issue**: RBAC permissions not propagated yet
**Solution**: Workflow has retry logic (5 attempts, 10s delay)

### Workflow fails at "Deploy to VM"
**Issue**: VM not accessible or Azure Run Command failed
**Check**: 
- VM is running: `az vm get-instance-view --name $VM_NAME --resource-group $RG`
- Firewall rules allow Azure services
- VM has connectivity

### Service won't start after deployment
**Check deployment logs in GitHub Actions**:
```bash
# The workflow shows service status
# If failed, it displays:
sudo journalctl -u paris-parking-api --no-pager -n 50
```

### Manual troubleshooting on VM
```bash
# SSH to Paris VM
ssh azureadmin@<paris-vm-ip>

# Check if files were deployed
ls -la /opt/paris-parking-api/

# Check service status
sudo systemctl status paris-parking-api

# Try running manually
cd /opt/paris-parking-api
node server.js

# Check for errors in logs
sudo journalctl -u paris-parking-api -n 100 --no-pager
```

## 🎉 Summary

**YES!** Your GitHub runner will:
- ✅ Automatically deploy on git push
- ✅ Install all dependencies
- ✅ Generate HTTPS certificates (newly added!)
- ✅ Configure the service
- ✅ Start the API
- ✅ Verify it's running

**You don't need to manually run the setup script** - just push your code and the workflow handles everything!

## 🚀 Next Steps

1. **Commit the updated workflow**:
   ```bash
   git add .github/workflows/deploy-paris-api.yml
   git commit -m "Add HTTPS certificate generation to Paris API deployment"
   git push origin main
   ```

2. **Watch it deploy**:
   - Go to GitHub Actions
   - Watch the "Deploy Paris API to Linux VM" workflow
   - Monitor logs in real-time

3. **Verify after deployment**:
   ```bash
   curl --insecure https://<paris-vm-ip>:3003/health
   ```

4. **Monitor the service**:
   ```bash
   sudo journalctl -u paris-parking-api -f
   ```

You're all set! 🎊
