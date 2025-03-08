import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Box,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { LaserConfig } from "../types/LaserConfig";
import LaserSlider from "./LaserSlider";
import { listen } from "@tauri-apps/api/event";

interface LaserConfigItemProps {
  laser: LaserConfig;
  onUpdate: (laser: LaserConfig) => void;
  onRemove: (id: string) => void;
  isDragging?: boolean;
  dragHandle?: React.ReactNode;
}

export const LaserConfigItem: React.FC<LaserConfigItemProps> = ({
  laser,
  onUpdate,
  onRemove,
  isDragging = false,
  dragHandle,
}) => {
  // Track the current sensor value from Arduino
  const [currentValue, setCurrentValue] = useState<number>(0);

  // Listen for serial data events from Arduino
  useEffect(() => {
    const unlistenSerialData = listen("serial-data", (event) => {
      const sensorValues = event.payload as number[];
      if (sensorValues && sensorValues.length > laser.sensorIndex) {
        // Get the specific sensor value for this laser
        const sensorValue = sensorValues[laser.sensorIndex];
        // Convert the raw sensor value (typically 0-1023) to a percentage (0-100)
        const normalizedValue = Math.min(100, Math.max(0, (sensorValue / 1023) * 100));
        setCurrentValue(normalizedValue);
      }
    });

    // Clean up listener when component unmounts
    return () => {
      unlistenSerialData.then((unlisten) => unlisten());
    };
  }, [laser.sensorIndex]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...laser, name: e.target.value });
  };

  const handleSensitivityChange = (_event: Event, newValue: number | number[]) => {
    onUpdate({ ...laser, sensitivity: newValue as number });
  };

  const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...laser, enabled: e.target.checked });
  };

  // Adapter function to match LaserSlider prop signature
  const handleThresholdChange = (newThreshold: number) => {
    handleSensitivityChange(new Event("change"), newThreshold);
  };

  return (
    <Card
      sx={{
        mb: 2,
        pl: 3,
        boxShadow: isDragging ? 6 : 1,
        position: "relative",
      }}
    >
      {dragHandle}

      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <TextField
            label="Laser Name"
            value={laser.name}
            onChange={handleNameChange}
            size="small"
            sx={{ width: "60%" }}
          />

          <Chip
            label={`Sensor #${laser.sensorIndex}`}
            color="primary"
            size="small"
            sx={{ alignSelf: "center" }}
          />

          <IconButton onClick={() => onRemove(laser.id)} color="error" size="small">
            <DeleteIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 2 }}>
          <LaserSlider
            currentValue={currentValue}
            threshold={laser.sensitivity}
            onThresholdChange={handleThresholdChange}
          />
          <Typography variant="caption" color="text.secondary">
            Adjust sensor threshold (higher = more sensitive)
          </Typography>
        </Box>

        <Box>
          <FormControlLabel
            control={<Switch checked={laser.enabled} onChange={handleEnabledChange} />}
            label="Enabled"
          />
        </Box>
      </CardContent>
    </Card>
  );
};
