use std::io::{BufRead, BufReader};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use tauri::Emitter;
use tauri_plugin_store::StoreExt;

// Store parsed sensor values for use across the application
#[derive(Clone, serde::Serialize)]
struct SensorData {
    values: Vec<u16>,
}

// Add a struct to track button events with timestamps for debouncing
struct ButtonState {
    last_start_time: Option<Instant>,
}

impl ButtonState {
    fn new() -> Self {
        Self {
            last_start_time: None,
        }
    }

    // Return true if we should process this event (not a duplicate)
    fn should_process_start(&mut self) -> bool {
        let now = Instant::now();

        if let Some(last_time) = self.last_start_time {
            // If less than 500ms has passed, consider it a duplicate
            if now.duration_since(last_time) < Duration::from_millis(500) {
                return false;
            }
        }

        // Update the last time and return true to process
        self.last_start_time = Some(now);
        true
    }
}

// Store parsed sensor values for use across the application
impl SensorData {
    fn new() -> Self {
        Self { values: vec![0; 6] }
    }

    fn update(&mut self, values: Vec<u16>) {
        self.values = values;
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

// Command to configure and start reading from a serial port.
#[tauri::command]
fn configure_serial(
    port: String,
    baud_rate: u32,
    app_handle: tauri::AppHandle,
    state: tauri::State<Arc<Mutex<SerialManager>>>,
    sensor_data: tauri::State<Arc<Mutex<SensorData>>>,
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

    // Properly clone the inner Arc for each state
    let sensor_data_clone = Arc::clone(sensor_data.inner());

    // Create button state for debouncing
    let button_state = ButtonState::new();
    let button_state = Arc::new(Mutex::new(button_state));

    let handle = thread::spawn(move || {
        let mut reader = BufReader::new(serial_port);
        let button_state = button_state;

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
                    } else if trimmed == "start" {
                        // Use our debounce check before emitting the event
                        let mut state = button_state.lock().unwrap();
                        if state.should_process_start() {
                            let _ = app_handle_clone.emit("start-button", true);
                        }
                    } else {
                        // Parse comma separated values into integers
                        let values: Result<Vec<u16>, _> =
                            trimmed.split(',').map(|s| s.parse::<u16>()).collect();

                        if let Ok(parsed_values) = values {
                            // Update shared sensor data
                            if let Ok(mut sensor_state) = sensor_data_clone.lock() {
                                sensor_state.update(parsed_values.clone());
                            }

                            // Emit formatted data
                            let _ = app_handle_clone.emit("serial-data", parsed_values);
                        } else {
                            // Forward parse errors to the frontend.
                            let _ = app_handle_clone
                                .emit("serial-error", format!("parse error: {}", trimmed));
                        }
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        // Register our Tauri commands.
        .invoke_handler(tauri::generate_handler![
            list_ports,
            configure_serial,
            stop_serial,
        ])
        .setup(|app| {
            app.store("settings.json")?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
