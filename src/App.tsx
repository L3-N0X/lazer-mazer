import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Home from "./pages/Home";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Debug from "./pages/Debug";
import Game from "./pages/Game";
import Navbar from "./components/Navbar";
import { LaserConfigProvider } from "./context/LaserConfigContext";
import "./App.css";

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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LaserConfigProvider>
        <Router>
          <div className="app-container">
            <Navbar />
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
