import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Container,
  List,
  ListItem,
  Paper,
  Chip,
  Fade,
  Modal,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useLaserConfig } from "../context/LaserConfigContext";

// Custom styled components for the game screen
const TimerDisplay = styled(Typography)(({ theme }) => ({
  fontFamily: "'Digital-7', monospace",
  fontSize: "8rem",
  fontWeight: "bold",
  textAlign: "center",
  margin: theme.spacing(2, 0),
  color: theme.palette.common.white,
  textShadow: "0 0 10px rgba(255, 77, 77, 0.7)",
}));

const GameStatBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: "rgba(0,0,0,0.7)",
  borderRadius: theme.spacing(1),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
}));

const LaserListItem = styled(ListItem)<{ active: boolean }>(({ theme, active }) => ({
  backgroundColor: active ? theme.palette.error.main : "rgba(128,128,128,0.5)",
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(1),
  transition: "background-color 0.3s ease",
  display: "flex",
  justifyContent: "center",
  border: `1px solid ${active ? theme.palette.error.dark : "transparent"}`,
  boxShadow: active ? "0 0 8px rgba(255,77,77,0.6)" : "none",
}));

const LaserGrid = styled(List)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
  gap: theme.spacing(2),
  width: "100%",
  padding: theme.spacing(2),
}));

const GameOverModal = styled(Modal)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const GameOverContent = styled(Paper)(({ theme }) => ({
  backgroundColor: "rgba(0,0,0,0.9)",
  border: "2px solid #f00",
  borderRadius: theme.spacing(2),
  padding: theme.spacing(4),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "500px",
  width: "100%",
}));

