import React, { useState } from "react";
import {
  Paper,
  Box,
  Typography,
  Slider,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { LaserConfig } from "../types/LaserConfig";

interface LaserConfigItemProps {
  laser: LaserConfig;
  onUpdate: (updatedLaser: LaserConfig) => void;
  onRemove: (id: string) => void;
  isDragging?: boolean;
}

export const LaserConfigItem: React.FC<LaserConfigItemProps> = ({
  laser,
  onUpdate,
  onRemove,
  isDragging = false,
}) => {
  const [name, setName] = useState(laser.name);

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleNameBlur = () => {
    onUpdate({ ...laser, name });
  };

  const handleSensitivityChange = (_event: Event, newValue: number | number[]) => {
    onUpdate({ ...laser, sensitivity: newValue as number });
  };

  const handleToggleEnabled = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...laser, enabled: event.target.checked });
  };

  return (
    <Paper
      elevation={isDragging ? 6 : 2}
      sx={{
        p: 2,
        mb: 2,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        gap: 2,
        backgroundColor: isDragging ? "rgba(25, 118, 210, 0.08)" : "inherit",
      }}
    >
      <Box sx={{ cursor: "move", display: "flex", alignItems: "center", pr: 1 }}>
        <DragIndicatorIcon color="action" />
      </Box>

      <Box sx={{ flexGrow: 1, width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <TextField
            label="Laser Name"
            variant="outlined"
            size="small"
            value={name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            sx={{ mr: 2, flexGrow: 1 }}
          />
          <FormControlLabel
            control={<Switch checked={laser.enabled} onChange={handleToggleEnabled} size="small" />}
            label="Enabled"
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
          <Typography id={`sensitivity-slider-${laser.id}`} sx={{ mr: 2, width: 140 }}>
            Sensitivity: {laser.sensitivity}%
          </Typography>
          <Slider
            value={laser.sensitivity}
            onChange={handleSensitivityChange}
            aria-labelledby={`sensitivity-slider-${laser.id}`}
            valueLabelDisplay="auto"
            sx={{ flexGrow: 1 }}
          />
        </Box>
      </Box>

      <IconButton
        aria-label="delete laser"
        onClick={() => onRemove(laser.id)}
        color="error"
        size="small"
        sx={{ ml: "auto" }}
      >
        <DeleteIcon />
      </IconButton>
    </Paper>
  );
};
