import { useState, useEffect, useRef } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useLaserConfig } from "../context/LaserConfigContext";
import { audioManager, SoundEffect } from "../audioManager";
import { Logger } from "../utils/Logger"; // Import the Logger

// Add debugging counters
let listenerSetupCount = 0;
let eventHandlerCalls = {
  "start-button": 0,
  buzzer: 0,
  "laser-sensor-data": 0,
};

export const useGameLogic = () => {
  const { laserConfig, addHighscore } = useLaserConfig();
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [laserActivationMap, setLaserActivationMap] = useState<{ [id: string]: boolean }>({});
  const [blinkingLasers, setBlinkingLasers] = useState<{ [id: string]: boolean }>({});
  const [reactivationProgress, setReactivationProgress] = useState<{ [id: string]: number }>({});
  const [triggeredCount, setTriggeredCount] = useState(0);
  const [reactivatingLasers, setReactivatingLasers] = useState<{ [id: string]: boolean }>({});
  const [gameOver, setGameOver] = useState(false);
  const [gameSuccess, setGameSuccess] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [showSaveScore, setShowSaveScore] = useState(false);
  const [countdown, setCountdown] = useState("");

  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const [displayasgridlayout, setUseGridLayout] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenersRef = useRef<UnlistenFn[]>([]);
  const listenerIdRef = useRef<number>(0); // Add a unique ID for each listener registration
  const reactivationTimeoutsRef = useRef<{ [id: string]: ReturnType<typeof setTimeout> }>({});
  const reactivationIntervalsRef = useRef<{ [id: string]: ReturnType<typeof setInterval> }>({});
  const animationTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastSoundPlayedRef = useRef<{ [key: string]: number }>({});
  const gameOverRef = useRef(false);
  // Add this new ref for the start button debounce
  const lastStartButtonPressRef = useRef<number>(0);
  // Add this new ref to track lasers currently being processed
  const processingLasersRef = useRef<{ [id: string]: boolean }>({});

  // Initialize laser states based on config
  useEffect(() => {
    const initialStates: { [id: string]: boolean } = {};
    laserConfig.lasers.forEach((laser) => {
      if (laser.enabled) {
        initialStates[laser.id] = true;
      }
    });
    setLaserActivationMap(initialStates);
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
    Logger.log("EVENT SETUP EFFECT TRIGGERED with deps:", {
      isGameRunning,
      lasersLength: laserConfig.lasers.length,
      activationMapSize: Object.keys(laserActivationMap).length,
      reactivatingCount: Object.keys(reactivatingLasers).length,
    });

    const currentListenerId = ++listenerIdRef.current;
    Logger.log(
      `🔊 Setting up listeners #${currentListenerId} (total setups: ${++listenerSetupCount})`
    );

    // We still want to track if this setup is current
    let isCurrentSetup = true;

    // Store listeners for this particular setup cycle
    let currentListeners: UnlistenFn[] = [];

    // Wait a bit before cleaning up previous listeners to avoid race conditions
    setTimeout(() => {
      // If this setup is no longer relevant, don't proceed
      if (!isCurrentSetup) {
        Logger.log(`⏱️ Delayed cleanup skipped - setup #${currentListenerId} no longer current`);
        return;
      }

      // Clean up any existing listeners
      const cleanupPromises = listenersRef.current.map((unlisten) => {
        try {
          return unlisten();
        } catch (e) {
          console.error("Error in listener cleanup:", e);
          return Promise.resolve();
        }
      });

      // Reset the listeners array before waiting for cleanup to complete
      listenersRef.current = [];

      Promise.all(cleanupPromises).then(() => {
        Logger.log(`✅ Cleaned up previous listeners before setup #${currentListenerId}`);

        if (!isCurrentSetup) {
          Logger.log(`🚫 Setup #${currentListenerId} aborted - no longer current after cleanup`);
          return;
        }

        const setupListeners = async () => {
          try {
            // Listen for serial data to detect laser breaks
            const unlistenSerialData = await listen("laser-sensor-data", (event) => {
              eventHandlerCalls["laser-sensor-data"]++;

              const values = event.payload as number[];

              // Check each laser to see if it's been triggered
              laserConfig.lasers.forEach((laser) => {
                if (laser.enabled && laser.sensorIndex < values.length) {
                  const value = values[laser.sensorIndex];
                  const normalizedValue = (value / 1023) * 100;
                  const isTriggered = normalizedValue < laser.sensitivity;

                  // Only trigger if:
                  // 1. Laser is active (red)
                  // 2. Laser is triggered (beam broken)
                  // 3. Laser is not currently in reactivation phase
                  // 4. Laser is not currently being processed
                  if (
                    laserActivationMap[laser.id] &&
                    isTriggered &&
                    !reactivatingLasers[laser.id] &&
                    !processingLasersRef.current[laser.id] &&
                    isGameRunning
                  ) {
                    handleLaserTriggered(laser.id);
                  } else if (isTriggered && !isGameRunning) {
                    // If game is not running, update visual state only
                    updateLaserVisual(laser.id);
                  }
                }
              });
            });

            currentListeners.push(unlistenSerialData);

            // Listen for buzzer events
            const unlistenBuzzer = await listen("buzzer", () => {
              eventHandlerCalls["buzzer"]++;
              Logger.log(`Buzzer pressed (handler call #${eventHandlerCalls["buzzer"]})`);

              if (isGameRunning) {
                handleBuzzerPressed();
              }
            });

            currentListeners.push(unlistenBuzzer);

            // Start button listener with debounce logic
            const startButtonDebounceMs = 1000;
            const unlistenStartButton = await listen("start-button", () => {
              eventHandlerCalls["start-button"]++;
              const now = Date.now();
              const timeSinceLastPress = now - lastStartButtonPressRef.current;

              Logger.log(
                `Start button pressed (handler call #${eventHandlerCalls["start-button"]}, time since last: ${timeSinceLastPress}ms)`
              );

              if (timeSinceLastPress < startButtonDebounceMs) {
                Logger.log(
                  `🛑 Ignoring due to debounce (${timeSinceLastPress}ms < ${startButtonDebounceMs}ms)`
                );
                return;
              }

              lastStartButtonPressRef.current = now;

              // Important debug to see if handler code is reached
              Logger.log("👆 START BUTTON HANDLER CODE REACHED - STARTING GAME");

              if (isGameRunning) {
                resetGame().then(() => {
                  setTimeout(() => {
                    startGame();
                  }, 300);
                });
              } else {
                startGame();
              }
            });

            currentListeners.push(unlistenStartButton);

            // Only update the main ref if this setup is still current
            if (isCurrentSetup && currentListenerId === listenerIdRef.current) {
              listenersRef.current = currentListeners;
              Logger.log(
                `✅ Listeners setup #${currentListenerId} completed with ${listenersRef.current.length} listeners`
              );
            } else {
              Logger.log(
                `🚫 Setup #${currentListenerId} completed but is no longer current, cleaning up...`
              );
              // Clean up the listeners we just created if they're no longer needed
              await Promise.all(currentListeners.map((unlisten) => unlisten()));
            }
          } catch (error) {
            Logger.error(`❌ Error setting up listeners #${currentListenerId}:`, error);
          }
        };

        setupListeners();
      });
    }, 100); // Small delay to avoid immediate cleanup issues

    // Cleanup function
    return () => {
      Logger.log(`🧹 Cleanup for listener setup #${currentListenerId} triggered`);
      isCurrentSetup = false; // Mark this setup as no longer current

      // We don't immediately clean up listeners here, as that can cause issues
      // if the component is re-rendered quickly. The new setup will handle cleanup.
      // This helps with React's strict mode and development double-rendering.
    };
  }, [isGameRunning]);

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
    const visualTimeout = setTimeout(() => {
      setBlinkingLasers((prev) => ({
        ...prev,
        [laserId]: false,
      }));

      // Important change: When not in game, lasers remain red after blinking
      if (!isGameRunning) {
        setLaserActivationMap((prevStates) => ({
          ...prevStates,
          [laserId]: true, // Keep red (active) when not in game
        }));
      }
    }, 900); // 3 blinks at 300ms each = 900ms

    // Store timeout for potential reset
    animationTimeoutsRef.current.push(visualTimeout);
  };

  // Handle laser triggered with animation logic - modified for better reactivation logic
  const handleLaserTriggered = (laserId: string) => {
    // Only process if game is running
    if (!isGameRunning) return;

    // Double-check if this laser is already in reactivation phase or not active - don't count it again
    if (reactivatingLasers[laserId] || !laserActivationMap[laserId]) {
      return; // Skip if already reactivating or not active
    }

    // Immediately mark this laser as being processed to prevent multiple triggers
    processingLasersRef.current[laserId] = true;

    // Play laser broken sound effect only if game is running - now with debounce
    if (isGameRunning) {
      playDebouncedSound(SoundEffect.LaserBroken);
    }

    // Immediately mark this laser as being in triggered state to prevent rapid retriggering
    // This is in addition to the reactivatingLasers state which gets set after blinking
    setLaserActivationMap((prevStates) => ({
      ...prevStates,
      [laserId]: false, // Set to false (gray/off) right away
    }));

    // Start blinking animation
    setBlinkingLasers((prev) => ({
      ...prev,
      [laserId]: true,
    }));

    // Use function form of setTriggeredCount to avoid race conditions with multiple lasers
    setTriggeredCount((prevCount) => {
      const newCount = prevCount + 1;

      // Check if max triggers reached - moved inside to use the updated count
      if (
        laserConfig.gameSettings.maxAllowedTouches > 0 &&
        newCount >= laserConfig.gameSettings.maxAllowedTouches
      ) {
        // Check if game over has already been triggered
        if (!gameOverRef.current) {
          gameOverRef.current = true;
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            handleGameOver();
            gameOverRef.current = false; // Reset the ref after game over
          }, 0);
        }
      }

      return newCount;
    });

    // After blinking, ensure triggered state and start reactivation if enabled
    const blinkTimeout = setTimeout(() => {
      setBlinkingLasers((prev) => ({
        ...prev,
        [laserId]: false,
      }));

      // Reset the laser if reactivation is enabled - move here to sync with end of blinking
      if (laserConfig.gameSettings.reactivateLasers) {
        startLaserReactivation(laserId);
      }
    }, 900); // 3 blinks at 300ms each = 900ms

    // Store the timeout reference so it can be cleared during reset
    animationTimeoutsRef.current.push(blinkTimeout);
  };

  // New function to separate reactivation logic for better organization
  const startLaserReactivation = (laserId: string) => {
    // Mark this laser as being in reactivation phase
    setReactivatingLasers((prev) => ({
      ...prev,
      [laserId]: true,
    }));

    // Remove from processing list as we're now in reactivation phase
    delete processingLasersRef.current[laserId];

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
          setLaserActivationMap((prevStates) => ({
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

          Logger.log(`Reactivated laser ${laser.name} (sensor index: ${laser.sensorIndex})`);
        } catch (error) {
          console.error("Failed to reactivate laser:", error);
        }
      }

      // Remove the timeout reference after completion
      delete reactivationTimeoutsRef.current[laserId];
    }, reactivationTime);
  };

  // Handle buzzer pressed - updated to ensure proper sound control
  const handleBuzzerPressed = async () => {
    await stopGame();
    // stop time, player has won
    setGameSuccess(true);
    setShowSaveScore(true);
    setPlayerName("");

    // Only play buzzer sound when stopping an active game
    if (isGameRunning) {
      playDebouncedSound(SoundEffect.Buzzer);
    }
  };

  // Handle game over - updated to ensure proper sound control
  const handleGameOver = async () => {
    // Only play game over sound if the game is running
    if (isGameRunning) {
      playDebouncedSound(SoundEffect.GameOver);
      audioManager.stopBackgroundMusic();
    }

    setIsGameRunning(false);
    setGameOver(true);
    setGameSuccess(false); // Game over means failure
  };

  const startGame = async () => {
    // Reset sound debouncing tracker
    lastSoundPlayedRef.current = {};

    // Reset reactivating lasers state
    setReactivatingLasers({});

    // Reset all game state
    setGameTime(0);
    setTriggeredCount(0);
    setGameOver(false);
    setGameSuccess(false);
    setBlinkingLasers({});
    setReactivationProgress({});

    // If a game is already running, reset it first
    if (isGameRunning) {
      await resetGame();
    }

    // Play 3sec long countdown sound
    playDebouncedSound(SoundEffect.Countdown, 3000);

    // Show countdown animation
    setCountdown("3");
    await new Promise((resolve) => setTimeout(resolve, 800));
    setCountdown("2");
    await new Promise((resolve) => setTimeout(resolve, 800));
    setCountdown("1");
    await new Promise((resolve) => setTimeout(resolve, 700));
    setCountdown("GO!");
    await new Promise((resolve) => setTimeout(resolve, 500));
    setCountdown("");

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

    setIsGameRunning(true);

    // Reset all lasers to active immediately
    const initialStates: { [id: string]: boolean } = {};
    laserConfig.lasers.forEach((laser) => {
      if (laser.enabled) {
        initialStates[laser.id] = true;
      }
    });
    setLaserActivationMap(initialStates);

    // Play start sound and begin background music
    audioManager.startBackgroundMusic();
  };

  const stopGame = async () => {
    // Don't show success if game was never running
    const wasRunning = isGameRunning;

    if (wasRunning) {
      setGameOver(true);
      setGameSuccess(true); // Finish or buzzer means success!
      // Show save score UI if game was successful
      setShowSaveScore(true);
    }

    audioManager.stopBackgroundMusic();
    setIsGameRunning(false);

    // Clear all animation timeouts
    animationTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    animationTimeoutsRef.current = [];

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

    // Only play finish sound when button is clicked during an active game
    if (wasRunning) {
      playDebouncedSound(SoundEffect.Buzzer);
    }
  };

  const resetGame = async () => {
    // Reset sound debouncing tracker
    lastSoundPlayedRef.current = {};

    // Reset the processing lasers tracker
    processingLasersRef.current = {};

    // Stop all sounds immediately
    audioManager.stopAllAudio();

    // Clear running game timer if any
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Clear ALL animation timeouts
    animationTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    animationTimeoutsRef.current = [];

    // Clear all reactivation timeouts and intervals
    Object.keys(reactivationTimeoutsRef.current).forEach((id) => {
      clearTimeout(reactivationTimeoutsRef.current[id]);
    });
    Object.keys(reactivationIntervalsRef.current).forEach((id) => {
      clearInterval(reactivationIntervalsRef.current[id]);
    });
    reactivationTimeoutsRef.current = {};
    reactivationIntervalsRef.current = {};

    // Force stop any ongoing animations by immediately setting states
    setBlinkingLasers({});
    setReactivationProgress({});
    setReactivatingLasers({});

    // Reset all game state variables
    setIsGameRunning(false);
    setGameTime(0);
    setTriggeredCount(0);
    setGameOver(false);
    setGameSuccess(false);
    setShowSaveScore(false);
    setPlayerName("");

    // Reset all lasers to active
    const initialStates: { [id: string]: boolean } = {};
    laserConfig.lasers.forEach((laser) => {
      if (laser.enabled) {
        initialStates[laser.id] = true;
      }
    });
    setLaserActivationMap(initialStates);
  };

  const handleCloseGameOver = () => {
    setGameOver(false);
    setShowSaveScore(false);
    setIsGameRunning(false);
    setGameSuccess(false);
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

    // Play success sound with debounce
    playDebouncedSound(SoundEffect.GameStart);

    // Hide save score UI after saving
    setShowSaveScore(false);
    setPlayerName("");
  };

  const playDebouncedSound = (sound: SoundEffect, soundDebounceTime = 150) => {
    const now = Date.now();
    const lastPlayed = lastSoundPlayedRef.current[sound] || 0;

    // Only play if enough time has passed since last play
    if (now - lastPlayed > soundDebounceTime) {
      audioManager.playEffect(sound);
      lastSoundPlayedRef.current[sound] = now;
    }
  };

  return {
    // Game state
    isGameRunning,
    gameTime,
    laserStates: laserActivationMap,
    blinkingLasers,
    reactivationProgress,
    triggeredCount,
    gameOver,
    gameSuccess,
    playerName,
    showSaveScore,
    displayasgridlayout,
    countdown,

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
