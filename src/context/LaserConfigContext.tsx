import React, { createContext, useContext, useState, useEffect } from "react";
import { Store } from "@tauri-apps/plugin-store";
import {
  LaserConfig,
  LaserConfigState,
  defaultLaserConfig,
  GameSettings,
  ArduinoSettings,
} from "../types/LaserConfig";
import { invoke } from "@tauri-apps/api/core";

interface LaserConfigContextType {
  laserConfig: LaserConfigState;
  updateLaserConfig: (newConfig: LaserConfigState) => Promise<void>;
  updateLaser: (laser: LaserConfig) => Promise<void>;
  updateGameSettings: (settings: GameSettings) => Promise<void>;
  updateArduinoSettings: (settings: ArduinoSettings) => Promise<void>;
  connectArduino: (port: string, baudRate: number) => Promise<void>;
  disconnectArduino: () => Promise<void>;
  addLaser: () => Promise<void>;
  removeLaser: (id: string) => Promise<void>;
  reorderLasers: (reorderedLasers: LaserConfig[]) => Promise<void>;
  isLoading: boolean;
}

const LaserConfigContext = createContext<LaserConfigContextType | undefined>(undefined);

export const useLaserConfig = () => {
  const context = useContext(LaserConfigContext);
  if (!context) {
    throw new Error("useLaserConfig must be used within a LaserConfigProvider");
  }
  return context;
};

export const LaserConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [laserConfig, setLaserConfig] = useState<LaserConfigState>(defaultLaserConfig);
  const [isLoading, setIsLoading] = useState(true);
  const store = Store.get("laser-config.dat");

  // Initialize store
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const store = await Store.load("laser-config.dat");
        // Load the configuration from storage
        const hasConfig = await store.has("laserConfig");

        if (hasConfig) {
          const storedConfig = (await store.get("laserConfig")) as LaserConfigState;
          setLaserConfig(storedConfig);
        } else {
          // If no config is found, save the default config
          await store.set("laserConfig", defaultLaserConfig);
          await store.save();
        }
      } catch (error) {
        console.error("Failed to load laser configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const saveConfig = async (config: LaserConfigState) => {
    try {
      const resolvedStore = await store;
      await resolvedStore?.set("laserConfig", config);
      await resolvedStore?.save();
    } catch (error) {
      console.error("Failed to save laser configuration:", error);
      throw error;
    }
  };

  const updateLaserConfig = async (newConfig: LaserConfigState) => {
    setLaserConfig(newConfig);
    await saveConfig(newConfig);
  };

  const updateLaser = async (updatedLaser: LaserConfig) => {
    const updatedLasers = laserConfig.lasers.map((laser) =>
      laser.id === updatedLaser.id ? updatedLaser : laser
    );

    const newConfig = { ...laserConfig, lasers: updatedLasers };
    setLaserConfig(newConfig);
    await saveConfig(newConfig);
  };

  const updateGameSettings = async (settings: GameSettings) => {
    const newConfig = {
      ...laserConfig,
      gameSettings: settings,
    };
    setLaserConfig(newConfig);
    await saveConfig(newConfig);
  };

  const updateArduinoSettings = async (settings: ArduinoSettings) => {
    const newConfig = {
      ...laserConfig,
      arduinoSettings: settings,
    };
    setLaserConfig(newConfig);
    await saveConfig(newConfig);
  };

  const connectArduino = async (port: string, baudRate: number): Promise<void> => {
    try {
      await invoke("configure_serial", { port, baudRate });

      const newArduinoSettings = {
        ...laserConfig.arduinoSettings,
        port,
        baudRate,
        isConnected: true,
      };

      await updateArduinoSettings(newArduinoSettings);
      return;
    } catch (error) {
      console.error("Failed to connect to Arduino:", error);
      throw error;
    }
  };

  const disconnectArduino = async () => {
    try {
      await invoke("stop_serial");

      const newArduinoSettings = {
        ...laserConfig.arduinoSettings,
        isConnected: false,
      };

      await updateArduinoSettings(newArduinoSettings);
      return;
    } catch (error) {
      console.error("Failed to disconnect from Arduino:", error);
      throw error;
    }
  };

  const addLaser = async () => {
    const newId = `${Date.now()}`;

    // Find the first available sensor index (one that's not already in use)
    const usedIndices = laserConfig.lasers.map((laser) => laser.sensorIndex);
    let newSensorIndex = 0;
    while (usedIndices.includes(newSensorIndex)) {
      newSensorIndex++;
    }

    const newLaser: LaserConfig = {
      id: newId,
      name: `Laser ${laserConfig.lasers.length + 1}`,
      sensitivity: 50,
      order: laserConfig.lasers.length,
      enabled: true,
      sensorIndex: newSensorIndex, // Assign the first unused sensor index
    };

    const newConfig = {
      ...laserConfig,
      lasers: [...laserConfig.lasers, newLaser],
    };

    setLaserConfig(newConfig);
    await saveConfig(newConfig);
  };

  const removeLaser = async (id: string) => {
    const updatedLasers = laserConfig.lasers
      .filter((laser) => laser.id !== id)
      .map((laser, idx) => ({ ...laser, order: idx })); // Only update the display order

    const newConfig = { ...laserConfig, lasers: updatedLasers };
    setLaserConfig(newConfig);
    await saveConfig(newConfig);
  };

  const reorderLasers = async (reorderedLasers: LaserConfig[]) => {
    // Update only the order property based on new array position
    // Keep the sensorIndex property unchanged
    const updatedLasers = reorderedLasers.map((laser, index) => ({
      ...laser,
      order: index, // Only modify the display order
    }));

    const newConfig = { ...laserConfig, lasers: updatedLasers };
    setLaserConfig(newConfig);
    await saveConfig(newConfig);
  };

  return (
    <LaserConfigContext.Provider
      value={{
        laserConfig,
        updateLaserConfig,
        updateLaser,
        updateGameSettings,
        updateArduinoSettings,
        connectArduino,
        disconnectArduino,
        addLaser,
        removeLaser,
        reorderLasers,
        isLoading,
      }}
    >
      {children}
    </LaserConfigContext.Provider>
  );
};
