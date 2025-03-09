import React from "react";
import { Box, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useLaserConfig } from "../context/LaserConfigContext";
import { useDebugMonitor } from "../hooks/useDebugMonitor";
import SensorDisplay from "../components/debug/SensorDisplay";
import LaserStatusDisplay from "../components/debug/LaserStatusDisplay";
import EventLogPanel from "../components/debug/EventLogPanel";
import DebugControls from "../components/debug/DebugControls";

const Debug: React.FC = () => {
  const { laserConfig } = useLaserConfig();
  const {
    displaySerialData,
    displayMessages,
    displayBuzzerEvents,
    displayStartEvents,
    isPaused,
    togglePause,
    clearLogs,
  } = useDebugMonitor();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Debug Console
      </Typography>

      <DebugControls isPaused={isPaused} togglePause={togglePause} />

      <Grid container spacing={3}>
        {/* All Sensors */}
        <Grid
          size={{
            xs: 12,
          }}
        >
          <SensorDisplay
            serialData={displaySerialData}
            laserConfig={laserConfig}
            isPaused={isPaused}
          />
        </Grid>

        {/* Configured Lasers */}
        <Grid
          size={{
            xs: 12,
            md: 6,
          }}
        >
          <LaserStatusDisplay
            laserConfig={laserConfig}
            serialData={displaySerialData}
            isPaused={isPaused}
          />
        </Grid>

        {/* Logs and Events */}
        <Grid
          size={{
            xs: 12,
            md: 6,
          }}
        >
          <EventLogPanel
            messages={displayMessages}
            buzzerEvents={displayBuzzerEvents}
            startEvents={displayStartEvents}
            onClearLogs={clearLogs}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Debug;
