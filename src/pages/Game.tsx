import React from "react";
import { Box, Typography, Button, Container, Chip, Fade, TextField } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
// Import styled components
import {
  TimerDisplay,
  GameStatBox,
  LaserListItem,
  LaserGrid,
  LaserContainer,
  GameOverModal,
  GameOverContent,
  ReactivationProgress,
} from "../components/GameComponents";
// Import custom hook
import { useGameLogic } from "../hooks/useGameLogic";
// Import utility
import { formatTime } from "../utils/gameUtils";

const Game: React.FC = () => {
  const {
    isGameRunning,
    gameTime,
    laserStates,
    blinkingLasers,
    reactivationProgress,
    triggeredCount,
    gameOver,
    gameSuccess,
    playerName,
    showSaveScore,
    useGridLayout,
    setContainerRef,
    setPlayerName,
    startGame,
    stopGame,
    resetGame,
    handleCloseGameOver,
    handleSaveScore,
    laserConfig,
  } = useGameLogic();

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
