use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use std::env;
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::thread;

// Define sound effect types for easier reference
#[derive(Clone, Copy, Debug)]
pub enum SoundEffect {
    GameStart,
    GameOver,
    LaserBroken,
    Buzzer,
}

// Commands that can be sent to the audio thread
enum AudioCommand {
    PlayEffect(SoundEffect),
    StartBackgroundMusic,
    StopBackgroundMusic,
    UpdateSettings {
        master_volume: f32,
        effect_volume: f32,
        ambient_enabled: bool,
        effects_enabled: bool,
    },
    Stop,
}

// This struct is thread-safe and can be shared across threads
pub struct AudioManager {
    command_sender: Sender<AudioCommand>,
    audio_thread: thread::JoinHandle<()>, // Store the spawned thread
}

impl AudioManager {
    pub fn new() -> Arc<Mutex<Self>> {
        // Create a channel for sending commands to the audio thread
        let (sender, receiver) = channel::<AudioCommand>();

        // Spawn the audio thread
        let audio_thread = thread::spawn(move || {
            let mut audio_service = AudioService::new();

            // Main loop for processing audio commands
            while let Ok(command) = receiver.recv() {
                match command {
                    AudioCommand::PlayEffect(effect) => {
                        let _ = audio_service.play_effect(effect);
                    }
                    AudioCommand::StartBackgroundMusic => {
                        let _ = audio_service.start_background_music();
                    }
                    AudioCommand::StopBackgroundMusic => {
                        audio_service.toggle_music(false);
                    }
                    AudioCommand::UpdateSettings {
                        master_volume,
                        effect_volume,
                        ambient_enabled,
                        effects_enabled,
                    } => {
                        audio_service.update_settings(
                            master_volume,
                            effect_volume,
                            ambient_enabled,
                            effects_enabled,
                        );
                    }
                    AudioCommand::Stop => {
                        audio_service.stop_all();
                        break;
                    }
                }
            }
        });

        // Return a thread-safe handle to the audio manager
        Arc::new(Mutex::new(Self {
            command_sender: sender,
            audio_thread,
        }))
    }

    // Play a sound effect by sending a command to the audio thread
    pub fn play_effect(&self, effect: SoundEffect) -> Result<(), String> {
        println!("Playing effect: {:?}", effect);
        self.command_sender
            .send(AudioCommand::PlayEffect(effect))
            .map_err(|_| "Failed to send audio command".to_string())
    }

    // Start background music in a loop
    pub fn start_background_music(&mut self) -> Result<(), String> {
        println!("Starting background music");
        self.command_sender
            .send(AudioCommand::StartBackgroundMusic)
            .map_err(|_| "Failed to send audio command".to_string())
    }

    // Update settings based on user preferences
    pub fn update_settings(
        &mut self,
        master_volume: f32,
        effect_volume: f32,
        ambient_enabled: bool,
        effects_enabled: bool,
    ) {
        println!(
            "Updating audio settings - Master: {}, Effect: {}, Ambient enabled: {}, Effects enabled: {}", 
            master_volume, effect_volume, ambient_enabled, effects_enabled
        );

        let _ = self.command_sender.send(AudioCommand::UpdateSettings {
            master_volume,
            effect_volume,
            ambient_enabled,
            effects_enabled,
        });
    }

    // Stop all audio
    pub fn stop_all(&self) {
        let _ = self.command_sender.send(AudioCommand::Stop);
    }

    // Pause/resume background music
    pub fn toggle_music(&self, play: bool) {
        if play {
            let _ = self.command_sender.send(AudioCommand::StartBackgroundMusic);
        } else {
            let _ = self.command_sender.send(AudioCommand::StopBackgroundMusic);
        }
    }
}

// This struct runs in a dedicated audio thread and is not shared
struct AudioService {
    _stream: Option<OutputStream>,
    stream_handle: Option<OutputStreamHandle>, // new field
    music_sink: Option<Sink>,
    effects_sink: Option<Sink>,
    master_volume: f32,
    effect_volume: f32,
    ambient_enabled: bool,
    effects_enabled: bool,
    asset_dir: PathBuf,
}

