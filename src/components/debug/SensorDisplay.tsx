import React from "react";
import { Box, Typography, Paper, Divider, Chip } from "@mui/material";
import { LaserConfigType } from "../../types/laserTypes";
import { getColorForValue, getUsedSensors } from "../../utils/debugUtils";

interface SensorDisplayProps {
  serialData: number[];
  laserConfig: LaserConfigType;
  isPaused: boolean;
}

const SensorDisplay: React.FC<SensorDisplayProps> = ({ serialData, laserConfig, isPaused }) => {
  const usedSensors = getUsedSensors(laserConfig);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        All Sensor Readings
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {serialData.map((value, index) => {
          const normalizedValue = (value / 1023) * 100;
          const isUsed = usedSensors.has(index);

          // Find which laser uses this sensor (if any)
          const associatedLaser = laserConfig.lasers.find((laser) => laser.sensorIndex === index);
          const isTriggered = associatedLaser && normalizedValue < associatedLaser.sensitivity;

          return (
            <Box key={index} sx={{ mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Chip
                  label={`Sensor #${index + 1}`}
                  size="small"
                  color={isUsed ? "default" : "default"}
                  variant={isUsed ? "filled" : "outlined"}
                  sx={{
                    mr: 1,
                    opacity: isUsed ? 1 : 0.6,
                    width: 90,
                  }}
                />

                <Typography variant="body2" sx={{ width: 80 }}>
                  {value} / 1023
                </Typography>

                {isUsed ? (
                  <Typography
                    variant="body2"
                    color="primary.main"
                    sx={{ fontWeight: "bold", ml: 1 }}
                  >
                    {associatedLaser?.name || "Used"}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    [Unused]
                  </Typography>
                )}

                {/* Triggered indicator that doesn't affect layout */}
                <Box sx={{ ml: "auto", maxHeight: 24 }}>
                  {isTriggered && (
                    <Chip size="small" label="TRIGGERED" color="error" sx={{ mr: 1 }} />
                  )}
                </Box>
              </Box>

              {/* Line visualization */}
              <Box sx={{ display: "flex", alignItems: "center", height: 24 }}>
                {/* Background line */}
                <Box
                  sx={{
                    position: "relative",
                    height: 4,
                    bgcolor: "grey.300",
                    borderRadius: 2,
                    width: "100%",
                  }}
                >
                  {/* Value line - use color for all sensors */}
                  <Box
                    sx={{
                      position: "absolute",
                      height: "100%",
                      width: `${normalizedValue}%`,
                      bgcolor: getColorForValue(value),
                      borderRadius: 2,
                      transition: isPaused ? "none" : "width 0.05s, background-color 0.05s",
                    }}
                  />

                  {/* Threshold marker if this sensor is used by a laser */}
                  {associatedLaser && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: `${associatedLaser.sensitivity}%`,
                        height: 12,
                        width: 2,
                        bgcolor: "primary.main",
                        top: -4,
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}

        {serialData.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No sensor data received
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default SensorDisplay;
