# Paris API Setup Instructions

## Current Status

The Paris API code is correctly structured and matches the working Madrid API implementation. The certificates have been generated successfully, but they need to be moved to the correct location.

## Issue Identified

The certificates were generated in `/home/azureadmin/tmp` but the API server expects them in the Paris API directory (typically `/home/azureadmin/paris-parking-api` or similar).

## Steps to Fix

### 1. Locate or Create the Paris API Directory on the VM

```bash
# SSH into the Paris VM
ssh azureadmin@<paris-vm-ip>

# Create the API directory if it doesn't exist
sudo mkdir -p /home/azureadmin/paris-parking-api
cd /home/azureadmin/paris-parking-api
```

### 2. Copy the Generated Certificates

```bash
# Copy certificates from tmp to the API directory
cp /home/azureadmin/tmp/paris.crt /home/azureadmin/paris-parking-api/
cp /home/azureadmin/tmp/paris.key /home/azureadmin/paris-parking-api/

# Set proper permissions
chmod 600 /home/azureadmin/paris-parking-api/paris.key
chmod 644 /home/azureadmin/paris-parking-api/paris.crt
```

### 3. Create the .env File

```bash
# Navigate to the Paris API directory
cd /home/azureadmin/paris-parking-api

# Create .env file with proper configuration
cat > .env << 'EOF'
# Paris Parking API Configuration
PORT=3003
NODE_ENV=production

# HTTPS Certificate Paths
CERT_PATH=/home/azureadmin/paris-parking-api/paris.crt
KEY_PATH=/home/azureadmin/paris-parking-api/paris.key

# Parking Configuration
PARKING_NAME=Paris Centre Parking
PARKING_CITY=Paris
PARKING_LOCATION=Champs-Élysées, Paris

# Syslog Configuration
SYSLOG_FACILITY=local0
SYSLOG_TAG=ParisParkingAPI
EOF
```

### 4. Deploy the Application Code

You'll need to deploy the Paris API code to the VM. Options:

#### Option A: Copy files directly

```bash
# From your local machine, copy the backend files
scp -r backend/paris-parking-api/* azureadmin@<paris-vm-ip>:/home/azureadmin/paris-parking-api/
```

#### Option B: Use Git

```bash
# On the Paris VM
cd /home/azureadmin/paris-parking-api
git clone <your-repo-url> .
# Or pull latest changes if already cloned
git pull origin main
```

### 5. Install Dependencies

```bash
cd /home/azureadmin/paris-parking-api
npm install
```

### 6. Test the API Manually

```bash
# Start the API manually to test
node server.js
```

Expected output:
```
🚗 Paris Parking API running on HTTPS port 3003
📍 Location: Champs-Élysées, Paris
🔒 Using HTTPS with self-signed certificate
🐧 Platform: linux
📝 Syslog: Enabled
```

### 7. Test the Endpoints

In a new terminal on the VM:

```bash
# Test health endpoint
curl --insecure https://localhost:3003/health

# Test parking data
curl --insecure https://localhost:3003/api/parking

# Test from external machine (replace with VM's public IP)
curl --insecure https://<paris-vm-public-ip>:3003/health
```

### 8. Set Up as a Systemd Service (Recommended)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/paris-parking-api.service
```

Add the following content:

```ini
[Unit]
Description=Paris Parking API Service
After=network.target

[Service]
Type=simple
User=azureadmin
WorkingDirectory=/home/azureadmin/paris-parking-api
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=paris-parking-api
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable paris-parking-api

# Start the service
sudo systemctl start paris-parking-api

# Check status
sudo systemctl status paris-parking-api

# View logs
sudo journalctl -u paris-parking-api -f
```

### 9. Verify Syslog Integration

```bash
# Check syslog for Paris API entries
sudo tail -f /var/log/syslog | grep ParisParkingAPI

# Or check journalctl
sudo journalctl -t ParisParkingAPI -f
```

### 10. Configure Firewall (if needed)

```bash
# Allow port 3003 through firewall
sudo ufw allow 3003/tcp

# Check firewall status
sudo ufw status
```

## Troubleshooting

### Issue: "Cannot find module 'posix'"

```bash
cd /home/azureadmin/paris-parking-api
npm install posix
```

### Issue: "EACCES: permission denied"

```bash
# Fix file permissions
sudo chown -R azureadmin:azureadmin /home/azureadmin/paris-parking-api
chmod 600 /home/azureadmin/paris-parking-api/paris.key
chmod 644 /home/azureadmin/paris-parking-api/paris.crt
```

### Issue: "Port 3003 already in use"

```bash
# Find and kill the process using port 3003
sudo lsof -i :3003
sudo kill -9 <PID>
```

### Issue: Syslog not working

```bash
# Verify posix module is installed
npm list posix

# Check syslog service is running
sudo systemctl status rsyslog
```

## Quick Command Reference

```bash
# Start service
sudo systemctl start paris-parking-api

# Stop service
sudo systemctl stop paris-parking-api

# Restart service
sudo systemctl restart paris-parking-api

# View status
sudo systemctl status paris-parking-api

# View logs
sudo journalctl -u paris-parking-api -f

# View syslog entries
sudo tail -f /var/log/syslog | grep ParisParkingAPI
```

## Verification Checklist

- [ ] Certificates exist in `/home/azureadmin/paris-parking-api/`
- [ ] `.env` file exists with correct paths
- [ ] Dependencies installed (`node_modules` directory exists)
- [ ] API starts without errors
- [ ] Health endpoint responds: `https://localhost:3003/health`
- [ ] Parking endpoint responds: `https://localhost:3003/api/parking`
- [ ] Syslog entries appear in `/var/log/syslog`
- [ ] Service configured to start on boot
- [ ] Firewall allows port 3003

## Next Steps

Once the Paris API is running:

1. Update the frontend configuration to point to the Paris API endpoint
2. Test all API endpoints from the frontend
3. Monitor syslog for any errors or warnings
4. Set up monitoring and alerting as needed
