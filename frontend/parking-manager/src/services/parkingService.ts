import { ParkingAPI, ParkingInfo, ParkingMetrics, LevelInfo } from '../types';

class ParkingService {
  private apis: ParkingAPI[] = [];
  private configLoaded = false;

  async initialize(): Promise<void> {
    if (this.configLoaded) return;

    this.apis = [
      {
        id: 'lisbon',
        city: 'Lisbon',
        apiUrl: '/api/lisbon',
        enabled: true
      },
      {
        id: 'madrid',
        city: 'Madrid',
        apiUrl: '/api/madrid',
        enabled: true
      },
      {
        id: 'paris',
        city: 'Paris',
        apiUrl: '/api/paris',
        enabled: true
      }
    ];

    this.configLoaded = true;
  }

  getConfiguredAPIs(): ParkingAPI[] {
    return this.apis.filter(api => api.enabled);
  }

  async getParkingInfo(apiUrl: string): Promise<ParkingInfo> {
    await this.initialize();
    const response = await fetch(`${apiUrl}/parking`);
    if (!response.ok) {
      throw new Error(`Failed to fetch parking info from ${apiUrl}`);
    }
    const data = await response.json();
    return data.data;
  }

  async getParkingMetrics(apiUrl: string): Promise<ParkingMetrics> {
    await this.initialize();
    const response = await fetch(`${apiUrl}/parking/metrics`);
    if (!response.ok) {
      throw new Error(`Failed to fetch parking metrics from ${apiUrl}`);
    }
    const data = await response.json();
    return data.data;
  }

  async getLevels(apiUrl: string): Promise<LevelInfo[]> {
    await this.initialize();
    const response = await fetch(`${apiUrl}/parking/levels`);
    if (!response.ok) {
      throw new Error(`Failed to fetch levels from ${apiUrl}`);
    }
    const data = await response.json();
    return data.data;
  }

  async updateLevelSlots(apiUrl: string, levelNumber: number, availableSlots: number): Promise<ParkingInfo> {
    await this.initialize();
    const response = await fetch(`${apiUrl}/parking/levels/${levelNumber}`, {
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
    await this.initialize();
    const response = await fetch(`${apiUrl}/parking/config`, {
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
