import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
  Alert,
  Paper,
  Divider,
  IconButton,
  FormControl,
  OutlinedInput,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
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

  const handleMaxTouchesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      let value = parseInt(event.target.value, 10);
      if (isNaN(value)) value = 0;
      if (value >= 0) {
        setMaxTouches(value);
        saveSettings({
          ...laserConfig.gameSettings,
          maxAllowedTouches: value,
        });
        setError(null);
      } else {
        setError("Maximum touches cannot be negative");
      }
    } catch (err) {
      setError("Please enter a valid number");
    }
  };

  const increaseMaxTouches = () => {
    const newValue = maxTouches + 1;
    setMaxTouches(newValue);
    saveSettings({
      ...laserConfig.gameSettings,
      maxAllowedTouches: newValue,
    });
  };

  const decreaseMaxTouches = () => {
    if (maxTouches > 0) {
      const newValue = maxTouches - 1;
      setMaxTouches(newValue);
      saveSettings({
        ...laserConfig.gameSettings,
        maxAllowedTouches: newValue,
      });
    }
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
          <Typography gutterBottom>Maximum Allowed Laser Touches:</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
            <FormControl variant="outlined" size="small">
              <OutlinedInput
                id="max-touches-input"
                type="number"
                value={maxTouches}
                onChange={handleMaxTouchesChange}
                startAdornment={
                  <InputAdornment position="start">
                    <IconButton
                      onClick={decreaseMaxTouches}
                      edge="start"
                      disabled={maxTouches <= 0}
                      size="small"
                    >
                      <RemoveIcon />
                    </IconButton>
                  </InputAdornment>
                }
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton onClick={increaseMaxTouches} edge="end" size="small">
                      <AddIcon />
                    </IconButton>
                  </InputAdornment>
                }
                inputProps={{
                  min: 0,
                  style: {
                    textAlign: "center",
                    width: "50px",
                  },
                }}
              />
            </FormControl>
            <Typography variant="body2" sx={{ display: "inline" }}>
              {maxTouches === 0 ? "(No limit)" : ""}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Maximum number of lasers that can be touched during a run before failing. Set to 0 for
            unlimited touches.
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
