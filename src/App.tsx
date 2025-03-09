import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import Home from "./pages/Home";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Debug from "./pages/Debug";
import Game from "./pages/Game";
import Navbar from "./components/Navbar";
import { LaserConfigProvider, useLaserConfig } from "./context/LaserConfigContext";
import "./App.css";
import { Snackbar, Alert, Button } from "@mui/material";

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
  const { laserConfig, connectArduino } = useLaserConfig();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const connectionAttemptedRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);

  // Function to attempt connection with the Arduino
  const attemptConnection = async () => {
    const { port, baudRate } = laserConfig.arduinoSettings;

    // Only try to connect if we have port and baud rate, and we're not already connected
    if (port && baudRate && !laserConfig.arduinoSettings.isConnected) {
      try {
        console.log(`Attempting to connect to Arduino at ${port} with baud rate ${baudRate}...`);
        connectionAttemptedRef.current = true;
        await connectArduino(port, baudRate);
        console.log("Arduino connection successful");

        // Clear any existing error when connection is successful
        if (showError) {
          setShowError(false);
          setConnectionError(null);
        }
      } catch (err: any) {
        console.error("Arduino connection failed:", err);
        setConnectionError(`Failed to connect to Arduino: ${err.message || String(err)}`);
        setShowError(true);

        // Schedule a retry after a delay
        if (retryTimeoutRef.current) {
          window.clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = window.setTimeout(() => {
          console.log("Retrying Arduino connection...");
          attemptConnection();
        }, 3000); // Retry after 3 seconds
      }
    } else if (laserConfig.arduinoSettings.isConnected) {
      console.log("Arduino is already connected, no need to reconnect");
    } else {
      console.log("No Arduino settings available for connection");
    }
  };

  // Run on initial mount and when Arduino settings change
  useEffect(() => {
    // Check for valid settings before attempting connection
    const { port, baudRate } = laserConfig.arduinoSettings;
    const validSettings = port && baudRate && port.trim() !== "";

    // Skip if already connected
    if (laserConfig.arduinoSettings.isConnected) {
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
  ]);

  // Listen for config changes that might indicate a need to retry connection
  useEffect(() => {
    // If settings change and we're not connected, try again
    const validSettings = laserConfig.arduinoSettings.port && laserConfig.arduinoSettings.baudRate;
    if (
      validSettings &&
      !laserConfig.arduinoSettings.isConnected &&
      connectionAttemptedRef.current
    ) {
      // This will catch any settings changes that might allow connection
      console.log("Arduino settings changed, retrying connection...");
      attemptConnection();
    }
  }, [laserConfig]);

  const handleCloseError = () => {
    setShowError(false);
  };

  return (
    <Snackbar
      open={showError}
      autoHideDuration={6000}
      onClose={handleCloseError}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={handleCloseError}
        severity="error"
        sx={{ width: "100%" }}
        action={
          <Button color="inherit" size="small" onClick={attemptConnection}>
            Retry
          </Button>
        }
      >
        {connectionError}
      </Alert>
    </Snackbar>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LaserConfigProvider>
        <Router>
          <div className="app-container">
            <Navbar />
            <ArduinoAutoConnect />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/debug" element={<Debug />} />
                <Route path="/game" element={<Game />} />
              </Routes>
            </main>
          </div>
        </Router>
      </LaserConfigProvider>
    </ThemeProvider>
  );
}

export default App;
