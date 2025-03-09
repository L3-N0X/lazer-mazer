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
  TextField,
  LinearProgress,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useLaserConfig } from "../context/LaserConfigContext";
import { audioManager, SoundEffect } from "../audioManager";

// Blinking animation keyframes
const blinkAnimation = keyframes`
  0% { background-color: rgba(255, 0, 0, 1); }
  50% { background-color: rgba(128, 128, 128, 0.5); }
  100% { background-color: rgba(255, 0, 0, 1); }
`;

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
  borderRadius: theme.spacing(1),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
}));

// Updated LaserListItem to support blinking and reactivation animations
const LaserListItem = styled(ListItem)<{
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
const ReactivationProgress = styled(LinearProgress)(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 5,
  backgroundColor: "transparent",
  "& .MuiLinearProgress-bar": {
    backgroundColor: theme.palette.error.main,
    transition: "none", // We'll handle animation ourselves for smoothness
  },
}));

// Update LaserGrid to be more responsive
const LaserGrid = styled(List)<{ useGridLayout: boolean }>(({ theme, useGridLayout }) => ({
  display: "grid",
  gridTemplateColumns: useGridLayout ? `repeat(auto-fit, minmax(29%, 1fr))` : "1fr",
  gap: theme.spacing(2),
  width: "100%",
  height: "100%",
  padding: theme.spacing(2),
  overflow: "hidden",
  alignContent: "start",
}));

// Update LaserContainer to control height and prevent scrolling
const LaserContainer = styled(Paper)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  borderRadius: theme.spacing(2),
  overflow: "hidden",
  minHeight: 0, // Important for proper flexbox behavior
}));

