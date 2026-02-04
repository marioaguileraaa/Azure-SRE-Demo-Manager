# Rollback & HTTPS Configuration Summary

**Date:** February 4, 2026  
**Status:** ✅ Code changes complete - Ready for certificate generation and deployment

## Overview

Completed rollback of Node.js proxy infrastructure and prepared backend APIs for HTTPS with self-signed certificates. All code changes completed; certificate generation is next step.

## Changes Made

### 1. Frontend Bicep Module (`infrastructure/modules/frontend.bicep`)

**Changes:**
- ✅ Removed `appServiceSubnetId` parameter (VNet Integration no longer needed)
- ✅ Removed `vnetConnection` resource (VNet Integration disabled)
- ✅ Changed startup command from `node server.js` to `npx --yes serve -s build -l 8080`
- ✅ Removed `BACKEND_LISBON_URL`, `BACKEND_MADRID_URL`, `BACKEND_PARIS_URL` app settings
- ✅ Removed `PORT` and `PM2_HOME` settings (not needed for serve)
- ✅ Removed `vnetRouteAllEnabled: true` (no longer using VNet Integration)
- ✅ Kept `REACT_APP_*` environment variables for frontend URL configuration

**Result:**
- App Service now serves static React build via `npx serve`
- No Node.js proxy server running
- Frontend can be pure React app without server.js dependency
- App remains HTTPS-accessible via App Service

### 2. Madrid API Server (`backend/madrid-parking-api/server.js`)

**Changes:**
- ✅ Added `https`, `fs`, `path` module imports
- ✅ Added HTTPS certificate configuration with fallback to HTTP
- ✅ Implemented certificate path checking: `madrid.crt` and `madrid.key`
- ✅ Updated server startup to use `https.createServer()` if certificates exist
- ✅ Added fallback to HTTP if certificates don't exist
- ✅ Updated console logging to show protocol (HTTP/HTTPS)
- ✅ Enhanced server shutdown handlers to properly close HTTPS server
- ✅ Updated operation logging to include protocol information

**Environment Variables Supported:**
```
CERT_PATH=./madrid.crt  (default to madrid.crt in app directory)
KEY_PATH=./madrid.key   (default to madrid.key in app directory)
```

**Port:** 3002 (unchanged - works for both HTTP and HTTPS)

### 3. Paris API Server (`backend/paris-parking-api/server.js`)

**Changes:**
- ✅ Added `https`, `fs`, `path` module imports
- ✅ Added HTTPS certificate configuration with fallback to HTTP
- ✅ Implemented certificate path checking: `paris.crt` and `paris.key`
- ✅ Updated server startup to use `https.createServer()` if certificates exist
- ✅ Added fallback to HTTP if certificates don't exist
- ✅ Updated console logging to show protocol (HTTP/HTTPS)
- ✅ Enhanced server shutdown handlers to properly close HTTPS server
- ✅ Updated operation logging to include protocol information

**Environment Variables Supported:**
```
CERT_PATH=./paris.crt   (default to paris.crt in app directory)
KEY_PATH=./paris.key    (default to paris.key in app directory)
```

**Port:** 3003 (unchanged - works for both HTTP and HTTPS)

### 4. Previous Rollback Items (Already Completed)

✅ `frontend/parking-manager/package.json` - Removed express, http-proxy-middleware  
✅ `.github/workflows/deploy-frontend.yml` - Removed proxy server deployment steps  
✅ `frontend/parking-manager/src/services/parkingService.ts` - Updated to use direct HTTPS URLs  

## Architecture After Changes

```
Frontend (HTTPS)
    ↓
App Service (Port 8080 → HTTPS via served app)
    ↓ (Direct HTTPS)
    ├─→ Madrid API (10.0.1.5:3002 HTTPS)
    ├─→ Paris API (10.0.1.6:3003 HTTPS)
    └─→ Lisbon API (Public Container App HTTPS)

Certificate-based authentication:
- Self-signed certificates on Madrid/Paris VMs
- Frontend accepts via NODE_TLS_REJECT_UNAUTHORIZED=0 (dev) or custom fetch agent (prod)
```

## What Still Needs to Be Done

### Phase 1: Certificate Generation (IMMEDIATE)

