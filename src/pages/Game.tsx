import React from "react";
import {
  Box,
  Typography,
  Button,
  Container,
  Chip,
  Fade,
  TextField,
  Autocomplete,
} from "@mui/material";
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
  BigCountdownOverlay,
} from "../components/GameComponents";
// Import custom hook
import { useGameLogic } from "../hooks/useGameLogic";
// Import utility
import { formatTime } from "../utils/gameUtils";
import { audioManager, SoundEffect } from "../audioManager";

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
    displayasgridlayout,
    countdown,
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
        position: "relative", // Add position relative for the overlay
      }}
    >
      {/* Countdown Overlay */}
      {countdown !== "" && (
        <BigCountdownOverlay>
          <Typography
            variant="h1"
            sx={{
              fontSize: "40rem",
              fontWeight: "1000",
              fontFamily: "Roboto, sans-serif",
              color: "#FFF",
              // red text shadow/glow for visibility
              textShadow:
                "-20px -20px 60px rgba(255,0,0,0.8), 20px -20px 60px rgba(255,0,0,0.8), -20px 20px 60px rgba(255,0,0,0.8), 20px 20px 60px rgba(255,0,0,0.8)",

              // Amination for countdown
              animation: "pulse 0.8s infinite",
              "@keyframes pulse": {
                "0%": { transform: "scale(1)" },
                "50%": { transform: "scale(1.1)" },
                "100%": { transform: "scale(1)" },
              },
            }}
          >
            {countdown}
          </Typography>
        </BigCountdownOverlay>
      )}

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
            onClick={() => {
              audioManager.playEffect(SoundEffect.Click);
              startGame();
            }}
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
            onClick={() => {
              audioManager.playEffect(SoundEffect.Click);
              stopGame();
            }}
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
            onClick={() => {
              audioManager.playEffect(SoundEffect.Click);
              resetGame();
            }}
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
        <LaserGrid displayasgridlayout={displayasgridlayout}>
          {laserConfig.lasers
            .filter((laser) => laser.enabled)
            .sort((a, b) => a.order - b.order)
            .map((laser) => (
              <Fade key={laser.id} in={true} timeout={300}>
                <LaserListItem
                  active={laserStates[laser.id] || false}
                  blinking={blinkingLasers[laser.id] || false}
                  sx={{
                    height: displayasgridlayout ? "auto" : "100%",
                    minHeight: displayasgridlayout ? 50 : 60,
                  }}
                >
                  <Typography
                    variant={displayasgridlayout ? "h6" : "h5"} // Smaller text for grid mode
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
              mb: 4,
              textTransform: "uppercase",
              fontWeight: 900,
              letterSpacing: "4px",
              textShadow: gameSuccess
                ? "0 0 20px rgba(0, 255, 0, 0.9), 0 0 30px rgba(0, 255, 0, 0.7)"
                : "0 0 20px rgba(255, 0, 0, 0.9), 0 0 30px rgba(255, 0, 0, 0.7)",
              fontSize: { xs: "3.5rem", sm: "5rem" },
              textAlign: "center",
              color: gameSuccess ? "#ceffce" : "#ffcece",
              backgroundClip: "text",
              // WebkitBackgroundClip: "text",
              // WebkitTextFillColor: "transparent",
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%": { transform: "scale(1)" },
                "50%": { transform: "scale(1.05)" },
                "100%": { transform: "scale(1)" },
              },
            }}
          >
            {gameSuccess ? "Geschafft!" : "Game Over"}
          </Typography>

          {/* Time Display - Bigger with no box */}
          <Typography
            variant="h6"
            color="white"
            sx={{
              opacity: 0.8,
              textAlign: "center",
              mb: 0,
            }}
          >
            Zeit
          </Typography>
          <Typography
            variant="h1"
            color="white"
            sx={{
              fontFamily: "'Digital-7', monospace",
              fontSize: { xs: "5rem", sm: "8rem" },
              textShadow: "0 0 10px rgba(255,255,255,0.6)",
              mb: 4,
              textAlign: "center",
            }}
          >
            {formatTime(gameTime)}
          </Typography>

          {/* Lasers Hit - Simple big counter */}
          <Box
            sx={{
              textAlign: "center",
              mb: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="h2"
              sx={{
                mb: 4,
                textAlign: "center",
                fontWeight: "bold",
                color: "white",
                textShadow:
                  triggeredCount > 0 ? "0 0 10px rgba(255,0,0,0.6)" : "0 0 10px rgba(0,255,0,0.6)",
              }}
            >
              {triggeredCount} /{" "}
              {laserConfig.gameSettings.maxAllowedTouches > 0
                ? laserConfig.gameSettings.maxAllowedTouches
                : "∞"}{" "}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                mb: 4,
                textAlign: "center",
                fontWeight: "bold",
                color: "white",
                textShadow:
                  triggeredCount > 0 ? "0 0 10px rgba(255,0,0,0.6)" : "0 0 10px rgba(0,255,0,0.6)",
              }}
            >
              Laser getroffen
            </Typography>
          </Box>

          {gameSuccess && showSaveScore && (
            <Box
              sx={{
                width: "100%",
                maxWidth: "550px",
                mb: 4,
              }}
            >
              <Typography variant="h6" color="white" sx={{ mb: 2 }} align="center">
                Highscore speichern
              </Typography>

              <Autocomplete
                freeSolo
                // Get player names from highscores, remove duplicates
                options={laserConfig.highscores
                  .map((score) => score.name)
                  .filter((name, index, self) => self.indexOf(name) === index)}
                onInputChange={(_e, value) => setPlayerName(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    variant="outlined"
                    label="Spielername"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    sx={{
                      mb: 3,
                      input: { color: "white", fontSize: "1.2rem", padding: "15px 14px" },
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.5)", borderWidth: 2 },
                        "&:hover fieldset": { borderColor: "white" },
                        "&.Mui-focused fieldset": { borderColor: "primary.main" },
                      },
                      "& .MuiInputLabel-root": {
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "1.2rem",
                        transform: "translate(14px, 16px) scale(1)",
                      },
                      "& .MuiInputLabel-shrink": {
                        transform: "translate(14px, -6px) scale(0.75)",
                      },
                    }}
                  />
                )}
              />
              <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSaveScore}
                  startIcon={<SaveIcon />}
                  disabled={!playerName.trim()}
                  sx={{
                    py: 1.5,
                    px: 4,
                    fontSize: "1.1rem",
                    boxShadow: "0 0 15px rgba(255,0,0,0.5)",
                  }}
                >
                  Speichern
                </Button>
              </Box>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 3, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => {
                audioManager.playEffect(SoundEffect.Click);
                resetGame();
              }}
              startIcon={<RestartAltIcon />}
              sx={{
                py: 1.5,
                px: 3,
                fontSize: "1.1rem",
                boxShadow: "0 0 15px rgba(255,0,0,0.5)",
              }}
            >
              Neues Spiel
            </Button>
            <Button
              variant="outlined"
              size="large"
              color="error"
              onClick={() => {
                audioManager.playEffect(SoundEffect.Click);
                handleCloseGameOver();
              }}
              sx={{
                py: 1.5,
                px: 3,
                fontSize: "1.1rem",
              }}
            >
              Schließen
            </Button>
          </Box>
        </GameOverContent>
      </GameOverModal>
    </Container>
  );
};

export default Game;
