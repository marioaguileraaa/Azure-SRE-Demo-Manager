import React, { useEffect, useState } from 'react';
import './App.css';
import parkingService from './services/parkingService';
import { ChaosServiceConfig, ChaosState, ParkingMetrics, ParkingInfo, LevelInfo } from './types';
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
  const [chaosState, setChaosState] = useState<ChaosState | null>(null);
  const [chaosDrafts, setChaosDrafts] = useState<Record<string, ChaosServiceConfig>>({});
  const [chaosError, setChaosError] = useState<string | null>(null);
  const [chaosSavingTarget, setChaosSavingTarget] = useState<string | null>(null);
  const [showChaosBackoffice, setShowChaosBackoffice] = useState(false);

  const chaosFaultTypes = ['latency', 'httpError', 'exception', 'disconnect', 'timeout', 'badPayload', 'httpsError'];

  const loadChaosState = async () => {
    try {
      const state = await parkingService.getChaosState();
      setChaosState(state);
      setChaosDrafts(state.services);
      setChaosError(null);
    } catch (error) {
      setChaosError(error instanceof Error ? error.message : 'Failed to load chaos configuration');
    }
  };

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
    await Promise.all([loadParkingData(), loadChaosState()]);
    setRefreshing(false);
  };

  const handleChaosGlobalToggle = async (enabled: boolean) => {
    try {
      setChaosSavingTarget('global');
      await parkingService.setChaosGlobal(enabled);
      await loadChaosState();
    } catch (error) {
      setChaosError(error instanceof Error ? error.message : 'Failed to update global chaos switch');
    } finally {
      setChaosSavingTarget(null);
    }
  };

  const handleChaosDraftChange = (serviceName: string, patch: Partial<ChaosServiceConfig>) => {
    setChaosDrafts((prev) => ({
      ...prev,
      [serviceName]: {
        ...prev[serviceName],
        ...patch
      }
    }));
  };

  const handleApplyServiceChaos = async (serviceName: string) => {
    try {
      const draft = chaosDrafts[serviceName];
      if (!draft) {
        return;
      }

      setChaosSavingTarget(serviceName);
      await parkingService.updateChaosService(serviceName, draft);
      await loadChaosState();
    } catch (error) {
      setChaosError(error instanceof Error ? error.message : `Failed to update ${serviceName} chaos config`);
    } finally {
      setChaosSavingTarget(null);
    }
  };

  useEffect(() => {
    loadParkingData();
    loadChaosState();
    // Auto-refresh every 3 seconds
    const interval = setInterval(loadParkingData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚗 Parking Manager</h1>
        <p>Manage parking facilities across multiple cities</p>
        <div className="header-actions">
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowChaosBackoffice((prev) => !prev)}
            aria-label={showChaosBackoffice ? 'Show parking dashboard' : 'Show chaos backoffice'}
            title={showChaosBackoffice ? 'Show parking dashboard' : 'Show chaos backoffice'}
          >
            {showChaosBackoffice ? '🏠' : '🧪'}
          </button>
        </div>
      </header>

      <main className="App-main">
        {showChaosBackoffice ? (
          <section className="chaos-panel">
            <div className="chaos-panel-header">
              <h2>🧪 Chaos Backoffice</h2>
              <div className="chaos-global-toggle">
                <label htmlFor="global-chaos">Global Chaos</label>
                <input
                  id="global-chaos"
                  type="checkbox"
                  checked={!!chaosState?.globalEnabled}
                  disabled={chaosSavingTarget === 'global' || !chaosState}
                  onChange={(event) => handleChaosGlobalToggle(event.target.checked)}
                />
              </div>
            </div>

            {chaosError && <p className="chaos-error">{chaosError}</p>}

            <div className="chaos-grid">
              {Object.entries(chaosDrafts).map(([serviceName, config]) => (
                <div className="chaos-card" key={serviceName}>
                  <h3>{serviceName.toUpperCase()}</h3>

                  <label>
                    <span>Enabled</span>
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(event) => handleChaosDraftChange(serviceName, { enabled: event.target.checked })}
                    />
                  </label>

                  <label>
                    <span>Fault Type</span>
                    <select
                      value={config.faultType}
                      onChange={(event) => handleChaosDraftChange(serviceName, { faultType: event.target.value as ChaosServiceConfig['faultType'] })}
                    >
                      {chaosFaultTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Probability (0-1)</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={config.probability}
                      onChange={(event) => handleChaosDraftChange(serviceName, { probability: Number(event.target.value) })}
                    />
                  </label>

                  <label>
                    <span>Delay (ms)</span>
                    <input
                      type="number"
                      min={0}
                      value={config.delayMs}
                      onChange={(event) => handleChaosDraftChange(serviceName, { delayMs: Number(event.target.value) })}
                    />
                  </label>

                  <label>
                    <span>Status Code</span>
                    <input
                      type="number"
                      min={400}
                      max={599}
                      value={config.statusCode}
                      onChange={(event) => handleChaosDraftChange(serviceName, { statusCode: Number(event.target.value) })}
                    />
                  </label>

                  <label>
                    <span>HTTP Method</span>
                    <select
                      value={config.method}
                      onChange={(event) => handleChaosDraftChange(serviceName, { method: event.target.value })}
                    >
                      <option value="*">*</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </label>

                  <label>
                    <span>Path Prefix</span>
                    <input
                      type="text"
                      value={config.pathPattern}
                      onChange={(event) => handleChaosDraftChange(serviceName, { pathPattern: event.target.value })}
                    />
                  </label>

                  <label>
                    <span>Error Message</span>
                    <input
                      type="text"
                      value={config.errorMessage}
                      onChange={(event) => handleChaosDraftChange(serviceName, { errorMessage: event.target.value })}
                    />
                  </label>

                  <button
                    className="refresh-btn"
                    disabled={chaosSavingTarget === serviceName}
                    onClick={() => handleApplyServiceChaos(serviceName)}
                  >
                    {chaosSavingTarget === serviceName ? 'Saving...' : 'Apply'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
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
          </>
        )}
      </main>

      {selectedParking && (
        <ParkingDetails
          city={selectedParking.city}
          levels={levels}
          onClose={() => setSelectedParking(null)}
          onUpdateLevel={handleUpdateLevel}
          onRefresh={() => loadLevels(selectedParking.apiUrl)}
        />
      )}

      <footer className="App-footer">
        <p>Azure SRE Demo - Parking Manager © 2026</p>
      </footer>
    </div>
  );
}

export default App;

