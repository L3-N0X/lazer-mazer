import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useLaserConfig } from "../context/LaserConfigContext";
import UsbIcon from "@mui/icons-material/Usb";
import PowerIcon from "@mui/icons-material/Power";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SyncIcon from "@mui/icons-material/Sync";

export const ArduinoSettings: React.FC = () => {
  const { laserConfig, connectArduino, disconnectArduino, enableAutoConnect } = useLaserConfig();
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>(laserConfig.arduinoSettings.port);
  const [baudRate, setBaudRate] = useState<number>(laserConfig.arduinoSettings.baudRate);
  const [isConnected, setIsConnected] = useState<boolean>(laserConfig.arduinoSettings.isConnected);
  const [autoConnectEnabled, setAutoConnectEnabled] = useState<boolean>(
    laserConfig.arduinoSettings.autoConnectEnabled !== false // Default to true if undefined
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serialData, setSerialData] = useState<number[]>([]);
  const [buzzerTriggered, setBuzzerTriggered] = useState<boolean>(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState<boolean>(false);

  // Common baud rates
  const baudRates = [9600, 19200, 38400, 57600, 115200];

  // Load available ports when component mounts
  useEffect(() => {
    refreshPorts();

    // Listen for serial data events
    const unlistenSerialData = listen("serial-data", (event) => {
      setSerialData(event.payload as number[]);
    });

    // Listen for serial error events
    const unlistenSerialError = listen("serial-error", (event) => {
      setError(`Serial Error: ${event.payload}`);
    });

    // Listen for buzzer events
    const unlistenBuzzerEvent = listen("buzzer", () => {
      setBuzzerTriggered(true);
      // Reset the buzzer state after a short delay
      setTimeout(() => setBuzzerTriggered(false), 2000);
    });

    return () => {
      unlistenSerialData.then((unlisten) => unlisten());
      unlistenSerialError.then((unlisten) => unlisten());
      unlistenBuzzerEvent.then((unlisten) => unlisten());
    };
  }, []);

  // Update local state when context changes
  useEffect(() => {
    setSelectedPort(laserConfig.arduinoSettings.port);
    setBaudRate(laserConfig.arduinoSettings.baudRate);
    setIsConnected(laserConfig.arduinoSettings.isConnected);
    setAutoConnectEnabled(laserConfig.arduinoSettings.autoConnectEnabled !== false);

    if (laserConfig.arduinoSettings.isConnected) {
      setAutoConnectAttempted(true);
      // Clear any previous error when connected successfully
      setError(null);
    }
  }, [laserConfig.arduinoSettings]);

  // Convert the array to a readable string format
  const serialDataString = serialData.length > 0 ? serialData.join(", ") : "No data received yet";

  const refreshPorts = async () => {
    try {
      setLoading(true);
      setError(null);
      const ports = await invoke<string[]>("list_ports");
      setAvailablePorts(ports);

      // If we have ports and none is selected, select the first one
      if (ports.length > 0 && !selectedPort) {
        setSelectedPort(ports[0]);
      }
    } catch (err: any) {
      setError(`Failed to get available ports: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await connectArduino(selectedPort, baudRate);
      setIsConnected(true);
    } catch (err: any) {
      setError(`Failed to connect: ${err.message || err}`);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await disconnectArduino();
      setIsConnected(false);
    } catch (err: any) {
      setError(`Failed to disconnect: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoConnectToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setAutoConnectEnabled(newValue);
    await enableAutoConnect(newValue);
  };

  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {buzzerTriggered && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<NotificationsActiveIcon />}>
          Buzzer triggered!
        </Alert>
      )}

      {autoConnectAttempted && isConnected && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<SyncIcon />}>
          Auto-connected to Arduino on {selectedPort} at {baudRate} baud.
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Serial Connection
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="port-select-label">Serial Port</InputLabel>
            <Select
              labelId="port-select-label"
              id="port-select"
              value={selectedPort}
              label="Serial Port"
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={isConnected || loading}
            >
              {availablePorts.map((port) => (
                <MenuItem key={port} value={port}>
                  {port}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="baudrate-select-label">Baud Rate</InputLabel>
            <Select
              labelId="baudrate-select-label"
              id="baudrate-select"
              value={baudRate}
              label="Baud Rate"
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={isConnected || loading}
            >
              {baudRates.map((rate) => (
                <MenuItem key={rate} value={rate}>
                  {rate}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={autoConnectEnabled}
                onChange={handleAutoConnectToggle}
                color="primary"
              />
            }
            label="Auto-connect on startup"
          />

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="contained"
              color={isConnected ? "error" : "primary"}
              startIcon={isConnected ? <PowerIcon /> : <UsbIcon />}
              onClick={isConnected ? handleDisconnect : handleConnect}
              disabled={loading || (!selectedPort && !isConnected)}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : isConnected ? (
                "Disconnect"
              ) : (
                "Connect"
              )}
            </Button>

            <Button variant="outlined" onClick={refreshPorts} disabled={loading || isConnected}>
              Refresh Ports
            </Button>

            {isConnected && (
              <Chip color="success" label="Connected" icon={<UsbIcon />} variant="outlined" />
            )}
          </Box>
        </Box>
      </Paper>

      {isConnected && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Serial Monitor
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box
            sx={{
              maxHeight: "200px",
              overflowY: "auto",
              p: 2,
              border: "1px solid #ccc",
              borderRadius: 1,
              mb: 2,
              fontFamily: "monospace",
              bgcolor: "background.paper",
            }}
          >
            {serialDataString}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" color="primary" label={`Port: ${selectedPort}`} />
            <Chip size="small" color="primary" label={`Baud: ${baudRate}`} />
          </Stack>
        </Paper>
      )}
    </Box>
  );
};