const Game: React.FC = () => {
  const { laserConfig } = useLaserConfig();
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [laserStates, setLaserStates] = useState<{ [id: string]: boolean }>({});
  const [triggeredCount, setTriggeredCount] = useState(0);
  const [triggeredLasers, setTriggeredLasers] = useState<Set<string>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [gameSuccess, setGameSuccess] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<UnlistenFn[]>([]);
  const reactivationTimeoutsRef = useRef<{ [id: string]: ReturnType<typeof setTimeout> }>({});

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

  // Initialize laser states based on config
  useEffect(() => {
    const initialStates: { [id: string]: boolean } = {};
    laserConfig.lasers.forEach((laser) => {
      if (laser.enabled) {
        initialStates[laser.id] = true;
      }
    });
    setLaserStates(initialStates);
  }, [laserConfig.lasers]);

  // Send laser sensitivities to the backend
  useEffect(() => {
    const updateBackendSensitivities = async () => {
      try {
        const sensitivities = laserConfig.lasers.map((laser) => Math.round(laser.sensitivity));
        await invoke("update_laser_sensitivities", { sensitivities });
      } catch (error) {
        console.error("Failed to update laser sensitivities:", error);
      }
    };

    updateBackendSensitivities();
  }, [laserConfig.lasers]);

  // Update audio settings when they change
  useEffect(() => {
    const updateAudioSettings = async () => {
      try {
        await invoke("update_audio_settings", {
          masterVolume: laserConfig.soundSettings.masterVolume,
          effectVolume: laserConfig.soundSettings.effectVolume,
          ambientEnabled: laserConfig.soundSettings.ambientSound,
          effectsEnabled: laserConfig.soundSettings.effectsSound,
        });
      } catch (error) {
        console.error("Failed to update audio settings:", error);
      }
    };

    updateAudioSettings();
  }, [laserConfig.soundSettings]);

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      // Stop all audio when component unmounts
      invoke("stop_all_audio").catch(console.error);
    };
  }, []);

  // Setup event listeners for laser triggers and buzzer
  useEffect(() => {
    const setupListeners = async () => {
      if (isGameRunning) {
        // Listen for serial data to detect laser breaks
        const unlistenSerialData = await listen("serial-data", (event) => {
          const values = event.payload as number[];

          // Check each laser to see if it's been triggered
          laserConfig.lasers.forEach((laser) => {
            if (laser.enabled && laser.sensorIndex < values.length) {
              const value = values[laser.sensorIndex];
              const normalizedValue = (value / 1023) * 100;
              const isTriggered = normalizedValue < laser.sensitivity;

              // If laser state changes from active to triggered
              if (laserStates[laser.id] && isTriggered) {
                handleLaserTriggered(laser.id);
              }
            }
          });
        });

        // Listen for buzzer events to stop the game
        const unlistenBuzzer = await listen("buzzer", () => {
          if (isGameRunning) {
            handleBuzzerPressed();
          }
        });

        // Listen for start button events
        const unlistenStartButton = await listen("start-button", () => {
          if (!isGameRunning) {
            startGame();
          }
        });

        listenersRef.current = [unlistenSerialData, unlistenBuzzer, unlistenStartButton];
      }

      return () => {
        listenersRef.current.forEach(async (unlisten) => await unlisten());
        listenersRef.current = [];
      };
    };

    setupListeners();

    return () => {
      listenersRef.current.forEach(async (unlisten) => await unlisten());
    };
  }, [isGameRunning, laserConfig.lasers, laserStates]);

  // Timer logic
  useEffect(() => {
    if (isGameRunning) {
      timerRef.current = setInterval(() => {
        setGameTime((prevTime) => prevTime + 100);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isGameRunning]);

  // Handle buzzer pressed - buzzer is already played in the backend
  const handleBuzzerPressed = async () => {
    // Just stop the game - audio is handled in backend
    await stopGame();
    setGameOver(true);
    setGameSuccess(false); // Buzzer press means failure
  };

  // Handle laser triggered
  const handleLaserTriggered = (laserId: string) => {
    // Only process if game is running
    if (!isGameRunning) return;

    // Update triggered count
    const newTriggeredCount = triggeredCount + 1;
    setTriggeredCount(newTriggeredCount);

    // Add to triggered lasers set to keep track for the whole game session
    setTriggeredLasers((prevSet) => {
      const newSet = new Set(prevSet);
      newSet.add(laserId);
      return newSet;
    });

    // Set the laser to triggered state (gray)
    setLaserStates((prevStates) => ({
      ...prevStates,
      [laserId]: false,
    }));

    // Reset the laser if reactivation is enabled
    if (laserConfig.gameSettings.reactivateLasers) {
      // Clear any existing timeout for this laser
      if (reactivationTimeoutsRef.current[laserId]) {
        clearTimeout(reactivationTimeoutsRef.current[laserId]);
      }

      // Set new timeout for reactivation
      reactivationTimeoutsRef.current[laserId] = setTimeout(async () => {
        // Check if game is still running before reactivating
        if (!isGameRunning) return;

        // Find the sensor index for this laser
        const laser = laserConfig.lasers.find((l) => l.id === laserId);
        if (laser) {
          try {
            // Notify backend to reactivate this laser
            await invoke("reactivate_laser", { sensorIndex: laser.sensorIndex });

            // Update UI
            setLaserStates((prevStates) => ({
              ...prevStates,
              [laserId]: true,
            }));

            console.log(`Reactivated laser ${laser.name} (sensor index: ${laser.sensorIndex})`);
          } catch (error) {
            console.error("Failed to reactivate laser:", error);
          }
        }

        // Remove the timeout reference after completion
        delete reactivationTimeoutsRef.current[laserId];
      }, laserConfig.gameSettings.reactivationTimeSeconds * 1000);
    }

    // Check if max triggers reached
    if (
      laserConfig.gameSettings.maxAllowedTouches > 0 &&
      newTriggeredCount >= laserConfig.gameSettings.maxAllowedTouches
    ) {
      handleGameOver();
    }
  };

  // Handle game over
  const handleGameOver = async () => {
    try {
      // Play game over sound and stop the game
      await invoke("game_over");
      setIsGameRunning(false);
      setGameOver(true);
      setGameSuccess(false); // Game over means failure
    } catch (error) {
      console.error("Failed to handle game over:", error);
      // Fallback to simple game stop if the game_over command fails
      await stopGame();
      setGameOver(true);
      setGameSuccess(false);
    }
  };

  const startGame = async () => {
    // Reset all game state
    setGameTime(0);
    setTriggeredCount(0);
    setTriggeredLasers(new Set());
    setGameOver(false);
    setGameSuccess(false);

    // Reset all lasers to active
    const initialStates: { [id: string]: boolean } = {};
    laserConfig.lasers.forEach((laser) => {
      if (laser.enabled) {
        initialStates[laser.id] = true;
      }
    });
    setLaserStates(initialStates);

    // Update laser sensitivities
    try {
      const sensitivities = laserConfig.lasers.map((laser) => Math.round(laser.sensitivity));
      await invoke("update_laser_sensitivities", { sensitivities });
    } catch (error) {
      console.error("Failed to update laser sensitivities:", error);
    }

    // Start the game on backend - this also plays the start sound
    try {
      await invoke("start_game");
      setIsGameRunning(true);
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };

  const stopGame = async () => {
    // Don't show success if game was never running
    if (isGameRunning) {
      setGameOver(true);
      setGameSuccess(true); // Manual stop means success!
    }

    // Stop the game on backend - this also stops background music
    try {
      await invoke("stop_game");
    } catch (error) {
      console.error("Failed to stop game:", error);
    }

    // Stop the game locally
    setIsGameRunning(false);

    // Clear all reactivation timeouts
    Object.keys(reactivationTimeoutsRef.current).forEach((id) => {
      clearTimeout(reactivationTimeoutsRef.current[id]);
    });
    reactivationTimeoutsRef.current = {};
  };

  const resetGame = async () => {
    // Stop the game without showing success message
    try {
      await invoke("stop_game");
    } catch (error) {
      console.error("Failed to stop game:", error);
    }

    // Reset all game state
    setIsGameRunning(false);
    setGameTime(0);
    setTriggeredCount(0);
    setTriggeredLasers(new Set());
    setGameOver(false);
    setGameSuccess(false);

    // Reset all lasers to active
    const initialStates: { [id: string]: boolean } = {};
    laserConfig.lasers.forEach((laser) => {
      if (laser.enabled) {
        initialStates[laser.id] = true;
      }
    });
    setLaserStates(initialStates);

    // Clear all reactivation timeouts
    Object.keys(reactivationTimeoutsRef.current).forEach((id) => {
      clearTimeout(reactivationTimeoutsRef.current[id]);
    });
    reactivationTimeoutsRef.current = {};
  };

  const handleCloseGameOver = async () => {
    setGameOver(false);
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        p: 3,
        backgroundColor: "#111",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Timer Display */}
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <TimerDisplay variant="h1">{formatTime(gameTime)}</TimerDisplay>
      </Box>

      {/* Game Controls and Stats */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <GameStatBox elevation={3}>
          <Typography variant="h6" color="error">
            Lasers Triggered
          </Typography>
          <Typography variant="h4">
            {triggeredCount} /{" "}
            {laserConfig.gameSettings.maxAllowedTouches > 0
              ? laserConfig.gameSettings.maxAllowedTouches
              : "∞"}
          </Typography>
        </GameStatBox>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={startGame}
            disabled={isGameRunning}
            sx={{ height: 50 }}
          >
            START
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={<StopIcon />}
            onClick={stopGame}
            disabled={!isGameRunning}
            sx={{ height: 50 }}
          >
            FINISH
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<RestartAltIcon />}
            onClick={resetGame}
            sx={{ height: 50 }}
          >
            RESET
          </Button>
        </Box>

        <GameStatBox elevation={3}>
          <Typography variant="h6" color="primary">
            Game Settings
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Chip
              label={
                laserConfig.gameSettings.reactivateLasers ? "Reactivation ON" : "Reactivation OFF"
              }
              color={laserConfig.gameSettings.reactivateLasers ? "success" : "default"}
              variant="outlined"
            />
            {laserConfig.gameSettings.reactivateLasers && (
              <Chip
                label={`Reactivation: ${laserConfig.gameSettings.reactivationTimeSeconds}s`}
                color="info"
                variant="outlined"
              />
            )}
          </Box>
        </GameStatBox>
      </Box>

      {/* Laser Grid - optimized for displaying up to 12 lasers without scrolling */}
      <Paper
        elevation={3}
        sx={{
          flex: 1,
          bgcolor: "rgba(0,0,0,0.8)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <LaserGrid>
          {laserConfig.lasers
            .filter((laser) => laser.enabled)
            .sort((a, b) => a.order - b.order) // Sort by configured order
            .map((laser) => (
              <Fade key={laser.id} in={true} timeout={300}>
                <LaserListItem active={laserStates[laser.id] || false}>
                  <Typography
                    variant="h5"
                    component="div"
                    sx={{
                      textAlign: "center",
                      fontWeight: "bold",
                      color: laserStates[laser.id] ? "white" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {laser.name}
                  </Typography>
                </LaserListItem>
              </Fade>
            ))}
        </LaserGrid>
      </Paper>

      {/* Game Over Modal */}
      <GameOverModal
        open={gameOver}
        onClose={handleCloseGameOver}
        aria-labelledby="game-over-modal"
      >
        <GameOverContent>
          <Typography
            variant="h1"
            color={gameSuccess ? "success" : "error"}
            sx={{
              mb: 3,
              textShadow: gameSuccess
                ? "0 0 10px rgba(0, 255, 0, 0.7)"
                : "0 0 10px rgba(255, 0, 0, 0.7)",
              fontSize: { xs: "3rem", sm: "4rem" },
            }}
          >
            {gameSuccess ? "MISSION COMPLETE!" : "GAME OVER"}
          </Typography>
          <Typography variant="h4" color="white" sx={{ mb: 4, textAlign: "center" }}>
            {gameSuccess
              ? "Congratulations! You made it through!"
              : "You triggered too many lasers!"}
          </Typography>
          <Typography variant="h5" color="white" sx={{ mb: 2 }}>
            Final Time: {formatTime(gameTime)}
          </Typography>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={resetGame}
              startIcon={<RestartAltIcon />}
            >
              Reset
            </Button>
            <Button variant="outlined" color="error" onClick={handleCloseGameOver}>
              Close
            </Button>
          </Box>
        </GameOverContent>
      </GameOverModal>
    </Container>
  );
};

export default Game;
