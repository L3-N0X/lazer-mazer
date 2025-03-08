import React from "react";
import { Slider, Box, Typography } from "@mui/material";

interface LaserSliderProps {
  currentValue: number;
  threshold: number;
  onThresholdChange: (newThreshold: number) => void;
}

const LaserSlider: React.FC<LaserSliderProps> = ({
  currentValue,
  threshold,
  onThresholdChange,
}) => {
  const handleChange = (_event: Event, newValue: number | number[]) => {
    onThresholdChange(newValue as number);
  };

  return (
    <Box>
      <Box sx={{ m: 3 }} />
      <Typography id="threshold-slider">Threshold</Typography>
      <Box sx={{ position: "relative" }}>
        {/* Current value indicator */}
        <Box
          sx={{
            position: "absolute",
            height: 4,
            paddingLeft: 1,
            paddingRight: 1,
            width: `${currentValue}%`,
            backgroundColor: "secondary.main",
            opacity: 1,
            borderRadius: 1,
            top: "0%",
            transform: "translateY(320%)",
            pointerEvents: "none",
            transition: "width 0.1s",
          }}
        />
        {/* User-adjustable threshold slider */}
        <Slider
          value={threshold}
          onChange={handleChange}
          aria-label="Threshold"
          valueLabelDisplay="auto"
          title="Threshold"
          step={1}
          min={0}
          max={100}
        />
      </Box>
    </Box>
  );
};

export default LaserSlider;
