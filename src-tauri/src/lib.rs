use serialport::SerialPort;
use std::io::{BufRead, BufReader};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use tauri::Emitter;

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
// It takes the USB port name and baud rate as parameters.
#[tauri::command]
fn configure_serial(
    port: String,
    baud_rate: u32,
    app_handle: tauri::AppHandle,
    state: tauri::State<Arc<Mutex<SerialManager>>>,
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
                    // Emit the "serial-data" event to the frontend.
                    let _ = app_handle_clone.emit("serial-data", trimmed);
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
        // Manage the SerialManager state (wrapped in Arc<Mutex<...>> for thread-safe sharing).
        .manage(Arc::new(Mutex::new(SerialManager::new())))
        .plugin(tauri_plugin_opener::init())
        // Register our Tauri commands.
        .invoke_handler(tauri::generate_handler![
            list_ports,
            configure_serial,
            stop_serial
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
