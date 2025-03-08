import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
  Alert,
  Paper,
  Divider,
} from "@mui/material";
import { useLaserConfig } from "../context/LaserConfigContext";

export const GameSettings: React.FC = () => {
  const { laserConfig, updateLaserConfig, isLoading } = useLaserConfig();
  const [maxTouches, setMaxTouches] = useState<number>(3);
  const [reactivate, setReactivate] = useState<boolean>(false);
  const [reactivationTime, setReactivationTime] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  // Load settings from context when component mounts or context changes
  useEffect(() => {
    if (!isLoading && laserConfig.gameSettings) {
      setMaxTouches(laserConfig.gameSettings.maxAllowedTouches);
      setReactivate(laserConfig.gameSettings.reactivateLasers);
      setReactivationTime(laserConfig.gameSettings.reactivationTimeSeconds);
    }
  }, [isLoading, laserConfig]);

  const handleMaxTouchesChange = (_event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setMaxTouches(value);
    saveSettings({
      ...laserConfig.gameSettings,
      maxAllowedTouches: value,
    });
  };

  const handleReactivateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setReactivate(value);
    saveSettings({
      ...laserConfig.gameSettings,
      reactivateLasers: value,
    });
  };

  const handleReactivationTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = parseFloat(event.target.value);
      if (value >= 0) {
        setReactivationTime(value);
        saveSettings({
          ...laserConfig.gameSettings,
          reactivationTimeSeconds: value,
        });
        setError(null);
      } else {
        setError("Reactivation time cannot be negative");
      }
    } catch (err) {
      setError("Please enter a valid number");
    }
  };

  const saveSettings = async (newGameSettings: typeof laserConfig.gameSettings) => {
    try {
      await updateLaserConfig({
        ...laserConfig,
        gameSettings: newGameSettings,
      });
      setError(null);
    } catch (err) {
      setError("Failed to save game settings");
      console.error(err);
    }
  };

  if (isLoading) {
    return <Typography>Loading game settings...</Typography>;
  }

  // Calculate the max allowed touches based on the number of active lasers
  const connectedLaserCount = laserConfig.lasers.filter((laser) => laser.enabled).length;
  const maxAllowedTouchesValue = Math.min(maxTouches, connectedLaserCount);
  const marks = Array.from({ length: connectedLaserCount + 1 }, (_, i) => ({
    value: i,
    label: i.toString(),
  }));

  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Touch Limits
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Maximum Allowed Laser Touches: {maxAllowedTouchesValue}
          </Typography>
          <Box sx={{ px: 1 }}>
            <Slider
              value={maxAllowedTouchesValue}
              onChange={handleMaxTouchesChange}
              aria-labelledby="max-touches-slider"
              valueLabelDisplay="auto"
              step={1}
              marks={marks}
              min={0}
              max={connectedLaserCount}
              sx={{ mt: 2, mb: 1 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Maximum number of lasers that can be touched during a run before failing.
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Laser Reactivation
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FormControlLabel
          control={
            <Switch
              checked={reactivate}
              onChange={handleReactivateChange}
              name="reactivate-lasers"
            />
          }
          label="Reactivate lasers after being touched"
          sx={{ mb: 2 }}
        />

        {reactivate && (
          <Box sx={{ ml: 3 }}>
            <TextField
              label="Reactivation Time"
              type="number"
              value={reactivationTime}
              onChange={handleReactivationTimeChange}
              InputProps={{
                endAdornment: <InputAdornment position="end">seconds</InputAdornment>,
                inputProps: {
                  min: 0,
                  step: 0.5,
                  style: { textAlign: "right" },
                },
              }}
              variant="outlined"
              size="small"
              sx={{
                mt: 1,
                mb: 1,
                width: "100%",
                maxWidth: "250px",
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Time (in seconds) before a laser becomes active again after being touched.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
