import { useState, useEffect, useCallback } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

export interface DebugMonitorState {
  serialData: number[];
  rawMessages: string[];
  buzzerEvents: string[];
  startEvents: string[];
  isPaused: boolean;
  frozenSerialData: number[];
  frozenMessages: string[];
  frozenBuzzerEvents: string[];
  frozenStartEvents: string[];
}

export const useDebugMonitor = () => {
  const [serialData, setSerialData] = useState<number[]>([]);
  const [rawMessages, setRawMessages] = useState<string[]>([]);
  const [buzzerEvents, setBuzzerEvents] = useState<string[]>([]);
  const [startEvents, setStartEvents] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [listeners, setListeners] = useState<UnlistenFn[]>([]);

  // Freeze the state when paused
  const [frozenSerialData, setFrozenSerialData] = useState<number[]>([]);
  const [frozenMessages, setFrozenMessages] = useState<string[]>([]);
  const [frozenBuzzerEvents, setFrozenBuzzerEvents] = useState<string[]>([]);
  const [frozenStartEvents, setFrozenStartEvents] = useState<string[]>([]);

  // Display data should use frozen state when paused
  const displaySerialData = isPaused ? frozenSerialData : serialData;
  const displayMessages = isPaused ? frozenMessages : rawMessages;
  const displayBuzzerEvents = isPaused ? frozenBuzzerEvents : buzzerEvents;
  const displayStartEvents = isPaused ? frozenStartEvents : startEvents;

  // Setup event listeners
  useEffect(() => {
    let unlistenFunctions: UnlistenFn[] = [];

    if (!isPaused) {
      const setupListeners = async () => {
        // Listen for serial data
        const unlistenSerialData = await listen("serial-data", (event) => {
          const values = event.payload as number[];
          setSerialData(values);

          // Add the raw data to messages with timestamp
          const timestamp = new Date().toLocaleTimeString();
          setRawMessages((prev) => [`${timestamp}: ${values.join(", ")}`, ...prev.slice(0, 99)]);
        });

        // Listen for buzzer events
        const unlistenBuzzer = await listen("buzzer", () => {
          const timestamp = new Date().toLocaleTimeString();
          const buzzerMessage = `${timestamp}: Buzzer triggered`;
          setBuzzerEvents((prev) => [buzzerMessage, ...prev.slice(0, 99)]);
        });

        // Listen for start button events
        const unlistenStart = await listen("start-button", () => {
          const timestamp = new Date().toLocaleTimeString();
          const startMessage = `${timestamp}: Start button pressed`;
          setStartEvents((prev) => [startMessage, ...prev.slice(0, 99)]);
        });

        // Listen for error events
        const unlistenError = await listen("serial-error", (event) => {
          const timestamp = new Date().toLocaleTimeString();
          const errorMsg = `${timestamp} ERROR: ${event.payload}`;
          setRawMessages((prev) => [errorMsg, ...prev.slice(0, 99)]);
        });

        unlistenFunctions = [unlistenSerialData, unlistenBuzzer, unlistenStart, unlistenError];
        setListeners(unlistenFunctions);
      };

      setupListeners();
    }

    return () => {
      // Cleanup listeners when component unmounts or when paused
      unlistenFunctions.forEach(async (unlisten) => await unlisten());
    };
  }, [isPaused]);

  const togglePause = useCallback(() => {
    setIsPaused((prevPaused) => {
      if (!prevPaused) {
        // Pausing - freeze current state values
        setFrozenSerialData([...serialData]);
        setFrozenMessages([...rawMessages]);
        setFrozenBuzzerEvents([...buzzerEvents]);
        setFrozenStartEvents([...startEvents]);

        // Clean up listeners
        listeners.forEach(async (unlisten) => await unlisten());
      }
      return !prevPaused;
    });
  }, [serialData, rawMessages, buzzerEvents, startEvents, listeners]);

  const clearLogs = useCallback(() => {
    if (isPaused) {
      setFrozenMessages([]);
      setFrozenBuzzerEvents([]);
      setFrozenStartEvents([]);
    } else {
      setRawMessages([]);
      setBuzzerEvents([]);
      setStartEvents([]);
    }
  }, [isPaused]);

  return {
    displaySerialData,
    displayMessages,
    displayBuzzerEvents,
    displayStartEvents,
    isPaused,
    togglePause,
    clearLogs,
  };
};
