import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Home from "./pages/Home";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import { LaserConfigProvider } from "./context/LaserConfigContext";
import "./App.css";

// Create a theme with Roboto font
const theme = createTheme({
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
  },
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f5f5",
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
              </Routes>
            </main>
          </div>
        </Router>
      </LaserConfigProvider>
    </ThemeProvider>
  );
}

export default App;