const GameOverModal = styled(Modal)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const GameOverContent = styled(Paper)(({ theme }) => ({
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

const Game: React.FC = () => {
  const { laserConfig, addHighscore } = useLaserConfig();
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [laserStates, setLaserStates] = useState<{ [id: string]: boolean }>({});
  const [blinkingLasers, setBlinkingLasers] = useState<{ [id: string]: boolean }>({});
  const [reactivationProgress, setReactivationProgress] = useState<{ [id: string]: number }>({});
  const [triggeredCount, setTriggeredCount] = useState(0);
  const [reactivatingLasers, setReactivatingLasers] = useState<{ [id: string]: boolean }>({});
  const [gameOver, setGameOver] = useState(false);
  const [gameSuccess, setGameSuccess] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [showSaveScore, setShowSaveScore] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<UnlistenFn[]>([]);
  const reactivationTimeoutsRef = useRef<{ [id: string]: ReturnType<typeof setTimeout> }>({});
  const reactivationIntervalsRef = useRef<{ [id: string]: ReturnType<typeof setInterval> }>({});

  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [useGridLayout, setUseGridLayout] = useState(false);

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
    setReactivationProgress({}); // Reset progress
    setBlinkingLasers({}); // Reset blinking state
  }, [laserConfig.lasers]);

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      audioManager.stopAllAudio();
    };
  }, []);

  // Setup event listeners for laser triggers and buzzer
  useEffect(() => {
    const setupListeners = async () => {
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

  // Add a separate listener for visual updates that runs regardless of game state
  useEffect(() => {
    const setupVisualListener = async () => {
      // Listen for serial data to update visual state even when game is not running
      const unlistenVisualUpdates = await listen("serial-data", (event) => {
        const values = event.payload as number[];

        // Check each laser to see if it's been triggered (visual only)
        laserConfig.lasers.forEach((laser) => {
          if (laser.enabled && laser.sensorIndex < values.length) {
            const value = values[laser.sensorIndex];
            const normalizedValue = (value / 1023) * 100;
            const isTriggered = normalizedValue < laser.sensitivity;

            // If laser state changes from active to triggered, update visual only when game not running
            if (laserStates[laser.id] && isTriggered && !isGameRunning) {
              updateLaserVisual(laser.id);
            }
          }
        });
      });

      return unlistenVisualUpdates;
    };

    // Only set up this listener when game is NOT running
    if (!isGameRunning) {
      setupVisualListener().then((unlisten) => {
        listenersRef.current.push(unlisten);
      });
    }

    return () => {};
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

  // Calculate if we need grid layout based on container height and laser count
  useEffect(() => {
    if (!containerRef) return;

    const updateLayout = () => {
      const enabledLaserCount = laserConfig.lasers.filter((laser) => laser.enabled).length;
      const containerHeight = containerRef.clientHeight;
      const estimatedItemHeight = 60; // Average height of a laser item in px
      const maxRowsBeforeGrid = Math.floor(containerHeight / estimatedItemHeight) - 1;

      // If we have more lasers than can fit in rows, use grid layout
      setUseGridLayout(enabledLaserCount > maxRowsBeforeGrid);
    };

    // Update layout initially and on resize
    updateLayout();
    window.addEventListener("resize", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, [containerRef, laserConfig.lasers]);

  // Handle buzzer pressed - buzzer is already played in the backend
  const handleBuzzerPressed = async () => {
    await stopGame();
    // stop time, player has won
    setGameSuccess(true);
    setShowSaveScore(true);
    setPlayerName("");

    audioManager.playEffect(SoundEffect.Buzzer);
  };

  // New function to update laser visual state only (no sounds, no counting)
  const updateLaserVisual = (laserId: string) => {
    // Start blinking animation
    setBlinkingLasers((prev) => ({
      ...prev,
      [laserId]: true,
    }));

    // After blinking, RESTORE to active state (red) when game isn't running
    setTimeout(() => {
      setBlinkingLasers((prev) => ({
        ...prev,
        [laserId]: false,
      }));

      // Important change: When not in game, lasers remain red after blinking
      if (!isGameRunning) {
        setLaserStates((prevStates) => ({
          ...prevStates,
          [laserId]: true, // Keep red (active) when not in game
        }));
      }
    }, 900); // 3 blinks at 300ms each = 900ms

    // We don't start reactivation or count when game isn't running
  };

  // Handle laser triggered with new animation logic
  const handleLaserTriggered = (laserId: string) => {
    // Only process if game is running
    if (!isGameRunning) return;

    // Check if this laser is already in reactivation phase - don't count it again
    if (reactivatingLasers[laserId]) {
      return; // Skip if already reactivating
    }

    // Play laser broken sound effect
    audioManager.playEffect(SoundEffect.LaserBroken);

    // Update triggered count
    const newTriggeredCount = triggeredCount + 1;
    setTriggeredCount(newTriggeredCount);

    // Start blinking animation
    setBlinkingLasers((prev) => ({
      ...prev,
      [laserId]: true,
    }));

    // After blinking, set to triggered state (gray)
    setTimeout(() => {
      setBlinkingLasers((prev) => ({
        ...prev,
        [laserId]: false,
      }));
      setLaserStates((prevStates) => ({
        ...prevStates,
        [laserId]: false,
      }));
    }, 900); // 3 blinks at 300ms each = 900ms

    // Reset the laser if reactivation is enabled
    if (laserConfig.gameSettings.reactivateLasers) {
      // Mark this laser as being in reactivation phase
      setReactivatingLasers((prev) => ({
        ...prev,
        [laserId]: true,
      }));

      // Clear any existing timeout and interval for this laser
      if (reactivationTimeoutsRef.current[laserId]) {
        clearTimeout(reactivationTimeoutsRef.current[laserId]);
      }
      if (reactivationIntervalsRef.current[laserId]) {
        clearInterval(reactivationIntervalsRef.current[laserId]);
      }

      // Initialize progress
      setReactivationProgress((prev) => ({
        ...prev,
        [laserId]: 0,
      }));

      // Set up progress updating interval
      const reactivationTime = laserConfig.gameSettings.reactivationTimeSeconds * 1000;
      const updateInterval = 50; // Update progress every 50ms for smooth animation
      const totalSteps = reactivationTime / updateInterval;
      let currentStep = 0;

      reactivationIntervalsRef.current[laserId] = setInterval(() => {
        currentStep++;
        const newProgress = Math.min(100, (currentStep / totalSteps) * 100);

        setReactivationProgress((prev) => ({
          ...prev,
          [laserId]: newProgress,
        }));

        if (currentStep >= totalSteps) {
          clearInterval(reactivationIntervalsRef.current[laserId]);
          delete reactivationIntervalsRef.current[laserId];
        }
      }, updateInterval);

      // Set new timeout for reactivation completion
      reactivationTimeoutsRef.current[laserId] = setTimeout(async () => {
        // Check if game is still running before reactivating
        if (!isGameRunning) return;

        // Find the laser for this id
        const laser = laserConfig.lasers.find((l) => l.id === laserId);
        if (laser) {
          try {
            // Update UI
            setLaserStates((prevStates) => ({
              ...prevStates,
              [laserId]: true,
            }));

            // Mark laser as no longer reactivating
            setReactivatingLasers((prev) => {
              const newState = { ...prev };
              delete newState[laserId];
              return newState;
            });

            // Reset progress after activation
            setTimeout(() => {
              setReactivationProgress((prev) => {
                const newProgress = { ...prev };
                delete newProgress[laserId];
                return newProgress;
              });
            }, 200);

            console.log(`Reactivated laser ${laser.name} (sensor index: ${laser.sensorIndex})`);
          } catch (error) {
            console.error("Failed to reactivate laser:", error);
          }
        }

        // Remove the timeout reference after completion
        delete reactivationTimeoutsRef.current[laserId];
      }, reactivationTime);
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
    audioManager.playEffect(SoundEffect.GameOver);
    audioManager.stopBackgroundMusic();
    setIsGameRunning(false);
    setGameOver(true);
    setGameSuccess(false); // Game over means failure
  };

  const startGame = async () => {
    // Clear all reactivation timeouts and intervals first
    Object.keys(reactivationTimeoutsRef.current).forEach((id) => {
      clearTimeout(reactivationTimeoutsRef.current[id]);
    });
    Object.keys(reactivationIntervalsRef.current).forEach((id) => {
      clearInterval(reactivationIntervalsRef.current[id]);
    });
    reactivationTimeoutsRef.current = {};
    reactivationIntervalsRef.current = {};

    // Reset reactivating lasers state
    setReactivatingLasers({});

    // Reset all game state
    setGameTime(0);
    setTriggeredCount(0);
    setGameOver(false);
    setGameSuccess(false);
    setBlinkingLasers({});
    setReactivationProgress({});

    // Reset all lasers to active immediately
    const initialStates: { [id: string]: boolean } = {};
    laserConfig.lasers.forEach((laser) => {
      if (laser.enabled) {
        initialStates[laser.id] = true;
      }
    });
    setLaserStates(initialStates);

    // Play start sound and begin background music
    audioManager.playEffect(SoundEffect.GameStart);
    audioManager.startBackgroundMusic();

    setIsGameRunning(true);
  };

  const stopGame = async () => {
    // Always play finish sound when button is clicked
    audioManager.playEffect(SoundEffect.Buzzer);

    // Don't show success if game was never running
    if (isGameRunning) {
      setGameOver(true);
      setGameSuccess(true); // Manual stop means success!
      // Show save score UI if game was successful
      setShowSaveScore(true);
    }

    audioManager.stopBackgroundMusic();
    setIsGameRunning(false);

    // Clear all reactivation timeouts and intervals
    Object.keys(reactivationTimeoutsRef.current).forEach((id) => {
      clearTimeout(reactivationTimeoutsRef.current[id]);
    });
    Object.keys(reactivationIntervalsRef.current).forEach((id) => {
      clearInterval(reactivationIntervalsRef.current[id]);
    });
    reactivationTimeoutsRef.current = {};
    reactivationIntervalsRef.current = {};

    // Clear animation states and reactivating lasers tracking
    setBlinkingLasers({});
    setReactivationProgress({});
    setReactivatingLasers({});
  };

  const resetGame = async () => {
    audioManager.stopAllAudio();

    // Reset all game state
    setIsGameRunning(false);
    setGameTime(0);
    setTriggeredCount(0);
    setGameOver(false);
    setGameSuccess(false);
    setShowSaveScore(false);
    setPlayerName("");
    setBlinkingLasers({});
    setReactivationProgress({});
    setReactivatingLasers({});

    // Reset all lasers to active
    const initialStates: { [id: string]: boolean } = {};
    laserConfig.lasers.forEach((laser) => {
      if (laser.enabled) {
        initialStates[laser.id] = true;
      }
    });
    setLaserStates(initialStates);

    // Clear all reactivation timeouts and intervals
    Object.keys(reactivationTimeoutsRef.current).forEach((id) => {
      clearTimeout(reactivationTimeoutsRef.current[id]);
    });
    Object.keys(reactivationIntervalsRef.current).forEach((id) => {
      clearInterval(reactivationIntervalsRef.current[id]);
    });
    reactivationTimeoutsRef.current = {};
    reactivationIntervalsRef.current = {};
  };

  const handleCloseGameOver = async () => {
    setGameOver(false);
    setShowSaveScore(false);
  };

  const handleSaveScore = async () => {
    if (playerName.trim() === "") {
      return; // Don't save if name is empty
    }

    await addHighscore({
      name: playerName,
      time: gameTime,
      touchedLasers: triggeredCount,
      maxAllowedTouches: laserConfig.gameSettings.maxAllowedTouches,
      reactivationEnabled: laserConfig.gameSettings.reactivateLasers,
      reactivationTimeSeconds: laserConfig.gameSettings.reactivationTimeSeconds,
    });

    // Play success sound
    audioManager.playEffect(SoundEffect.GameStart);

    // Hide save score UI after saving
    setShowSaveScore(false);
    setPlayerName("");
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        p: 3,
        backgroundColor: "#111",
        minHeight: "100vh",
        height: "100vh", // Ensure it takes full viewport height
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // Prevent scrolling
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
          mb: 2, // Reduced margin to provide more space for lasers
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

      {/* Laser Grid - optimized with adaptive layout and animations */}
      <LaserContainer elevation={3} ref={(el) => setContainerRef(el)}>
        <LaserGrid useGridLayout={useGridLayout}>
          {laserConfig.lasers
            .filter((laser) => laser.enabled)
            .sort((a, b) => a.order - b.order)
            .map((laser) => (
              <Fade key={laser.id} in={true} timeout={300}>
                <LaserListItem
                  active={laserStates[laser.id] || false}
                  blinking={blinkingLasers[laser.id] || false}
                  sx={{
                    height: useGridLayout ? "auto" : "100%",
                    minHeight: useGridLayout ? 50 : 60,
                  }}
                >
                  <Typography
                    variant={useGridLayout ? "h6" : "h5"} // Smaller text for grid mode
                    component="div"
                    sx={{
                      textAlign: "center",
                      fontWeight: "bold",
                      color: laserStates[laser.id] ? "white" : "rgba(255,255,255,0.6)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      zIndex: 2, // Keep text above progress bar
                    }}
                  >
                    {laser.name}
                  </Typography>

                  {/* Reactivation Progress Bar */}
                  {!laserStates[laser.id] &&
                    reactivationProgress[laser.id] !== undefined &&
                    laserConfig.gameSettings.reactivateLasers && (
                      <ReactivationProgress
                        variant="determinate"
                        value={reactivationProgress[laser.id] || 0}
                      />
                    )}
                </LaserListItem>
              </Fade>
            ))}
        </LaserGrid>
      </LaserContainer>

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
            {gameSuccess ? "GESCHAFFT!" : "GAME OVER"}
          </Typography>
          <Typography variant="h4" color="white" sx={{ mb: 8, textAlign: "center" }}>
            {gameSuccess
              ? "Glückwunsch! Du hast es geschafft!"
              : "Du hast es leider nicht geschafft. Versuche es erneut!"}
          </Typography>
          <Typography variant="h5" color="white" sx={{ mb: 1 }}>
            Deine Zeit:
          </Typography>
          <Typography
            variant="h2"
            color="white"
            sx={{ mb: 8, fontFamily: "'Digital-7', monospace" }}
          >
            {formatTime(gameTime)}
          </Typography>

          {gameSuccess && showSaveScore && (
            <Box
              sx={{
                width: "100%",
                maxWidth: "450px",
                mb: 4,
              }}
            >
              <Typography variant="h6" color="white" sx={{ mb: 2 }} align="center">
                Speichere deine Zeit in den Highscores!
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                label="Spielername"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                sx={{
                  mb: 2,
                  input: { color: "white" },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover fieldset": { borderColor: "white" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  },
                  "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.7)" },
                }}
              />
              <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSaveScore}
                  startIcon={<SaveIcon />}
                  disabled={!playerName.trim()}
                >
                  Zeiten speichern
                </Button>
              </Box>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={resetGame}
              startIcon={<RestartAltIcon />}
            >
              Neues Spiel
            </Button>
            <Button variant="outlined" size="large" color="error" onClick={handleCloseGameOver}>
              Schließen
            </Button>
          </Box>
        </GameOverContent>
      </GameOverModal>
    </Container>
  );
};

export default Game;
