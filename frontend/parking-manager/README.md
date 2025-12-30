# Parking Manager Frontend

React-based frontend application for managing multiple parking facilities across different cities. Designed to run on Azure Web App.

## Features

- **Multi-City Management**: View and manage parking facilities across multiple cities
- **Real-Time Updates**: Auto-refresh every 30 seconds
- **Interactive Dashboard**: View occupancy rates, available slots, and facility information
- **Level Management**: Update availability for individual parking levels
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

This frontend connects to multiple city-specific parking APIs:
- Each API represents a single parking location (e.g., Lisbon, Porto)
- The frontend aggregates data from all configured APIs
- Each city's API can be running in a separate container

## Setup for Local Development

### Prerequisites

- Node.js 16+ 
- Running parking API instances

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your API URLs
```

### Environment Variables

Configure the parking API URLs in `.env`:

```bash
REACT_APP_LISBON_API_URL=http://localhost:3001
# Add more cities as needed
```

### Running Locally

```bash
# Development mode
npm start

# Production build
npm run build

# Run tests
npm test
```

The app will open at http://localhost:3000

## Azure Web App Deployment

### Method 1: Direct Deployment from Build

```bash
# Build the production version
npm run build

# Deploy the 'build' folder to Azure Web App
# Via Azure Portal, Azure CLI, or GitHub Actions
```

### Method 2: Azure Web App Deployment Center

1. In Azure Portal, go to your Web App
2. Navigate to Deployment Center
3. Connect your GitHub repository
4. Configure build settings:
   - **Build Provider**: Azure Pipelines or GitHub Actions
   - **Framework**: React
   - **App location**: `/frontend/parking-manager`
   - **Build location**: `build`

### Environment Variables in Azure

Configure Application Settings in Azure Web App:

```
REACT_APP_LISBON_API_URL=https://your-lisbon-api.azurewebsites.net
```

### Deployment Script

Create `.github/workflows/azure-web-app.yml` for automated deployment:

```yaml
name: Deploy to Azure Web App

on:
  push:
    branches: [ main ]
    paths:
      - 'frontend/parking-manager/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install and Build
      working-directory: ./frontend/parking-manager
      run: |
        npm ci
        npm run build
    
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'your-app-name'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: ./frontend/parking-manager/build
```

## Adding New Cities

To add a new city parking API:

1. Deploy a new parking API instance for the city
2. Update `src/services/parkingService.ts`:

```typescript
private apis: ParkingAPI[] = [
  {
    id: 'lisbon',
    city: 'Lisbon',
    apiUrl: process.env.REACT_APP_LISBON_API_URL || 'http://localhost:3001',
    enabled: true
  },
  {
    id: 'porto',
    city: 'Porto',
    apiUrl: process.env.REACT_APP_PORTO_API_URL || 'http://localhost:3002',
    enabled: true
  }
];
```

3. Add the environment variable to `.env`
4. Rebuild and redeploy

## Project Structure

```
src/
├── components/         # React components
│   ├── ParkingCard.tsx        # Card for each parking facility
│   ├── ParkingDetails.tsx     # Detailed level view modal
│   └── *.css                  # Component styles
├── services/          # API services
│   └── parkingService.ts      # Parking API client
├── types.ts           # TypeScript interfaces
├── App.tsx            # Main application component
└── index.tsx          # Application entry point
```

## API Integration

The frontend expects each parking API to expose:

- `GET /api/parking` - Full parking information
- `GET /api/parking/metrics` - Metrics summary
- `GET /api/parking/levels` - All levels information
- `PATCH /api/parking/levels/:levelNumber` - Update level availability
- `PUT /api/parking/config` - Update parking configuration

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

ISC
