# Madrid API Deployment - Self-Hosted Runner Setup

This guide explains how to set up the Madrid Windows VM as a GitHub Actions self-hosted runner and deploy the Madrid Parking API automatically.

## Architecture Overview

Since the Madrid VM only has a private IP address (no public internet access), we use a **self-hosted GitHub Actions runner** installed on the same VM. This allows GitHub Actions to deploy code directly to the private Windows VM.

**Benefits:**
- ✅ No need for public IP exposure
- ✅ Cost-efficient (same VM for API and runner)
- ✅ Automatic deployments on code changes
- ✅ Secure - traffic stays within the VNet
- ✅ Native Windows service integration

## Prerequisites

- RDP access to the Madrid VM (vm-madrid-api)
- GitHub repository access
- Node.js installed on the VM (already done via infrastructure deployment)
- Administrator privileges on the Windows VM

## Setup Instructions

### Step 1: Connect to the Madrid VM

Since the VM has no public IP, you need to connect through Azure Bastion:

1. Go to **Azure Portal** → **Virtual Machines** → **vm-madrid-api**
2. Click **Connect** → **Bastion**
3. Enter credentials:
   - Username: `azureadmin`
   - Password: (the one you set during deployment)
4. Click **Connect**

### Step 2: Open PowerShell as Administrator

On the Madrid VM:
1. Click **Start**
2. Type `PowerShell`
3. Right-click **Windows PowerShell**
4. Select **Run as Administrator**

### Step 3: Download and Run the Setup Script

In PowerShell (as Administrator):

```powershell
# Change to a working directory
cd C:\Users\azureadmin

# Download the setup script (if you have the repo cloned)
# Or manually create the script and paste the content from scripts/setup-madrid-runner.ps1

# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Run the setup script
.\setup-madrid-runner.ps1
```

### Step 4: Configure the Script Variables

Before running, edit the script to set your GitHub details:

```powershell
notepad setup-madrid-runner.ps1
```

Update these variables at the top:
```powershell
$GITHUB_OWNER = "your-github-username-or-org"
$GITHUB_REPO = "sre-lab"
```

Save and close.

### Step 5: Get the Runner Registration Token

1. Go to your GitHub repository
2. Navigate to **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Windows** as the OS
5. Copy the registration token that appears
6. Paste it when the setup script asks for it

### Step 6: Verify the Runner is Active

After setup completes, verify the runner is registered:

**In GitHub:**
1. Go to: `https://github.com/<your-username>/sre-lab/settings/actions/runners`
2. You should see **madrid-vm-runner** with a green dot (Idle status)

**On the VM:**
```powershell
Get-Service "actions.runner.*"
```

The service should show as **Running**.

## How Deployment Works

### Automatic Deployment

When you push changes to the `backend/madrid-parking-api/` directory:

1. GitHub Actions workflow triggers
2. Job runs on the self-hosted runner (Madrid VM)
3. Code is checked out on the VM
4. Dependencies are installed
5. Windows service is created/updated and restarted
6. Health check verifies the API is running

### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy Madrid API to Windows VM**
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Service Management

The Madrid API runs as a Windows service using `node-windows`.

### Check Service Status

```powershell
# View service status
Get-Service -Name "MadridParkingAPI"

# Detailed information
Get-Service -Name "MadridParkingAPI" | Format-List *
```

### View Event Logs

The application logs to Windows Event Viewer:

```powershell
# View recent events
Get-EventLog -LogName Application -Source "MadridParkingAPI" -Newest 20

# Monitor events in real-time
Get-EventLog -LogName Application -Source "MadridParkingAPI" -Newest 1 | Format-List *
```

Or use **Event Viewer GUI**:
1. Open **Event Viewer** (eventvwr.msc)
2. Navigate to **Windows Logs** → **Application**
3. Filter by Source: **MadridParkingAPI**

### Manual Service Control

```powershell
# Restart the service
Restart-Service -Name "MadridParkingAPI"

# Stop the service
Stop-Service -Name "MadridParkingAPI"

# Start the service
Start-Service -Name "MadridParkingAPI"
```

### Test the API

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3002/health"

# Get parking info
Invoke-RestMethod -Uri "http://localhost:3002/api/parking"

# Get metrics
Invoke-RestMethod -Uri "http://localhost:3002/api/parking/metrics"
```

## Runner Management

### Check Runner Status

```powershell
Get-Service "actions.runner.*"
```

### View Runner Logs

```powershell
# View service events
Get-EventLog -LogName Application -Source "actions.runner.*" -Newest 20