**On Madrid VM (Windows Server 2022 - 10.0.1.5):**
1. Connect via RDP
2. Generate `madrid.key` and `madrid.crt` using OpenSSL
3. Place in `C:\path\to\backend\madrid-parking-api\`
4. Set environment variables: `CERT_PATH`, `KEY_PATH`
5. Restart Madrid API service

**On Paris VM (Ubuntu 22.04 - 10.0.1.6):**
1. Connect via SSH
2. Generate `paris.key` and `paris.crt` using OpenSSL
3. Place in `/home/azureuser/backend/paris-parking-api/`
4. Set environment variables via `.env` file
5. Restart Paris API service or systemd unit

**Detailed commands provided in:** `HTTPS_SETUP_GUIDE.md`

### Phase 2: Frontend Deployment

1. Commit code changes to Git
2. Push to GitHub
3. GitHub Actions triggers `deploy-frontend` workflow
4. Workflow builds React app and deploys to App Service
5. Set App Service environment variables:
   ```
   REACT_APP_MADRID_API_URL=https://10.0.1.5:3002
   REACT_APP_PARIS_API_URL=https://10.0.1.6:3003
   REACT_APP_LISBON_API_URL=<container-app-url>
   NODE_TLS_REJECT_UNAUTHORIZED=0  (for development, insecure)
   ```
6. Restart App Service to pick up environment changes

### Phase 3: Testing & Validation

1. Test backend APIs directly:
   ```bash
   curl --insecure https://10.0.1.5:3002/api/parking
   curl --insecure https://10.0.1.6:3003/api/parking
   ```

2. Test from App Service:
   - Access frontend URL in browser
   - Check console for any CORS/certificate errors
   - Verify parking data loads from all three cities

3. Monitor logs:
   - App Service deployment logs
   - Madrid API Windows Event Viewer
   - Paris API syslog

### Phase 4: Production Considerations (Future)

- Replace self-signed certificates with CA-signed certificates
- Configure browsers to trust certificates (or use proper CA)
- Implement Node.js https Agent with certificate validation
- Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from production
- Implement certificate rotation and renewal process

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `infrastructure/modules/frontend.bicep` | Removed VNet Integration, proxy settings, updated startup | ✅ Complete |
| `backend/madrid-parking-api/server.js` | Added HTTPS support | ✅ Complete |
| `backend/paris-parking-api/server.js` | Added HTTPS support | ✅ Complete |
| `frontend/parking-manager/package.json` | Already rolled back | ✅ Complete |
| `.github/workflows/deploy-frontend.yml` | Already rolled back | ✅ Complete |
| `frontend/parking-manager/src/services/parkingService.ts` | Already updated | ✅ Complete |

## New Files Created

| File | Purpose |
|------|---------|
| `HTTPS_SETUP_GUIDE.md` | Step-by-step guide for certificate generation and configuration |
| `ROLLBACK_HTTPS_SUMMARY.md` | This file - summary of changes |

## Environment Variables Reference

### Madrid VM
```
PORT=3002
CERT_PATH=C:\path\to\madrid.crt
KEY_PATH=C:\path\to\madrid.key
PARKING_NAME=Madrid Centro Parking
PARKING_CITY=Madrid
PARKING_LOCATION=Plaza Mayor, Madrid
EVENT_LOG_SOURCE=MadridParkingAPI
EVENT_LOG_NAME=Application
NODE_ENV=development
```

### Paris VM
```
PORT=3003
CERT_PATH=/path/to/paris.crt
KEY_PATH=/path/to/paris.key
PARKING_NAME=Paris Centre Parking
PARKING_CITY=Paris
PARKING_LOCATION=Champs-Élysées, Paris
SYSLOG_FACILITY=local0
SYSLOG_TAG=ParisParkingAPI
NODE_ENV=development
```

### App Service (Frontend)
```
REACT_APP_MADRID_API_URL=https://10.0.1.5:3002
REACT_APP_PARIS_API_URL=https://10.0.1.6:3003
REACT_APP_LISBON_API_URL=<container-app-https-url>
NODE_TLS_REJECT_UNAUTHORIZED=0  (development only - INSECURE)
WEBSITES_PORT=8080
```

## Testing Checklist

- [ ] Certificate files generated on Madrid VM
- [ ] Certificate files generated on Paris VM
- [ ] Environment variables set on both VMs
- [ ] Madrid service restarted and running on HTTPS
- [ ] Paris service restarted and running on HTTPS
- [ ] Frontend workflow triggered and deployed
- [ ] App Service environment variables configured
- [ ] Frontend accessible at HTTPS URL
- [ ] Madrid parking data loads in browser
- [ ] Paris parking data loads in browser
- [ ] Console shows no errors or warnings
- [ ] Browser shows no mixed-content warnings

## Rollback Instructions (If Needed)

If issues arise, reverting is straightforward:

1. **To remove HTTPS:**
   - Delete `madrid.crt`, `madrid.key` from Madrid VM
   - Delete `paris.crt`, `paris.key` from Paris VM
   - Services will automatically fall back to HTTP

2. **To restore VNet Integration (if needed):**
   - Uncomment VNet Integration section in `frontend.bicep`
   - Re-add `appServiceSubnetId` parameter
   - Redeploy infrastructure

3. **To restore proxy:**
   - Restore original `package.json` with express, http-proxy-middleware
   - Restore original `server.js` from Git history
   - Restore `deploy-frontend.yml` with proxy copy steps
   - Note: This is NOT recommended; use HTTPS instead

## Success Criteria

✅ All code changes complete  
🟡 Certificate generation pending (next phase)  
🟡 Deployment pending (next phase)  
🟡 End-to-end testing pending (next phase)  

Project is ready for certificate generation and backend HTTPS activation.

