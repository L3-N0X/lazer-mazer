import React, { createContext, useContext, useState, useEffect } from "react";
import { Store } from "@tauri-apps/plugin-store";
import {
  LaserConfig,
  LaserConfigState,
  defaultLaserConfig,
  GameSettings,
} from "../types/LaserConfig";

interface LaserConfigContextType {
  laserConfig: LaserConfigState;
  updateLaserConfig: (newConfig: LaserConfigState) => Promise<void>;
  updateLaser: (laser: LaserConfig) => Promise<void>;
  updateGameSettings: (settings: GameSettings) => Promise<void>;
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

  const addLaser = async () => {
    const newId = `${Date.now()}`;
    const newLaser: LaserConfig = {
      id: newId,
      name: `Laser ${laserConfig.lasers.length + 1}`,
      sensitivity: 50,
      order: laserConfig.lasers.length,
      enabled: true,
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
      .map((laser, idx) => ({ ...laser, order: idx }));

    const newConfig = { ...laserConfig, lasers: updatedLasers };
    setLaserConfig(newConfig);
    await saveConfig(newConfig);
  };

  const reorderLasers = async (reorderedLasers: LaserConfig[]) => {
    // Update order property based on new array position
    const updatedLasers = reorderedLasers.map((laser, index) => ({
      ...laser,
      order: index,
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
