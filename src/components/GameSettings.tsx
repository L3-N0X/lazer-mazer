import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  InputAdornment,
  Alert,
  Paper,
  Divider,
  FormControl,
  OutlinedInput,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { useLaserConfig } from "../context/LaserConfigContext";

export const GameSettings: React.FC = () => {
  const { laserConfig, updateLaserConfig, isLoading, deleteAllHighscores } = useLaserConfig();
  const [maxTouches, setMaxTouches] = useState<number>(3);
  const [reactivate, setReactivate] = useState<boolean>(false);
  const [reactivationTime, setReactivationTime] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  const increaseReactivationTime = () => {
    const newValue = reactivationTime + 1;
    setReactivationTime(newValue);
    saveSettings({
      ...laserConfig.gameSettings,
      reactivationTimeSeconds: newValue,
    });
  };

  const decreaseReactivationTime = () => {
    if (reactivationTime > 1) {
      const newValue = reactivationTime - 1;
      setReactivationTime(newValue);
      saveSettings({
        ...laserConfig.gameSettings,
        reactivationTimeSeconds: newValue,
      });
    }
  };

  const handleReactivationTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = parseFloat(event.target.value);
      if (value >= 1) {
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

  const handleDeleteAllHighscores = async () => {
    try {
      await deleteAllHighscores();
      setConfirmDeleteOpen(false);
    } catch (err) {
      setError("Failed to delete highscores");
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 0, mt: 1 }}>
            <FormControl variant="outlined" size="small">
              <OutlinedInput
                id="max-touches-input"
                type="text"
                sx={{ boxShadow: 0 }}
                value={maxTouches}
                onChange={handleMaxTouchesChange}
                startAdornment={
                  <InputAdornment position="start">
                    <Button
                      onClick={decreaseMaxTouches}
                      disabled={maxTouches <= 0}
                      size="small"
                      variant="text"
                      sx={{ minWidth: 0, p: 1, boxShadow: 0 }}
                    >
                      <RemoveIcon />
                    </Button>
                  </InputAdornment>
                }
                endAdornment={
                  <InputAdornment position="end">
                    <Button
                      onClick={increaseMaxTouches}
                      size="small"
                      variant="text"
                      sx={{ minWidth: 0, p: 1, boxShadow: 0 }}
                    >
                      <AddIcon />
                    </Button>
                  </InputAdornment>
                }
                inputProps={{
                  min: 0,
                  style: {
                    textAlign: "center",
                    width: "100px",
                    boxShadow: "0px 0px 0px 0px",
                  },
                }}
              />
            </FormControl>
            <Typography variant="body2" sx={{ display: "inline", mx: 1 }} gutterBottom>
              {maxTouches === 0 ? "(No limit)" : ""}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Maximum number of lasers that can be touched during a run before failing. Set to 0 for
            unlimited touches.
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
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
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0, mt: 1 }}>
              <FormControl variant="outlined" size="small">
                <OutlinedInput
                  id="max-touches-input"
                  type="text"
                  sx={{ boxShadow: 0 }}
                  value={reactivationTime}
                  onChange={handleReactivationTimeChange}
                  startAdornment={
                    <InputAdornment position="start">
                      <Button
                        onClick={decreaseReactivationTime}
                        disabled={reactivationTime <= 1}
                        size="small"
                        variant="text"
                        sx={{ minWidth: 0, p: 1, boxShadow: 0 }}
                      >
                        <RemoveIcon />
                      </Button>
                    </InputAdornment>
                  }
                  endAdornment={
                    <InputAdornment position="end">
                      <Button
                        onClick={increaseReactivationTime}
                        size="small"
                        variant="text"
                        sx={{ minWidth: 0, p: 1, boxShadow: 0 }}
                      >
                        <AddIcon />
                      </Button>
                    </InputAdornment>
                  }
                  inputProps={{
                    min: 0,
                    style: {
                      textAlign: "center",
                      width: "100px",
                      boxShadow: "0px 0px 0px 0px",
                    },
                  }}
                />
              </FormControl>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Time (in seconds) before a laser becomes active again after being touched.
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Highscore Management
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Delete all highscores from the system. This action cannot be undone.
          </Typography>

          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete All Highscores
          </Button>
        </Box>

        <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete all highscores? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteAllHighscores} color="error" variant="contained">
              Delete All
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};
