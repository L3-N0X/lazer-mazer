import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useLaserConfig } from "../context/LaserConfigContext";

const Debug: React.FC = () => {
  const { laserConfig } = useLaserConfig();
  const [serialData, setSerialData] = useState<number[]>([]);
  const [rawMessages, setRawMessages] = useState<string[]>([]);
  const [buzzerEvents, setBuzzerEvents] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [listeners, setListeners] = useState<UnlistenFn[]>([]);

  // Freeze the state when paused
  const [frozenSerialData, setFrozenSerialData] = useState<number[]>([]);
  const [frozenMessages, setFrozenMessages] = useState<string[]>([]);
  const [frozenBuzzerEvents, setFrozenBuzzerEvents] = useState<string[]>([]);

  // Display data should use frozen state when paused
  const displaySerialData = isPaused ? frozenSerialData : serialData;
  const displayMessages = isPaused ? frozenMessages : rawMessages;
  const displayBuzzerEvents = isPaused ? frozenBuzzerEvents : buzzerEvents;

  // Setup event listeners
  useEffect(() => {
    let unlistenFunctions: UnlistenFn[] = [];

    if (!isPaused) {
      const setupListeners = async () => {
        // Listen for serial data
        const unlistenSerialData = await listen("serial-data", (event) => {
          const values = event.payload as number[];
          setSerialData(values);

          // Add the raw data to messages with timestamp
          const timestamp = new Date().toLocaleTimeString();
          setRawMessages((prev) => [`${timestamp}: ${values.join(", ")}`, ...prev.slice(0, 99)]);
        });

        // Listen for buzzer events
        const unlistenBuzzer = await listen("buzzer", () => {
          const timestamp = new Date().toLocaleTimeString();
          const buzzerMessage = `${timestamp}: Buzzer triggered`;
          setBuzzerEvents((prev) => [buzzerMessage, ...prev.slice(0, 99)]);
        });

        // Listen for error events
        const unlistenError = await listen("serial-error", (event) => {
          const timestamp = new Date().toLocaleTimeString();
          const errorMsg = `${timestamp} ERROR: ${event.payload}`;
          setRawMessages((prev) => [errorMsg, ...prev.slice(0, 99)]);
        });

        unlistenFunctions = [unlistenSerialData, unlistenBuzzer, unlistenError];
        setListeners(unlistenFunctions);
      };

      setupListeners();
    }

    return () => {
      // Cleanup listeners when component unmounts or when paused
      unlistenFunctions.forEach(async (unlisten) => await unlisten());
    };
  }, [isPaused]);

  const togglePause = () => {
    setIsPaused((prevPaused) => {
      if (!prevPaused) {
        // Pausing - freeze current state values
        setFrozenSerialData([...serialData]);
        setFrozenMessages([...rawMessages]);
        setFrozenBuzzerEvents([...buzzerEvents]);

        // Clean up listeners
        listeners.forEach(async (unlisten) => await unlisten());
      }
      return !prevPaused;
    });
  };

  // Use spacebar to toggle pause
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        togglePause();
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePause]);

  const clearLogs = () => {
    if (isPaused) {
      setFrozenMessages([]);
      setFrozenBuzzerEvents([]);
    } else {
      setRawMessages([]);
      setBuzzerEvents([]);
    }
  };

  // Map raw sensor value (0-1023) to color scale
  const getColorForValue = (value: number): string => {
    const normalized = Math.min(1, Math.max(0, value / 1023));

    // Generate colors from green (low) to red (high)
    const r = Math.floor(normalized * 255);
    const g = Math.floor((1 - normalized) * 255);
    const b = 0;

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Find which sensors are used by configured lasers
  const getUsedSensors = () => {
    const usedSensors = new Set<number>();
    laserConfig.lasers.forEach((laser) => {
      usedSensors.add(laser.sensorIndex);
    });
    return usedSensors;
  };

  const usedSensors = getUsedSensors();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Debug Console
      </Typography>

      {/* Fixed-height container for buttons to prevent layout shifts */}
      <Box sx={{ mb: 3, height: 40, display: "flex", alignItems: "center" }}>
        <Box sx={{ mr: 2, width: 150 }}>
          {" "}
          {/* Fixed width container */}
          <Button
            variant="contained"
            color={isPaused ? "primary" : "warning"}
            startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
            onClick={togglePause}
            fullWidth
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>
        </Box>

        {/* This will appear/disappear but won't shift other elements */}
        <Box sx={{ ml: 2, minHeight: 40, display: "flex", alignItems: "center" }}>
          {isPaused && <Chip label="MONITORING PAUSED" color="error" variant="outlined" />}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* All Sensors */}
        <Grid
          size={{
            xs: 12,
          }}
        >
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              All Sensor Readings
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {displaySerialData.map((value, index) => {
                const normalizedValue = (value / 1023) * 100;
                const isUsed = usedSensors.has(index);

                // Find which laser uses this sensor (if any)
                const associatedLaser = laserConfig.lasers.find(
                  (laser) => laser.sensorIndex === index
                );
                const isTriggered =
                  associatedLaser && normalizedValue < associatedLaser.sensitivity;

                return (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                      <Chip
                        label={`Sensor #${index}`}
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
                            transition: isPaused ? "none" : "width 0.05s, background-color 0.05s", // No transition when paused
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

              {displaySerialData.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No sensor data received
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Configured Lasers */}
        <Grid
          size={{
            xs: 12,
            md: 6,
          }}
        >
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Configured Lasers
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              {laserConfig.lasers.map((laser) => {
                const sensorValue = displaySerialData[laser.sensorIndex] || 0;
                const normalizedValue = (sensorValue / 1023) * 100;
                const isBelowThreshold = normalizedValue < laser.sensitivity;

                return (
                  <Card
                    key={laser.id}
                    variant="outlined"
                    sx={{
                      borderColor: isBelowThreshold ? "error.main" : "divider",
                    }}
                  >
                    <CardHeader
                      title={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Typography variant="h6" component="span">
                            {laser.name}
                          </Typography>
                          <Box sx={{ ml: "auto", minWidth: 100, textAlign: "right" }}>
                            {isBelowThreshold && (
                              <Chip size="small" label="TRIGGERED" color="error" />
                            )}
                          </Box>
                        </Box>
                      }
                      subheader={
                        <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                          <Chip
                            label={`Sensor #${laser.sensorIndex}`}
                            size="small"
                            color="default"
                            sx={{ mr: 1 }}
                          />
                          {laser.enabled ? "(Enabled)" : "(Disabled)"}
                        </Box>
                      }
                      sx={{ pb: 0 }}
                    />
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="body2">Reading: {sensorValue} / 1023</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {normalizedValue.toFixed(1)}%
                        </Typography>
                      </Box>

                      {/* Line visualization */}
                      <Box sx={{ position: "relative", height: 24, mb: 1 }}>
                        {/* Background line */}
                        <Box
                          sx={{
                            position: "relative",
                            top: 10,
                            height: 4,
                            bgcolor: "grey.300",
                            borderRadius: 2,
                            width: "100%",
                          }}
                        >
                          {/* Value line */}
                          <Box
                            sx={{
                              position: "absolute",
                              height: "100%",
                              width: `${normalizedValue}%`,
                              bgcolor: getColorForValue(sensorValue),
                              borderRadius: 2,
                              transition: isPaused ? "none" : "width 0.05s, background-color 0.05s", // No transition when paused
                            }}
                          />

                          {/* Threshold marker */}
                          <Box
                            sx={{
                              position: "absolute",
                              left: `${laser.sensitivity}%`,
                              height: 12,
                              width: 2,
                              bgcolor: "primary.main",
                              top: -4,
                            }}
                          />
                        </Box>
                      </Box>

                      <Typography variant="caption" color="text.secondary">
                        Threshold: {laser.sensitivity}%
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}

              {laserConfig.lasers.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No lasers configured
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Raw Data and Buzzer Events */}
        <Grid
          size={{
            xs: 12,
            md: 6,
          }}
        >
          {/* Raw Data Section */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}
            >
              <Typography variant="h6">Serial Monitor</Typography>
              <Button variant="outlined" size="small" onClick={clearLogs}>
                Clear Logs
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box
              sx={{
                height: 300,
                overflowY: "auto",
                p: 1,
                bgcolor: "background.paper",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              {displayMessages.length > 0 ? (
                displayMessages.map((msg, i) => (
                  <Box key={i} sx={{ py: 0.5 }}>
                    {msg}
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No messages received yet
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Buzzer Events Section */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Buzzer Events
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {/* Fixed height container to prevent layout shifts */}
            <Box sx={{ minHeight: 50 }}>
              {
                <Alert icon={<NotificationsActiveIcon />} severity="warning" sx={{ mb: 2 }}>
                  {displayBuzzerEvents.length} buzzer event
                  {displayBuzzerEvents.length !== 1 ? "s" : ""} detected
                </Alert>
              }
            </Box>

            <Box
              sx={{
                height: 150,
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                p: 1,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              {displayBuzzerEvents.length > 0 ? (
                displayBuzzerEvents.map((msg, index) => (
                  <Box key={index} sx={{ py: 0.5 }}>
                    {msg}
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No buzzer events detected
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Debug;
