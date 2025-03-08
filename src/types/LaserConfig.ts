export interface LaserConfig {
  id: string;
  name: string;
  sensitivity: number; // 0-100
  order: number;
  enabled: boolean;
}

export interface GameSettings {
  maxAllowedTouches: number;
  reactivateLasers: boolean;
  reactivationTimeSeconds: number;
}

export interface LaserConfigState {
  lasers: LaserConfig[];
  gameSettings: GameSettings;
}

export const defaultLaserConfig: LaserConfigState = {
  lasers: [
    { id: "1", name: "Laser 1", sensitivity: 50, order: 0, enabled: true },
    { id: "2", name: "Laser 2", sensitivity: 50, order: 1, enabled: true },
    { id: "3", name: "Laser 3", sensitivity: 50, order: 2, enabled: true },
  ],
  gameSettings: {
    maxAllowedTouches: 3,
    reactivateLasers: false,
    reactivationTimeSeconds: 5,
  },
};
