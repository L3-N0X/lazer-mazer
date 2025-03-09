import { LaserConfigType } from "../types/laserTypes";

// Map raw sensor value (0-1023) to color scale
export const getColorForValue = (value: number): string => {
  const normalized = Math.min(1, Math.max(0, value / 1023));

  // Generate colors from green (low) to red (high)
  const r = Math.floor(normalized * 255);
  const g = Math.floor((1 - normalized) * 255);
  const b = 0;

  return `rgb(${r}, ${g}, ${b})`;
};

// Find which sensors are used by configured lasers
export const getUsedSensors = (laserConfig: LaserConfigType) => {
  const usedSensors = new Set<number>();
  laserConfig.lasers.forEach((laser) => {
    usedSensors.add(laser.sensorIndex);
  });
  return usedSensors;
};
