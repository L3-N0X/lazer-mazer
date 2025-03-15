/**
 * Format a time in milliseconds to a display string MM:SS.ms
 */
export const formatTime = (timeMs: number): string => {
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);
  const ms = Math.floor((timeMs % 1000) / 10);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${ms
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Game state manager singleton to prevent multiple games running simultaneously
 */
export const GameStateManager = {
  isAnyGameRunning: false,

  startGame: (): boolean => {
    if (GameStateManager.isAnyGameRunning) {
      console.warn("Attempted to start a game while another is running");
      return false;
    }
    GameStateManager.isAnyGameRunning = true;
    return true;
  },

  endGame: (): void => {
    GameStateManager.isAnyGameRunning = false;
  },

  canStartGame: (): boolean => {
    return !GameStateManager.isAnyGameRunning;
  },
};
