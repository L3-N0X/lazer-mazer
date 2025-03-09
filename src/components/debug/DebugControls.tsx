import React, { useEffect } from "react";
import { Box, Button, Chip } from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

interface DebugControlsProps {
  isPaused: boolean;
  togglePause: () => void;
}

const DebugControls: React.FC<DebugControlsProps> = ({ isPaused, togglePause }) => {
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

  return (
    <Box sx={{ mb: 3, height: 40, display: "flex", alignItems: "center" }}>
      <Box sx={{ mr: 2, width: 150 }}>
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
  );
};

export default DebugControls;
