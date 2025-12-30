export interface ParkingAPI {
  id: string;
  city: string;
  apiUrl: string;
  enabled: boolean;
}

export interface ParkingInfo {
  id: string;
  name: string;
  city: string;
  location: string;
  numberOfLevels: number;
  parkingSlotsPerLevel: number;
  availableSlotsPerLevel: number[];
  workingHours: {
    open: string;
    close: string;
  };
  availableWC: number;
  availableElectricChargers: number;
  lastUpdated: string;
}

export interface ParkingMetrics {
  city: string;
  totalSlots: number;
  totalAvailable: number;
  totalOccupied: number;
  occupancyRate: number;
  numberOfLevels: number;
  availableWC: number;
  availableElectricChargers: number;
  workingHours: {
    open: string;
    close: string;
  };
  lastUpdated: string;
}

export interface LevelInfo {
  level: number;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  occupancyRate: string;
}
