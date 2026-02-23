# Azure SRE Demo Manager

A demonstration project showcasing a multi-city parking management system with Azure integration, containerized services, and modern web technologies.

## Overview

This project implements a **Parking Manager** application that manages parking facilities across multiple cities. Each city has its own containerized API service, and a centralized React frontend (running on Azure Web App) provides a unified management interface.

## Architecture

```
┌─────────────────────────────────────────┐
│     Azure Web App (Frontend)            │
│     React - Parking Manager UI          │
└──────────────┬──────────────────────────┘
               │
               │ REST API Calls
               │
    ┌──────────┼──────────┐
    │          │          │          
    ▼          ▼          ▼          
┌────────┐ ┌────────┐ ┌────────┐    
│ Lisbon │ │ Madrid │ │ Paris  │    
│ API    │ │ API    │ │ API    │    
│(Docker)│ │(Windows│ │(Linux  │    
│        │ │ VM)    │ │ VM)    │    
│        │ │        │ │        │   
└───┬────┘ └───┬────┘ └───┬────┘    
    │          │          │         
    ▼          ▼          ▼          
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Azure   │ │ Windows │ │ Syslog  │
│   Log   │ │  Event  │ │ (Linux) │
│Analytics│ │ Viewer  │ │         │
└─────────┘ └─────────┘ └─────────┘
```

## Project Structure

```
Azure-SRE-Demo-Manager/
├── infrastructure/              # Bicep templates for Azure deployment
│   ├── modules/                # Modular Bicep templates
│   │   ├── hub.bicep           # Hub VNet and Log Analytics
│   │   ├── frontend.bicep      # React frontend App Service
│   │   ├── lisbon-api.bicep    # Container App for Lisbon API
│   │   ├── berlin-api.bicep    # Container App for Berlin API
│   │   ├── madrid-api.bicep    # Windows VM for Madrid API
│   │   └── paris-api.bicep     # Ubuntu VM for Paris API
│   ├── main.bicep              # Main orchestration template
│   ├── deploy.sh               # Automated deployment script
│   └── README.md               # Deployment documentation
├── backend/
│   ├── lisbon-parking-api/       # Lisbon parking API (Docker + Azure Log Analytics)
│   │   ├── server.js             # Express server
│   │   ├── azureLogger.js        # Azure Log Analytics integration
│   │   ├── Dockerfile            # Container configuration
│   │   └── README.md
│   ├── berlin-parking-api/       # Berlin parking API (Docker + OpenTelemetry)
│   │   ├── server.js             # Express server
│   │   ├── metricsTracker.js     # OpenTelemetry metrics tracker
│   │   ├── Dockerfile            # Container configuration
│   │   └── README.md
│   ├── madrid-parking-api/       # Madrid parking API (Windows Server + Event Viewer)
│   │   ├── server.js             # Express server
│   │   ├── windowsEventLogger.js # Windows Event Viewer integration
│   │   ├── install-event-source.js # Event Source installer
│   │   └── README.md
│   ├── paris-parking-api/        # Paris parking API (Linux + Syslog)
│   │   ├── server.js             # Express server
│   │   ├── syslogLogger.js       # Syslog integration
│   │   └── README.md
│   └── [other city APIs...]      # Future city APIs
│
├── frontend/
│   └── parking-manager/          # React frontend (Azure Web App)
│       ├── src/
│       │   ├── components/       # React components
│       │   ├── services/         # API services
│       │   └── types.ts          # TypeScript definitions
│       └── README.md
│
└── README.md                     # This file
```

## Features

### Backend APIs (City-Specific)
- **Lisbon API**: Containerized NodeJS with Azure Log Analytics integration
- **Madrid API**: NodeJS for Windows Server with Windows Event Viewer logging
- **Paris API**: NodeJS for Linux with Syslog logging
- **Berlin API**: Containerized NodeJS with OpenTelemetry metrics (no Azure Log Analytics)
- **RESTful API Design** - Standard HTTP methods for all operations
- **Real-time Parking Data** - Track availability across multiple levels
- **Metrics & Statistics** - Occupancy rates, available slots, facilities
- **Flexible Logging** - Azure Log Analytics, Windows Event Viewer, Syslog, or OpenTelemetry based on deployment