impl AudioService {
    fn new() -> Self {
        println!("Initializing AudioService...");

        // Determine the location of assets - could be different when packaged
        let asset_dir = AudioService::get_asset_dir();
        println!("Using asset directory: {:?}", asset_dir);

        // Initialize with default settings
        let mut service = Self {
            _stream: None,
            stream_handle: None, // initialize new field
            music_sink: None,
            effects_sink: None,
            master_volume: 0.7, // Default to 70%
            effect_volume: 0.7, // Default to 70%
            ambient_enabled: true,
            effects_enabled: true,
            asset_dir,
        };

        // Create output stream
        println!("Attempting to create audio output stream...");
        match OutputStream::try_default() {
            Ok((stream, handle)) => {
                println!("Audio output stream created successfully");
                service.stream_handle = Some(handle.clone()); // store handle

                match Sink::try_new(&handle) {
                    Ok(music_sink) => {
                        println!("Music sink created successfully");

                        match Sink::try_new(&handle) {
                            Ok(effects_sink) => {
                                println!("Effects sink created successfully");

                                // Set initial volumes
                                music_sink.set_volume(service.master_volume);
                                effects_sink
                                    .set_volume(service.effect_volume * service.master_volume);
                                println!(
                                    "Volumes set - Music: {}, Effects: {}",
                                    service.master_volume,
                                    service.effect_volume * service.master_volume
                                );

                                service.music_sink = Some(music_sink);
                                service.effects_sink = Some(effects_sink);
                                service._stream = Some(stream);
                            }
                            Err(e) => println!("Failed to create effects sink: {}", e),
                        }
                    }
                    Err(e) => println!("Failed to create music sink: {}", e),
                }
            }
            Err(e) => println!("Failed to create audio output stream: {}", e),
        }

        service
    }

