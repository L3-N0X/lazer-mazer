import { Typography, List, ListItem, Paper, Modal, LinearProgress } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";

// Blinking animation keyframes
const blinkAnimation = keyframes`
  0% { background-color: rgba(255, 0, 0, 1); }
  50% { background-color: rgba(128, 128, 128, 0.5); }
  100% { background-color: rgba(255, 0, 0, 1); }
`;

// Custom styled components for the game screen
export const TimerDisplay = styled(Typography)(({ theme }) => ({
  fontFamily: "'Digital-7', monospace",
  fontSize: "8rem",
  fontWeight: "bold",
  textAlign: "center",
  margin: theme.spacing(2, 0),
  color: theme.palette.common.white,
  textShadow: "0 0 10px rgba(255, 77, 77, 0.7)",
}));

export const GameStatBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
}));

// Updated LaserListItem to support blinking and reactivation animations
export const LaserListItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== "active" && prop !== "blinking",
})<{
  active: boolean;
  blinking: boolean;
}>(({ theme, active, blinking }) => ({
  backgroundColor: active ? theme.palette.error.main : "rgba(128,128,128,0.5)",
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(1),
  transition: "background-color 0.3s ease",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  border: `1px solid ${active ? theme.palette.error.dark : "transparent"}`,
  boxShadow: active ? "0 0 8px rgba(255,77,77,0.6)" : "none",
  animation: blinking ? `${blinkAnimation} 0.3s ease-in-out 3` : "none",
  position: "relative",
  overflow: "hidden", // Ensure progress bar stays contained
}));

// Reactivation progress bar
export const ReactivationProgress = styled(LinearProgress)(() => ({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: "100%",
  backgroundColor: "transparent",
  "& .MuiLinearProgress-bar": {
    backgroundColor: "#FFA39A",
    transition: "none", // We'll handle animation ourselves for smoothness
  },
}));

// Update LaserGrid to be more responsive
export const LaserGrid = styled(List, {
  shouldForwardProp: (prop) => prop !== "displayasgridlayout",
})<{ displayasgridlayout: boolean }>(({ theme, displayasgridlayout }) => ({
  display: "grid",
  gridTemplateColumns: displayasgridlayout ? `repeat(auto-fit, minmax(29%, 1fr))` : "1fr",
  gap: theme.spacing(2),
  width: "100%",
  height: "100%",
  padding: theme.spacing(2),
  overflow: "hidden",
  alignContent: "start",
}));

// Update LaserContainer to control height and prevent scrolling
export const LaserContainer = styled(Paper)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  borderRadius: theme.spacing(2),
  overflow: "hidden",
  minHeight: 0, // Important for proper flexbox behavior
}));

export const GameOverModal = styled(Modal)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const GameOverContent = styled(Paper)(({ theme }) => ({
  border: "2px solid #ff4d4d",
  borderRadius: theme.spacing(2),
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "800px",
  width: "100%",
}));

export const BigCountdownOverlay = styled("div")(() => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10rem",
  zIndex: 1000,
  color: "#fff",
  // muted background
  backgroundColor: "rgba(0, 0, 0, 0.5)",
}));