### Frontend (Parking Manager)
- **Multi-City Dashboard** - Manage multiple parking facilities from one interface
- **Real-Time Updates** - Auto-refresh every 30 seconds
- **Interactive Level Management** - Update availability per parking level
- **Responsive Design** - Works on desktop and mobile
- **Azure Web App Ready** - Optimized for deployment

### Monitored Metrics Per Parking
- Number of levels
- Parking slots per level  
- Available slots per level
- Working hours
- Available WC facilities
- Available electric chargers
- Real-time occupancy rates

## Quick Start

### One-command local chaos stack (recommended)

Starts: `chaos-control`, Lisbon, Madrid, Paris, Berlin APIs, and frontend proxy server.

```bash
./scripts/start-chaos-stack.sh
```

Then open `http://localhost:8080` and use the **Chaos Backoffice** panel.
Press `Ctrl+C` in the terminal running the script to stop everything.

### Prerequisites
- **Node.js 18+**
- **Docker** (for containerized APIs like Lisbon)
- **Windows Server** (optional, for Madrid API with Event Viewer)
- **Linux** (optional, for Paris API with Syslog)
- **Azure Account** (optional, for Log Analytics)

### 1. Start the Lisbon Parking API (Linux/Docker)

```bash
cd backend/lisbon-parking-api

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
# Edit .env with your Azure Log Analytics credentials

# Start the API
npm start
```

The API will run on `http://localhost:3001`

### 2. Start the Madrid Parking API (Windows Server)

```bash
cd backend/madrid-parking-api

# Install dependencies
npm install

# Configure environment (optional)
copy .env.example .env
# Edit .env with your configuration

# Register Windows Event Source (Run as Administrator)
npm run install-windows

# Start the API
npm start
```

The API will run on `http://localhost:3002`

> **Note**: Madrid API uses Windows Event Viewer for logging. On non-Windows systems, it falls back to console logging.

### 3. Start the Paris Parking API (Linux)

```bash
cd backend/paris-parking-api

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
# Edit .env with your syslog configuration

# Start the API
npm start
```

The API will run on `http://localhost:3003`

> **Note**: Paris API uses Syslog for logging on Linux. On non-Linux systems, it falls back to console logging.

### 4. Start the Berlin Parking API (Docker/Linux)

```bash
cd backend/berlin-parking-api

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
# Edit .env with your configuration

# Start the API
npm start
```

The API will run on `http://localhost:3004`

> **Note**: Berlin API uses console logging only and exposes metrics in OpenTelemetry format at `/metrics/opentelemetry`. No Azure Log Analytics integration.

### 5. Start the Frontend

```bash
cd frontend/parking-manager

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with API URLs

# Start the development server
npm start
```

The frontend will open at `http://localhost:3000`

## Docker Deployment

### Build and Run Lisbon API Container

```bash
cd backend/lisbon-parking-api

# Build the image
docker build -t lisbon-parking-api .

# Run the container
docker run -p 3001:3001 \
  -e WORKSPACE_ID=your-workspace-id \
  -e SHARED_KEY=your-shared-key \
  -e PARKING_CITY="Lisbon" \
  lisbon-parking-api
```

## Azure Deployment

### Infrastructure as Code with Bicep

This project includes comprehensive Bicep templates to deploy the complete infrastructure to Azure. The infrastructure is optimized for cost efficiency and follows Azure best practices.

#### Quick Deploy

```bash
cd infrastructure
./deploy.sh
```

