import React from "react";
import { Box, Typography, Paper, Divider, Button, Alert } from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";

interface EventLogPanelProps {
  messages: string[];
  buzzerEvents: string[];
  startEvents: string[];
  onClearLogs: () => void;
}

const EventLogPanel: React.FC<EventLogPanelProps> = ({
  messages,
  buzzerEvents,
  startEvents,
  onClearLogs,
}) => {
  return (
    <>
      {/* Raw Data Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Serial Monitor</Typography>
          <Button variant="outlined" size="small" onClick={onClearLogs}>
            Clear Logs
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            height: 300,
            overflowY: "auto",
            p: 1,
            bgcolor: "background.paper",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          {messages.length > 0 ? (
            messages.map((msg, i) => (
              <Box key={i} sx={{ py: 0.5 }}>
                {msg}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No messages received yet
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Buzzer Events Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Buzzer Events
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Fixed height container to prevent layout shifts */}
        <Box sx={{ minHeight: 50 }}>
          <Alert icon={<NotificationsActiveIcon />} severity="warning" sx={{ mb: 2 }}>
            {buzzerEvents.length} buzzer event{buzzerEvents.length !== 1 ? "s" : ""} detected
          </Alert>
        </Box>

        <Box
          sx={{
            height: 150,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            p: 1,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          {buzzerEvents.length > 0 ? (
            buzzerEvents.map((msg, index) => (
              <Box key={index} sx={{ py: 0.5 }}>
                {msg}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No buzzer events detected
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Start Button Events Section */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Start Button Events
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Fixed height container to prevent layout shifts */}
        <Box sx={{ minHeight: 50 }}>
          <Alert icon={<PlayCircleOutlineIcon />} severity="info" sx={{ mb: 2 }}>
            {startEvents.length} start button event{startEvents.length !== 1 ? "s" : ""} detected
          </Alert>
        </Box>

        <Box
          sx={{
            height: 150,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            p: 1,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          {startEvents.length > 0 ? (
            startEvents.map((msg, index) => (
              <Box key={index} sx={{ py: 0.5 }}>
                {msg}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No start button events detected
            </Typography>
          )}
        </Box>
      </Paper>
    </>
  );
};

export default EventLogPanel;
