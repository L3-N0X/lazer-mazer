import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useState, useEffect } from "react";
import Home from "./pages/Home";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Debug from "./pages/Debug";
import Game from "./pages/Game";
import Navbar from "./components/Navbar";
import { LaserConfigProvider, useLaserConfig } from "./context/LaserConfigContext";
import "./App.css";
import { Snackbar, Alert } from "@mui/material";

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

  useEffect(() => {
    // Only try to auto-connect if we have saved settings
    const { port, baudRate } = laserConfig.arduinoSettings;

    const attemptConnection = async () => {
      if (port && baudRate && !laserConfig.arduinoSettings.isConnected) {
        try {
          console.log(`Auto-connecting to Arduino at ${port} with baud rate ${baudRate}...`);
          await connectArduino(port, baudRate);
          console.log("Auto-connection successful");
        } catch (err: any) {
          console.error("Auto-connection failed:", err);
          setConnectionError(`Failed to connect to Arduino: ${err.message || String(err)}`);
          setShowError(true);
        }
      }
    };

    attemptConnection();
  }, [laserConfig.arduinoSettings, connectArduino]);

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
      <Alert onClose={handleCloseError} severity="error" sx={{ width: "100%" }}>
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