# Check runner directory logs
Get-Content "C:\actions-runner\_diag\Runner_*.log" -Tail 50
```

### Restart Runner

```powershell
Restart-Service "actions.runner.*"
```

### Remove Runner

If you need to remove the runner:

```powershell
# Stop and remove the service
cd C:\actions-runner
.\config.cmd remove --token <removal-token>
```

Get the removal token from: `https://github.com/<owner>/<repo>/settings/actions/runners`

## Firewall Configuration

If the Madrid API needs to be accessible from other VMs in the VNet:

```powershell
# Open port 3002
New-NetFirewallRule -DisplayName "Madrid Parking API" `
    -Direction Inbound `
    -LocalPort 3002 `
    -Protocol TCP `
    -Action Allow

# Verify the rule
Get-NetFirewallRule -DisplayName "Madrid Parking API"
```

## Troubleshooting

### Runner Not Appearing in GitHub

1. Check if the service is running:
   ```powershell
   Get-Service "actions.runner.*"
   ```

2. Check runner logs:
   ```powershell
   Get-Content "C:\actions-runner\_diag\Runner_*.log" -Tail 100
   ```

3. Verify network connectivity:
   ```powershell
   Test-NetConnection -ComputerName github.com -Port 443
   ```

### Deployment Fails

1. Check if the runner is online in GitHub UI
2. View workflow logs in GitHub Actions tab
3. Check Windows Event Log:
   ```powershell
   Get-EventLog -LogName Application -Source "MadridParkingAPI" -Newest 50
   ```

### API Not Responding

1. Check if the service is running:
   ```powershell
   Get-Service -Name "MadridParkingAPI"
   ```

2. Check for port conflicts:
   ```powershell
   Get-NetTCPConnection -LocalPort 3002
   ```

3. Review Event Viewer logs:
   ```powershell
   Get-EventLog -LogName Application -Source "MadridParkingAPI" -Newest 20 | Format-List *
   ```

4. Check Node.js process:
   ```powershell
   Get-Process -Name "node" | Format-Table Id,ProcessName,Path
   ```

### Service Won't Start

1. Check Event Viewer for error details
2. Verify Node.js installation:
   ```powershell
   node --version
   npm --version
   ```

3. Manually test the application:
   ```powershell
   cd C:\Apps\madrid-parking-api
   node server.js
   ```

4. Check file permissions:
   ```powershell
   Get-Acl "C:\Apps\madrid-parking-api"
   ```

### Permission Issues

If you encounter permission errors:

```powershell
# Give full control to the current user
icacls "C:\Apps\madrid-parking-api" /grant "${env:USERNAME}:(OI)(CI)F" /T

# Give runner service account permissions
icacls "C:\actions-runner" /grant "NETWORK SERVICE:(OI)(CI)F" /T
```

## Security Considerations

- The VM remains private (no public IP)
- Runner communicates outbound to GitHub (HTTPS)
- No inbound connections required
- Service runs as NETWORK SERVICE (limited privileges)
- Secrets are managed through GitHub Secrets
- Windows Event Log provides audit trail

## Cost Optimization

Running the GitHub Actions runner on the same VM as the API:
- ✅ No additional VM costs
- ✅ Minimal resource overhead (runner uses ~150MB RAM when idle)
- ✅ Runner only active during deployments
- ✅ Same VM serves dual purpose (API host + CI/CD agent)
- ✅ Windows Server license already included

## Performance Notes

**VM Size: Standard_B2s**
- 2 vCPUs, 4 GB RAM
- Sufficient for both API and runner
- Runner typically uses:
  - ~150MB RAM when idle
  - ~300-500MB RAM during deployment
- API uses ~100-150MB RAM

## Additional Configuration

### Enable Automatic Updates

```powershell
# Configure Windows Update
Install-Module PSWindowsUpdate -Force
Get-WindowsUpdate
Install-WindowsUpdate -AcceptAll -AutoReboot
```

### Monitor Resource Usage

```powershell
# CPU and Memory usage
Get-Counter '\Processor(_Total)\% Processor Time'
Get-Counter '\Memory\Available MBytes'

# Disk space
Get-PSDrive C
```

### Backup Configuration

Consider backing up these directories:
- `C:\Apps\madrid-parking-api` - Application files
- `C:\actions-runner` - Runner configuration

## Next Steps

1. Set up the runner using the instructions above
2. Make a change to the Madrid API code
3. Push to the `main` branch
4. Watch the automatic deployment in the GitHub Actions tab
5. Verify the API is updated by checking the `/health` endpoint
6. Review the Windows Event Log for application events

## References

- [GitHub Actions Self-Hosted Runner Documentation](https://docs.github.com/en/actions/hosting-your-own-runners)
- [node-windows Documentation](https://github.com/coreybutler/node-windows)
- [Windows Event Logging](https://docs.microsoft.com/en-us/windows/win32/eventlog/event-logging)
