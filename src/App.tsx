import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import Home from "./pages/Home";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Debug from "./pages/Debug";
import Game from "./pages/Game";
import Highscores from "./pages/Highscores";
import Navbar from "./components/Navbar";
import { invoke } from "@tauri-apps/api/core";
import { LaserConfigProvider, useLaserConfig } from "./context/LaserConfigContext";
import "./App.css";
import { Snackbar, Alert, Button, Box } from "@mui/material";

// Create a theme with Roboto font
const theme = createTheme({
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
  },
  palette: {
    mode: "dark",
    primary: {
      main: "#ff4d4d", // Main dark background for primary elements
    },
    secondary: {
      main: "#ffa77d", // Red accent
    },
    background: {
      default: "#121212",
      paper: "#020202",
    },
    text: {
      primary: "#e0e0e0",
      secondary: "#b0b0b0",
    },
  },
});

// Component that handles Arduino auto-connection
const ArduinoAutoConnect = () => {
  const { laserConfig, connectArduino, enableAutoConnect } = useLaserConfig();
  const navigate = useNavigate();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const connectionAttemptedRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const [portAvailableInList, setPortAvailableInList] = useState<boolean | null>(null);

  // Function to navigate to settings page
  const goToSettings = () => {
    // open the specific settings page for Arduino
    navigate("/settings");
  };

  // Function to check if configured port is in available ports list
  const checkPortAvailability = async (configPort: string) => {
    try {
      if (!configPort) return false;

      const availablePorts = await invoke<string[]>("list_ports");
      const isAvailable = availablePorts.includes(configPort);
      setPortAvailableInList(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error("Error checking port availability:", error);
      return false;
    }
  };

  // Function to attempt connection with the Arduino
  const attemptConnection = async () => {
    const { port, baudRate, autoConnectEnabled } = laserConfig.arduinoSettings;

    // Don't try to connect if auto-connect is disabled or already connected
    if (!autoConnectEnabled || laserConfig.arduinoSettings.isConnected) {
      return;
    }

    if (port && baudRate) {
      // Always show connection attempts in UI
      setShowError(true);

      // Check if the port is in the available list
      const portAvailable = await checkPortAvailability(port);

      if (!portAvailable) {
        setConnectionError(`Port ${port} is not available for connection`);

        // Schedule a retry after a delay
        if (retryTimeoutRef.current) {
          window.clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = window.setTimeout(() => {
          if (laserConfig.arduinoSettings.autoConnectEnabled) {
            attemptConnection();
          }
        }, 10000); // Retry after 10 seconds

        return;
      }

      try {
        console.log(`Attempting to connect to Arduino at ${port} with baud rate ${baudRate}...`);
        connectionAttemptedRef.current = true;
        await connectArduino(port, baudRate);

        // Clear error when connection is successful
        setShowError(false);
        setConnectionError(null);
      } catch (err: any) {
        console.error("Arduino connection failed:", err);
        setConnectionError(`Failed to connect to Arduino: ${err.message || String(err)}`);

        // Schedule a retry after a delay only if auto-connect is still enabled
        if (retryTimeoutRef.current) {
          window.clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = window.setTimeout(() => {
          if (laserConfig.arduinoSettings.autoConnectEnabled) {
            attemptConnection();
          }
        }, 5000); // Retry after 5 seconds
      }
    }
  };

  // Run on initial mount and when Arduino settings change
  useEffect(() => {
    // Check for valid settings before attempting connection
    const { port, baudRate, autoConnectEnabled } = laserConfig.arduinoSettings;
    const validSettings = port && baudRate && port.trim() !== "";

    // Skip if already connected or auto-connect disabled
    if (laserConfig.arduinoSettings.isConnected || !autoConnectEnabled) {
      return;
    }

    // Try to connect on initial load if settings exist
    if (validSettings) {
      attemptConnection();
    }

    // Clean up any retry timeouts on unmount
    return () => {
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [
    laserConfig.arduinoSettings.port,
    laserConfig.arduinoSettings.baudRate,
    laserConfig.arduinoSettings.isConnected,
    laserConfig.arduinoSettings.autoConnectEnabled, // Added this to respond to auto-connect toggling
  ]);

  // Listen for config changes that might indicate a need to retry connection
  useEffect(() => {
    // If settings change and we're not connected, try again
    const validSettings = laserConfig.arduinoSettings.port && laserConfig.arduinoSettings.baudRate;
    if (
      validSettings &&
      !laserConfig.arduinoSettings.isConnected &&
      laserConfig.arduinoSettings.autoConnectEnabled
    ) {
      attemptConnection();
    }
  }, [laserConfig.arduinoSettings]);

  const handleCloseError = () => {
    setShowError(false);
  };

  const handleRetryConnection = () => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current);
    }
    attemptConnection();
  };

  const handleEnableAutoConnect = async () => {
    await enableAutoConnect(true);
    attemptConnection(); // Try connection immediately when re-enabled
  };

  // Determine error message type
  const getErrorMessage = () => {
    if (!portAvailableInList && laserConfig.arduinoSettings.port) {
      return `Port ${laserConfig.arduinoSettings.port} is not available. Please check your Arduino connection.`;
    }
    return connectionError || "Connection error";
  };

  return (
    <Snackbar
      open={showError}
      autoHideDuration={null}
      onClose={handleCloseError}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={handleCloseError}
        severity="error"
        sx={{ width: "100%" }}
        action={
          <Box sx={{ display: "flex" }}>
            {!laserConfig.arduinoSettings.autoConnectEnabled && (
              <Button color="inherit" size="small" onClick={handleEnableAutoConnect} sx={{ mr: 1 }}>
                Enable Auto-Connect
              </Button>
            )}
            <Button color="inherit" size="small" onClick={goToSettings} sx={{ mr: 1 }}>
              Open Settings
            </Button>
            <Button color="inherit" size="small" onClick={handleRetryConnection}>
              Retry Now
            </Button>
          </Box>
        }
      >
        {getErrorMessage()}
      </Alert>
    </Snackbar>
  );
};

// Wrapper component for ArduinoAutoConnect to access navigation
function AutoConnectWithNavigation() {
  return <ArduinoAutoConnect />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LaserConfigProvider>
        <Router>
          <div className="app-container">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/debug" element={<Debug />} />
              <Route path="/game" element={<Game />} />
              <Route path="/highscores" element={<Highscores />} />
              {/* Add AutoConnectWithNavigation as a route element to access navigation */}
            </Routes>
            <AutoConnectWithNavigation />
          </div>
        </Router>
      </LaserConfigProvider>
    </ThemeProvider>
  );
}

export default App;
