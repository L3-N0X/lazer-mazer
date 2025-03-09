use std::collections::HashSet;
use std::io::{BufRead, BufReader};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use tauri::{Emitter, Manager};
use tauri_plugin_store::StoreExt;

// Add the audio module
mod audio;
use audio::{AudioManager, SoundEffect};

// Store parsed sensor values for use across the application
#[derive(Clone, serde::Serialize)]
struct SensorData {
    values: Vec<u16>,
}

impl SensorData {
    fn new() -> Self {
        Self { values: Vec::new() }
    }

    fn update(&mut self, new_values: Vec<u16>) {
        self.values = new_values;
    }
}

// Track game state including triggered lasers
struct GameState {
    is_active: bool,
    triggered_lasers: HashSet<usize>, // Track which sensor indices have triggered
    laser_sensitivities: Vec<u16>,    // Store sensitivity thresholds for each laser
}

impl GameState {
    fn new() -> Self {
        Self {
            is_active: false,
            triggered_lasers: HashSet::new(),
            laser_sensitivities: Vec::new(),
        }
    }

    fn start_game(&mut self) {
        self.is_active = true;
    }

    fn stop_game(&mut self) {
        self.is_active = false;
    }

    fn reset_triggers(&mut self) {
        self.triggered_lasers.clear();
    }

    fn reactivate_laser(&mut self, sensor_index: usize) {
        self.triggered_lasers.remove(&sensor_index);
    }

    fn update_sensitivities(&mut self, sensitivities: Vec<u16>) {
        self.laser_sensitivities = sensitivities;
    }

    fn is_laser_triggered(&self, sensor_index: usize, value: u16) -> bool {
        if sensor_index >= self.laser_sensitivities.len() {
            return false;
        }

        let threshold = self.laser_sensitivities[sensor_index];
        // Check if value is below threshold (beam broken)
        let normalized_value = (value as f32 / 1023.0) * 100.0;
        normalized_value < threshold as f32
    }
}

// A simple manager to hold the serial reading thread and a channel to stop it.
struct SerialManager {
    reading_thread: Option<JoinHandle<()>>,
    stop_sender: Option<Sender<()>>,
}

impl SerialManager {
    fn new() -> Self {
        Self {
            reading_thread: None,
            stop_sender: None,
        }
    }

    // Stops any running serial thread.
    fn stop(&mut self) {
        if let Some(sender) = self.stop_sender.take() {
            let _ = sender.send(());
        }
        if let Some(handle) = self.reading_thread.take() {
            let _ = handle.join();
        }
    }
}

// Command to list available serial ports.
#[tauri::command]
fn list_ports() -> Result<Vec<String>, String> {
    serialport::available_ports()
        .map_err(|e| e.to_string())
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
}

// Command to start a new game and reset audio triggers
#[tauri::command]
fn start_game(
    game_state: tauri::State<Arc<Mutex<GameState>>>,
    audio_manager: tauri::State<Arc<Mutex<AudioManager>>>,
) -> Result<(), String> {
    let mut state = game_state.lock().map_err(|e| e.to_string())?;
    state.start_game();
    state.reset_triggers();

    // Play game start sound
    if let Ok(mut manager) = audio_manager.lock() {
        manager.play_effect(SoundEffect::GameStart).ok();
        manager.start_background_music().ok();
    }

    Ok(())
}

// Command to stop the current game
#[tauri::command]
fn stop_game(
    game_state: tauri::State<Arc<Mutex<GameState>>>,
    audio_manager: tauri::State<Arc<Mutex<AudioManager>>>,
) -> Result<(), String> {
    let mut state = game_state.lock().map_err(|e| e.to_string())?;
    state.stop_game();

    // Stop background music
    if let Ok(manager) = audio_manager.lock() {
        manager.toggle_music(false);
    }

    Ok(())
}

// Command to reactivate a specific laser
#[tauri::command]
fn reactivate_laser(
    sensor_index: usize,
    game_state: tauri::State<Arc<Mutex<GameState>>>,
) -> Result<(), String> {
    let mut state = game_state.lock().map_err(|e| e.to_string())?;
    state.reactivate_laser(sensor_index);
    Ok(())
}

// Command to update laser sensitivities from frontend
#[tauri::command]
fn update_laser_sensitivities(
    sensitivities: Vec<u16>,
    game_state: tauri::State<Arc<Mutex<GameState>>>,
) -> Result<(), String> {
    let mut state = game_state.lock().map_err(|e| e.to_string())?;
    state.update_sensitivities(sensitivities);
    Ok(())
}

// Command to update audio settings
#[tauri::command]
fn update_audio_settings(
    master_volume: f32,
    effect_volume: f32,
    ambient_enabled: bool,
    effects_enabled: bool,
    audio_manager: tauri::State<Arc<Mutex<AudioManager>>>,
) -> Result<(), String> {
    if let Ok(mut manager) = audio_manager.lock() {
        manager.update_settings(
            master_volume,
            effect_volume,
            ambient_enabled,
            effects_enabled,
        );
        Ok(())
    } else {
        Err("Failed to update audio settings".to_string())
    }
}