    // Helper function to get the asset directory path
    fn get_asset_dir() -> PathBuf {
        // In development, try to use a path relative to the current directory
        let current_dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

        // First try the development path
        let dev_path = current_dir.join("assets").join("audio");
        if dev_path.exists() && dev_path.is_dir() {
            println!("Using development asset path: {:?}", dev_path);
            return dev_path;
        }

        // Try a path relative to the executable for production
        if let Ok(exe_path) = env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let prod_path = exe_dir.join("assets").join("audio");
                if (prod_path.exists() && prod_path.is_dir()) {
                    println!("Using production asset path: {:?}", prod_path);
                    return prod_path;
                }
            }
        }

        // Fallback to a relative path and hope for the best
        println!("Falling back to default asset path");
        PathBuf::from("assets/audio")
    }

    fn play_effect(&self, effect: SoundEffect) -> Result<(), String> {
        if !self.effects_enabled {
            println!("Effects disabled, not playing {:?}", effect);
            return Ok(());
        }

        if let Some(sink) = &self.effects_sink {
            // Get filename for the requested effect
            let effect_filename = match effect {
                SoundEffect::GameStart => "game_start.wav",
                SoundEffect::GameOver => "game_over.wav",
                SoundEffect::LaserBroken => "laser_broken.wav",
                SoundEffect::Buzzer => "game_finished.wav",
            };

            // Create full path to the audio file
            let effect_path = self.asset_dir.join(effect_filename);
            println!("Trying to play sound effect from: {:?}", effect_path);

            // Check if file exists
            if !effect_path.exists() {
                return Err(format!("Sound effect file not found: {:?}", effect_path));
            }

            println!("Sound file exists, attempting to open and decode...");

            // Open the file and decode it
            match File::open(&effect_path) {
                Ok(file) => {
                    let reader = BufReader::new(file);
                    match Decoder::new(reader) {
                        Ok(source) => {
                            println!("Successfully decoded sound file, adding to sink");
                            sink.append(source);
                            // Ensure the sink is playing so that the effect gets heard
                            sink.play();
                            println!("Current effect volume: {}", sink.volume());
                            Ok(())
                        }
                        Err(e) => Err(format!("Failed to decode effect file: {}", e)),
                    }
                }
                Err(e) => Err(format!("Failed to open effect file: {}", e)),
            }
        } else {
            Err("Audio system not initialized - effects_sink is None".to_string())
        }
    }

    fn start_background_music(&mut self) -> Result<(), String> {
        if (!self.ambient_enabled) {
            println!("Ambient audio disabled, not starting background music");
            return Ok(());
        }
        // Instead of reusing the old music_sink, create a new sink.
        if let Some(handle) = &self.stream_handle {
            match Sink::try_new(handle) {
                Ok(new_music_sink) => {
                    new_music_sink.set_volume(self.master_volume);
                    // Construct full path to background music
                    let music_path = self.asset_dir.join("loop.wav");
                    println!("Attempting to play background music from: {:?}", music_path);
                    if !music_path.exists() {
                        return Err(format!("Background music file not found: {:?}", music_path));
                    }
                    println!("Music file exists, attempting to open and decode...");
                    match File::open(&music_path) {
                        Ok(file) => {
                            let reader = BufReader::new(file);
                            match Decoder::new(reader) {
                                Ok(source) => {
                                    println!("Successfully decoded music file, setting to loop");
                                    let looped_source = source.repeat_infinite();
                                    new_music_sink.append(looped_source);
                                    new_music_sink.play();
                                    println!(
                                        "Background music started with volume: {}",
                                        new_music_sink.volume()
                                    );
                                    self.music_sink = Some(new_music_sink);
                                    Ok(())
                                }
                                Err(e) => Err(format!("Failed to decode music file: {}", e)),
                            }
                        }
                        Err(e) => Err(format!("Failed to open music file: {}", e)),
                    }
                }
                Err(e) => Err(format!("Failed to create a new music sink: {}", e)),
            }
        } else {
            Err("Audio system not initialized - stream_handle is None".to_string())
        }
    }

    fn update_settings(
        &mut self,
        master_volume: f32,
        effect_volume: f32,
        ambient_enabled: bool,
        effects_enabled: bool,
    ) {
        println!("AudioService updating settings:");
        println!(
            "  - Master volume: {} (raw input) -> {} (converted)",
            master_volume,
            master_volume / 100.0
        );
        println!(
            "  - Effect volume: {} (raw input) -> {} (converted)",
            effect_volume,
            effect_volume / 100.0
        );
        println!("  - Ambient enabled: {}", ambient_enabled);
        println!("  - Effects enabled: {}", effects_enabled);

        self.master_volume = master_volume / 100.0; // Convert from percentage
        self.effect_volume = effect_volume / 100.0; // Convert from percentage
        self.ambient_enabled = ambient_enabled;
        self.effects_enabled = effects_enabled;

        // Update sink volumes
        if let Some(sink) = &self.music_sink {
            println!("Setting music sink volume to: {}", self.master_volume);
            sink.set_volume(self.master_volume);

            if self.ambient_enabled {
                println!("Ambient enabled, playing music sink");
                sink.play();
            } else {
                println!("Ambient disabled, pausing music sink");
                sink.pause();
            }
        } else {
            println!("Cannot update music sink volume - sink is None");
        }

        if let Some(sink) = &self.effects_sink {
            let combined_volume = self.effect_volume * self.master_volume;
            println!(
                "Setting effects sink volume to: {} (effect_vol: {} * master_vol: {})",
                combined_volume, self.effect_volume, self.master_volume
            );
            sink.set_volume(combined_volume);
        } else {
            println!("Cannot update effects sink volume - sink is None");
        }
    }

    fn stop_all(&self) {
        if let Some(sink) = &self.music_sink {
            sink.stop();
        }

        if let Some(sink) = &self.effects_sink {
            sink.stop();
        }
    }

    fn toggle_music(&self, play: bool) {
        println!(
            "Toggling background music: {}",
            if play { "play" } else { "pause" }
        );

        if let Some(sink) = &self.music_sink {
            if play && self.ambient_enabled {
                println!("Playing music sink with volume: {}", sink.volume());
                sink.play();
            } else {
                println!("Pausing music sink");
                sink.pause();
            }
        } else {
            println!("Cannot toggle music - music_sink is None");
        }
    }
}
