import React from "react";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Chip,
} from "@mui/material";
import { useLaserConfig } from "../context/LaserConfigContext";

const Highscores: React.FC = () => {
  const { laserConfig } = useLaserConfig();
  const { highscores } = laserConfig;

  // Format time as MM:SS.ms
  const formatTime = (timeInMs: number) => {
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((timeInMs % 1000) / 10);

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${ms
      .toString()
      .padStart(2, "0")}`;
  };

  // Sort highscores by time (ascending)
  const sortedHighscores = [...highscores].sort((a, b) => a.time - b.time);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Highscores
      </Typography>

      {sortedHighscores.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" color="text.secondary">
            No highscores yet. Complete a game to record your score!
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: (theme) => theme.palette.primary.dark }}>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Rank</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Name</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Time</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Date</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Touched Lasers</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold" }}>Game Settings</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedHighscores.map((score, index) => (
                <TableRow
                  key={score.id}
                  sx={{
                    "&:nth-of-type(odd)": {
                      backgroundColor: (theme) => theme.palette.action.hover,
                    },
                    ...(index === 0 && {
                      backgroundColor: (theme) => theme.palette.action.selected,
                    }),
                  }}
                >
                  <TableCell component="th" scope="row">
                    {index + 1}
                  </TableCell>
                  <TableCell>{score.name}</TableCell>
                  <TableCell
                    sx={{
                      fontFamily: "'Digital-7', monospace",
                      fontWeight: index === 0 ? "bold" : "normal",
                    }}
                  >
                    {formatTime(score.time)}
                  </TableCell>
                  <TableCell>{formatDate(score.date)}</TableCell>
                  <TableCell>{`${score.touchedLasers} / ${
                    score.maxAllowedTouches > 0 ? score.maxAllowedTouches : "∞"
                  }`}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        label={score.reactivationEnabled ? "Reactivation ON" : "Reactivation OFF"}
                        color={score.reactivationEnabled ? "success" : "default"}
                        variant="outlined"
                      />
                      {score.reactivationEnabled && (
                        <Chip
                          size="small"
                          label={`Reactivation: ${score.reactivationTimeSeconds}s`}
                          color="info"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default Highscores;
