import { useState, useEffect, useRef } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useLaserConfig } from "../context/LaserConfigContext";
import { audioManager, SoundEffect } from "../audioManager";

export const useGameLogic = () => {
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
  const [isStartButtonActive, setIsStartButtonActive] = useState(false);

  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [useGridLayout, setUseGridLayout] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<UnlistenFn[]>([]);
  const reactivationTimeoutsRef = useRef<{ [id: string]: ReturnType<typeof setTimeout> }>({});
  const reactivationIntervalsRef = useRef<{ [id: string]: ReturnType<typeof setInterval> }>({});

  // Keep track of the last game start time to prevent multiple starts
  const lastGameStartRef = useRef<number>(0);

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
    // Clean up any existing listeners first to prevent duplicates
    listenersRef.current.forEach(async (unlisten) => await unlisten());
    listenersRef.current = [];

    const setupListeners = async () => {
      // Listen for serial data to detect laser breaks
      const unlistenSerialData = await listen("serial-data", (event) => {
        // Only process serial data if game is running
        if (!isGameRunning) return;

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

      // Listen for start button events with debounce
      const unlistenStartButton = await listen("start-button", () => {
        // Debounce: prevent multiple start events within 1 second
        const now = Date.now();
        if (now - lastGameStartRef.current < 1000) {
          console.log("Start button debounced");
          return;
        }

        if (!isStartButtonActive) {
          setIsStartButtonActive(true);
          lastGameStartRef.current = now;

          // If game is already running, stop it first then start new one
          if (isGameRunning) {
            resetGame().then(() => {
              setTimeout(() => {
                startGame();
                setIsStartButtonActive(false);
              }, 300);
            });
          } else {
            startGame();
            setTimeout(() => setIsStartButtonActive(false), 500);
          }
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
      listenersRef.current = [];
    };
  }, [isGameRunning, laserConfig.lasers, laserStates, isStartButtonActive]);

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
  };

  // Handle laser triggered with animation logic
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

  // Handle buzzer pressed
  const handleBuzzerPressed = async () => {
    await stopGame();
    // stop time, player has won
    setGameSuccess(true);
    setShowSaveScore(true);
    setPlayerName("");

    audioManager.playEffect(SoundEffect.Buzzer);
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
    // If a game is already running, reset it first
    if (isGameRunning) {
      await resetGame();
    }

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
    lastGameStartRef.current = Date.now(); // Update last start time
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
    // Stop all sounds first
    audioManager.stopAllAudio();

    // Clear running timer if any
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

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

  const handleCloseGameOver = () => {
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

  return {
    // Game state
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

    // Methods
    setContainerRef,
    setPlayerName,
    startGame,
    stopGame,
    resetGame,
    handleCloseGameOver,
    handleSaveScore,

    // Config access
    laserConfig,
  };
};
