import { ParkingAPI, ParkingInfo, ParkingMetrics, LevelInfo } from '../types';

class ParkingService {
  private apis: ParkingAPI[] = [
    {
      id: 'lisbon',
      city: 'Lisbon',
      apiUrl: process.env.REACT_APP_LISBON_API_URL || 'http://localhost:3001',
      enabled: true
    },
    {
      id: 'madrid',
      city: 'Madrid',
      apiUrl: process.env.REACT_APP_MADRID_API_URL || 'http://localhost:3002',
      enabled: true
    },
    {
      id: 'paris',
      city: 'Paris',
      apiUrl: process.env.REACT_APP_PARIS_API_URL || 'http://localhost:3003',
      enabled: true
    }
  ];

  getConfiguredAPIs(): ParkingAPI[] {
    return this.apis.filter(api => api.enabled);
  }

  async getParkingInfo(apiUrl: string): Promise<ParkingInfo> {
    const response = await fetch(`${apiUrl}/api/parking`);
    if (!response.ok) {
      throw new Error(`Failed to fetch parking info from ${apiUrl}`);
    }
    const data = await response.json();
    return data.data;
  }

  async getParkingMetrics(apiUrl: string): Promise<ParkingMetrics> {
    const response = await fetch(`${apiUrl}/api/parking/metrics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch parking metrics from ${apiUrl}`);
    }
    const data = await response.json();
    return data.data;
  }

  async getLevels(apiUrl: string): Promise<LevelInfo[]> {
    const response = await fetch(`${apiUrl}/api/parking/levels`);
    if (!response.ok) {
      throw new Error(`Failed to fetch levels from ${apiUrl}`);
    }
    const data = await response.json();
    return data.data;
  }

  async updateLevelSlots(apiUrl: string, levelNumber: number, availableSlots: number): Promise<ParkingInfo> {
    const response = await fetch(`${apiUrl}/api/parking/levels/${levelNumber}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ availableSlots }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update level slots in ${apiUrl}`);
    }
    const data = await response.json();
    return data.data;
  }

  async updateParkingConfig(apiUrl: string, config: Partial<Pick<ParkingInfo, 'workingHours' | 'availableWC' | 'availableElectricChargers'>>): Promise<ParkingInfo> {
    const response = await fetch(`${apiUrl}/api/parking/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error(`Failed to update parking config in ${apiUrl}`);
    }
    const data = await response.json();
    return data.data;
  }
}

const parkingService = new ParkingService();
export default parkingService;