The deployment script will guide you through the setup and deploy:
- **Hub Resource Group**: VNet and Log Analytics Workspace
- **Frontend**: React app on Azure App Service (Basic B1 tier)
- **Lisbon API**: Container App with Docker
- **Madrid API**: Windows Server 2022 VM (Standard_B2s)
- **Paris API**: Ubuntu Server 22.04 VM (Standard_B2s)

**Estimated Monthly Cost**: ~$120-150

For detailed instructions, see [infrastructure/README.md](infrastructure/README.md)

#### Manual Deployment

```bash
az deployment sub create \
  --location westeurope \
  --template-file infrastructure/main.bicep \
  --parameters infrastructure/main.parameters.example.json \
  --parameters adminPassword='YourSecurePassword123!'
```

### Manual Azure Deployment (Alternative)

If you prefer to deploy manually without using the Bicep templates:

#### Backend API (Azure Container Instances or AKS)

Deploy each city's API as a separate container:

```bash
# Example for Azure Container Instances
az container create \
  --resource-group parking-rg \
  --name lisbon-parking-api \
  --image lisbon-parking-api \
  --dns-name-label lisbon-parking \
  --ports 3001 \
  --environment-variables \
    WORKSPACE_ID=<your-workspace-id> \
    SHARED_KEY=<your-shared-key>
```

#### Frontend (Azure Web App)

The frontend is designed to run on Azure Web App:

1. Build the production version:
```bash
cd frontend/parking-manager
npm run build
```

2. Deploy to Azure Web App via:
   - Azure Portal Deployment Center
   - GitHub Actions
   - Azure CLI

Configure Application Settings in Azure:
```
REACT_APP_LISBON_API_URL=https://lisbon-parking.azurewebsites.net
```

## Adding New Cities

To add a new city parking API:

1. **Copy the Lisbon API folder:**
```bash
cp -r backend/lisbon-parking-api backend/porto-parking-api
```

2. **Update configuration:**
   - Change `PARKING_CITY` in `.env.example`
   - Update `PARKING_NAME` and `PARKING_LOCATION`
   - Change `LOG_TYPE` to `PortoParkingLogs`

3. **Update the frontend:**
   - Add the new API to `src/services/parkingService.ts`
   - Add environment variable to `.env`

4. **Deploy:**
   - Build and deploy the new API container
   - Rebuild and redeploy the frontend

## API Documentation

Each parking API exposes the following endpoints:

### GET `/health`
Health check endpoint

### GET `/api/parking`
Get complete parking information

### GET `/api/parking/metrics`
Get parking metrics summary

### GET `/api/parking/levels`
Get all levels information

### GET `/api/parking/levels/:levelNumber`
Get specific level information

### PATCH `/api/parking/levels/:levelNumber`
Update available slots for a level

**Body:**
```json
{
  "availableSlots": 50
}
```

### PUT `/api/parking/config`
Update parking configuration

**Body:**
```json
{
  "workingHours": {
    "open": "06:00",
    "close": "22:00"
  },
  "availableWC": 4,
  "availableElectricChargers": 25
}
```

## Azure Log Analytics

Each API sends structured logs to Azure Log Analytics:

- Request logging (method, path, timestamp, city)
- Operation logging (level updates, config changes)
- Error tracking
- Server lifecycle events

Query logs in Azure:

```kusto
LisbonParkingLogs_CL
| where TimeGenerated > ago(1h)
| where level_s == "ERROR"
| project TimeGenerated, operation_s, details_s
```

## Development

### Backend Development
```bash
cd backend/lisbon-parking-api
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend/parking-manager
npm start    # Hot reload enabled
```

### Testing
```bash
# Backend
cd backend/lisbon-parking-api
npm test

# Frontend
cd frontend/parking-manager
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- [ ] Database integration (Azure Cosmos DB / PostgreSQL)
- [ ] Authentication and authorization
- [ ] Real-time WebSocket updates
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Booking/reservation system
- [ ] Payment integration
- [ ] IoT sensor integration

## License

ISC

## Support

For issues and questions, please open an issue in the GitHub repository.
