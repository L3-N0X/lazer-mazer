export interface LaserConfig {
  id: string;
  name: string;
  sensitivity: number;
  order: number;
  enabled: boolean;
  sensorIndex: number; // Added sensor index to map laser to specific backend value
}

export interface GameSettings {
  maxAllowedTouches: number;
  reactivateLasers: boolean;
  reactivationTimeSeconds: number;
}

export interface ArduinoSettings {
  port: string;
  baudRate: number;
  isConnected: boolean;
  autoConnectEnabled?: boolean; // New property to track if auto-connect is enabled
}

export interface SoundSettings {
  masterVolume: number;
  effectVolume: number;
  ambientSound: boolean;
  effectsSound: boolean;
}

export interface Highscore {
  id: string;
  name: string;
  time: number; // Time in milliseconds
  date: string; // ISO date string
  touchedLasers: number;
  maxAllowedTouches: number;
  reactivationEnabled: boolean;
  reactivationTimeSeconds: number;
}

export interface LaserConfigState {
  lasers: LaserConfig[];
  gameSettings: GameSettings;
  arduinoSettings: ArduinoSettings;
  soundSettings: SoundSettings;
  highscores: Highscore[];
}

export const defaultLaserConfig: LaserConfigState = {
  lasers: [
    { id: "1", name: "Laser 1", sensitivity: 50, order: 0, enabled: true, sensorIndex: 0 },
    { id: "2", name: "Laser 2", sensitivity: 50, order: 1, enabled: true, sensorIndex: 1 },
    { id: "3", name: "Laser 3", sensitivity: 50, order: 2, enabled: true, sensorIndex: 2 },
  ],
  gameSettings: {
    maxAllowedTouches: 3,
    reactivateLasers: false,
    reactivationTimeSeconds: 5,
  },
  arduinoSettings: {
    port: "",
    baudRate: 115200,
    isConnected: false,
    autoConnectEnabled: false,
  },
  soundSettings: {
    masterVolume: 20,
    effectVolume: 70,
    ambientSound: true,
    effectsSound: true,
  },
  highscores: [],
};
