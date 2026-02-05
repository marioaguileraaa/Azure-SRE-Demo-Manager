import React, { useEffect, useState } from 'react';
import './App.css';
import parkingService from './services/parkingService';
import { ParkingMetrics, ParkingInfo, LevelInfo } from './types';
import ParkingCard from './components/ParkingCard';
import ParkingDetails from './components/ParkingDetails';

interface ParkingData {
  apiUrl: string;
  city: string;
  metrics: ParkingMetrics | null;
  info: ParkingInfo | null;
  error: string | null;
  loading: boolean;
}

function App() {
  const [parkingData, setParkingData] = useState<ParkingData[]>([]);
  const [selectedParking, setSelectedParking] = useState<{ apiUrl: string; city: string } | null>(null);
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadParkingData = async () => {
    const apis = await parkingService.getConfiguredAPIs();
    const dataPromises = apis.map(async (api) => {
      try {
        const [metrics, info] = await Promise.all([
          parkingService.getParkingMetrics(api.apiUrl),
          parkingService.getParkingInfo(api.apiUrl)
        ]);
        return {
          apiUrl: api.apiUrl,
          city: api.city,
          metrics,
          info,
          error: null,
          loading: false
        };
      } catch (error) {
        return {
          apiUrl: api.apiUrl,
          city: api.city,
          metrics: null,
          info: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false
        };
      }
    });

    const data = await Promise.all(dataPromises);
    setParkingData(data);
  };

  const loadLevels = async (apiUrl: string) => {
    try {
      const levelsData = await parkingService.getLevels(apiUrl);
      setLevels(levelsData);
    } catch (error) {
      console.error('Error loading levels:', error);
      alert('Failed to load level details');
    }
  };

  const handleViewDetails = async (apiUrl: string, city: string) => {
    setSelectedParking({ apiUrl, city });
    await loadLevels(apiUrl);
  };

  const handleUpdateLevel = async (levelNumber: number, availableSlots: number) => {
    if (!selectedParking) return;

    try {
      await parkingService.updateLevelSlots(selectedParking.apiUrl, levelNumber, availableSlots);
      await loadLevels(selectedParking.apiUrl);
      await loadParkingData(); // Refresh main data
    } catch (error) {
      console.error('Error updating level:', error);
      alert('Failed to update level availability');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadParkingData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadParkingData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadParkingData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚗 Parking Manager</h1>
        <p>Manage parking facilities across multiple cities</p>
        <button 
          className="refresh-btn" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </header>

      <main className="App-main">
        {parkingData.length === 0 && (
          <div className="loading-state">
            <p>Loading parking data...</p>
          </div>
        )}

        <div className="parking-grid">
          {parkingData.map((data) => (
            <div key={data.city}>
              {data.error ? (
                <div className="error-card">
                  <h3>❌ {data.city}</h3>
                  <p>Failed to load data</p>
                  <small>{data.error}</small>
                </div>
              ) : data.metrics && data.info ? (
                <ParkingCard
                  metrics={data.metrics}
                  parkingInfo={{ name: data.info.name, location: data.info.location }}
                  onViewDetails={() => handleViewDetails(data.apiUrl, data.city)}
                />
              ) : (
                <div className="loading-card">
                  <p>Loading {data.city}...</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {parkingData.every(d => d.error) && parkingData.length > 0 && (
          <div className="no-data-message">
            <h2>⚠️ No parking data available</h2>
            <p>Make sure the parking APIs are running and accessible.</p>
            <p>Check the console for more details.</p>
          </div>
        )}
      </main>

      {selectedParking && (
        <ParkingDetails
          city={selectedParking.city}
          levels={levels}
          onClose={() => setSelectedParking(null)}
          onUpdateLevel={handleUpdateLevel}
        />
      )}

      <footer className="App-footer">
        <p>Azure SRE Demo - Parking Manager © 2025</p>
      </footer>
    </div>
  );
}

export default App;