// Command to configure and start reading from a serial port.
#[tauri::command]
fn configure_serial(
    port: String,
    baud_rate: u32,
    app_handle: tauri::AppHandle,
    state: tauri::State<Arc<Mutex<SerialManager>>>,
    sensor_data: tauri::State<Arc<Mutex<SensorData>>>,
    game_state: tauri::State<Arc<Mutex<GameState>>>,
    audio_manager: tauri::State<Arc<Mutex<AudioManager>>>,
) -> Result<(), String> {
    // Lock our SerialManager state.
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    // Stop any existing thread.
    manager.stop();

    // Try opening the serial port.
    let port_result = serialport::new(port.clone(), baud_rate)
        .timeout(std::time::Duration::from_millis(1000))
        .open();
    let serial_port = port_result.map_err(|e| format!("failed to open port: {}", e))?;

    // Create a channel to signal the thread to stop.
    let (stop_tx, stop_rx) = channel();

    // Clone the app handle so the thread can emit events.
    let app_handle_clone = app_handle.clone();
    let sensor_data_clone = Arc::clone(&sensor_data);
    let game_state_clone = Arc::clone(&game_state);
    let audio_manager_clone = Arc::clone(&audio_manager);

    let handle = thread::spawn(move || {
        let mut reader = BufReader::new(serial_port);
        loop {
            // Check if a stop signal was received.
            if let Ok(_) = stop_rx.try_recv() {
                break;
            }
            let mut line = String::new();
            // Try reading a line from the serial port.
            match reader.read_line(&mut line) {
                Ok(n) if n > 0 => {
                    let trimmed = line.trim().to_string();

                    // Special case for "buzzer" message
                    if trimmed == "buzzer" {
                        let _ = app_handle_clone.emit("buzzer", true);

                        // Play buzzer sound if game is active
                        if let Ok(game_state) = game_state_clone.lock() {
                            if game_state.is_active {
                                if let Ok(audio) = audio_manager_clone.lock() {
                                    let _ = audio.play_effect(SoundEffect::Buzzer);
                                }
                            }
                        }
                        continue;
                    }

                    // Special case for "start" message
                    if trimmed == "start" {
                        let _ = app_handle_clone.emit("start-button", true);
                        continue;
                    }

                    // Parse comma separated values into integers
                    let values: Result<Vec<u16>, _> =
                        trimmed.split(',').map(|s| s.parse::<u16>()).collect();

                    if let Ok(parsed_values) = values {
                        // Update shared sensor data
                        if let Ok(mut sensor_state) = sensor_data_clone.lock() {
                            sensor_state.update(parsed_values.clone());
                        }

                        // Process values for audio triggers if game is active
                        if let Ok(mut game_state) = game_state_clone.lock() {
                            if game_state.is_active {
                                // Check each laser value against its threshold
                                for (index, &value) in parsed_values.iter().enumerate() {
                                    // If laser is triggered and hasn't played sound yet
                                    if game_state.is_laser_triggered(index, value)
                                        && !game_state.triggered_lasers.contains(&index)
                                    {
                                        // Mark as triggered
                                        game_state.triggered_lasers.insert(index);

                                        // Play laser broken sound effect
                                        if let Ok(audio) = audio_manager_clone.lock() {
                                            let _ = audio.play_effect(SoundEffect::LaserBroken);
                                        }
                                    }
                                }
                            }
                        }

                        // Emit formatted data
                        let _ = app_handle_clone.emit("serial-data", parsed_values);
                    } else {
                        // Forward parse errors to the frontend.
                        let _ = app_handle_clone
                            .emit("serial-error", format!("parse error: {}", trimmed));
                    }
                }
                Ok(_) => {
                    // No data was available; sleep briefly.
                    thread::sleep(std::time::Duration::from_millis(10));
                }
                Err(e) => {
                    // Forward read errors to the frontend.
                    let _ = app_handle_clone.emit("serial-error", format!("read error: {}", e));
                    thread::sleep(std::time::Duration::from_millis(100));
                }
            }
        }
    });

    // Save our thread handle and stop sender in the manager.
    manager.reading_thread = Some(handle);
    manager.stop_sender = Some(stop_tx);

    Ok(())
}

// Command to stop the serial reading thread.
#[tauri::command]
fn stop_serial(state: tauri::State<Arc<Mutex<SerialManager>>>) -> Result<(), String> {
    let mut manager = state.lock().map_err(|e| e.to_string())?;
    manager.stop();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        // Manage the SerialManager and SensorData state
        .manage(Arc::new(Mutex::new(SerialManager::new())))
        .manage(Arc::new(Mutex::new(SensorData::new())))
        // Add GameState and AudioManager to state
        .manage(Arc::new(Mutex::new(GameState::new())))
        .manage(AudioManager::new())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        // Register our Tauri commands.
        .invoke_handler(tauri::generate_handler![
            list_ports,
            configure_serial,
            stop_serial,
            start_game,
            stop_game,
            reactivate_laser,
            update_laser_sensitivities,
            update_audio_settings,
        ])
        .setup(|app| {
            app.store("settings.json")?;

            // Initialize audio system during setup
            if let Some(audio_manager) = app.try_state::<Arc<Mutex<AudioManager>>>() {
                if let Ok(mut manager) = audio_manager.lock() {
                    let _ = manager.initialize();
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
