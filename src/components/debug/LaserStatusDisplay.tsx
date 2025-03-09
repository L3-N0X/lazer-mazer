import React from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Stack,
  Card,
  CardHeader,
  CardContent,
  Chip,
} from "@mui/material";
import { LaserConfigType } from "../../types/laserTypes";
import { getColorForValue } from "../../utils/debugUtils";

interface LaserStatusDisplayProps {
  laserConfig: LaserConfigType;
  serialData: number[];
  isPaused: boolean;
}

const LaserStatusDisplay: React.FC<LaserStatusDisplayProps> = ({
  laserConfig,
  serialData,
  isPaused,
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Configured Lasers
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Stack spacing={2}>
        {laserConfig.lasers.map((laser) => {
          const sensorValue = serialData[laser.sensorIndex] || 0;
          const normalizedValue = (sensorValue / 1023) * 100;
          const isBelowThreshold = normalizedValue < laser.sensitivity;

          return (
            <Card
              key={laser.id}
              variant="outlined"
              sx={{
                borderColor: isBelowThreshold ? "error.main" : "divider",
              }}
            >
              <CardHeader
                title={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="h6" component="span">
                      {laser.name}
                    </Typography>
                    <Box sx={{ ml: "auto", minWidth: 100, textAlign: "right" }}>
                      {isBelowThreshold && <Chip size="small" label="TRIGGERED" color="error" />}
                    </Box>
                  </Box>
                }
                subheader={
                  <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                    <Chip
                      label={`Sensor #${laser.sensorIndex + 1}`}
                      size="small"
                      color="default"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={laser.enabled ? "Enabled" : "Disabled"}
                      size="small"
                      color={laser.enabled ? "success" : "error"}
                      sx={{ ml: "auto" }}
                    />
                  </Box>
                }
                sx={{ pb: 0 }}
              />
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Reading: {sensorValue} / 1023</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {normalizedValue.toFixed(1)}%
                  </Typography>
                </Box>

                {/* Line visualization */}
                <Box sx={{ position: "relative", height: 24, mb: 1 }}>
                  {/* Background line */}
                  <Box
                    sx={{
                      position: "relative",
                      top: 10,
                      height: 4,
                      bgcolor: "grey.300",
                      borderRadius: 2,
                      width: "100%",
                    }}
                  >
                    {/* Value line */}
                    <Box
                      sx={{
                        position: "absolute",
                        height: "100%",
                        width: `${normalizedValue}%`,
                        bgcolor: getColorForValue(sensorValue),
                        borderRadius: 2,
                        transition: isPaused ? "none" : "width 0.05s, background-color 0.05s",
                      }}
                    />

                    {/* Threshold marker */}
                    <Box
                      sx={{
                        position: "absolute",
                        left: `${laser.sensitivity}%`,
                        height: 12,
                        width: 2,
                        bgcolor: "primary.main",
                        top: -4,
                      }}
                    />
                  </Box>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Threshold: {laser.sensitivity}%
                </Typography>
              </CardContent>
            </Card>
          );
        })}

        {laserConfig.lasers.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No lasers configured
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default LaserStatusDisplay;
