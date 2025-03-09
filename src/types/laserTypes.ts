export interface LaserType {
  id: string;
  name: string;
  enabled: boolean;
  sensorIndex: number;
  sensitivity: number;
}

export interface LaserConfigType {
  lasers: LaserType[];
}
