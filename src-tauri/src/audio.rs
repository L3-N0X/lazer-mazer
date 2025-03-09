use rodio::{Decoder, OutputStream, Sink, Source};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;

// Define sound effect types for easier reference
pub enum SoundEffect {
    GameStart,
    LaserBroken,
    Buzzer,
}

// Main structure for managing audio playback
pub struct AudioManager {
    // Store output stream and handle to prevent dropping
    _stream: Option<OutputStream>,
    // Use separate sinks for music and effects to control volume independently
    music_sink: Option<Sink>,
    effects_sink: Option<Sink>,
    // Settings
    master_volume: f32,
    effect_volume: f32,
    ambient_enabled: bool,
    effects_enabled: bool,
}

impl AudioManager {
    pub fn new() -> Arc<Mutex<Self>> {
        // Initialize with default settings
        Arc::new(Mutex::new(Self {
            _stream: None,
            music_sink: None,
            effects_sink: None,
            master_volume: 0.7, // Default to 70%
            effect_volume: 0.7, // Default to 70%
            ambient_enabled: true,
            effects_enabled: true,
        }))
    }

    // Initialize audio system
    pub fn initialize(&mut self) -> Result<(), String> {
        // Create output stream
        match OutputStream::try_default() {
            Ok((stream, stream_handle)) => {
                // Create sinks for music and effects
                match Sink::try_new(&stream_handle) {
                    Ok(music_sink) => {
                        match Sink::try_new(&stream_handle) {
                            Ok(effects_sink) => {
                                // Set initial volumes
                                music_sink.set_volume(self.master_volume);
                                effects_sink.set_volume(self.effect_volume * self.master_volume);

                                self.music_sink = Some(music_sink);
                                self.effects_sink = Some(effects_sink);
                                self._stream = Some(stream);
                                Ok(())
                            }
                            Err(e) => Err(format!("Failed to create effects sink: {}", e)),
                        }
                    }
                    Err(e) => Err(format!("Failed to create music sink: {}", e)),
                }
            }
            Err(e) => Err(format!("Failed to create audio stream: {}", e)),
        }
    }

    // Start background music in a loop
    pub fn start_background_music(&mut self) -> Result<(), String> {
        if !self.ambient_enabled {
            return Ok(());
        }

        if let Some(sink) = &self.music_sink {
            // First stop any playing music
            sink.stop();

            // Placeholder path for background music
            let music_path = "assets/audio/background_music.mp3";

            // Check if file exists
            if !Path::new(music_path).exists() {
                return Err(format!("Background music file not found: {}", music_path));
            }

            // Open the file and decode it
            match File::open(music_path) {
                Ok(file) => {
                    let reader = BufReader::new(file);
                    match Decoder::new(reader) {
                        Ok(source) => {
                            // Loop the source forever
                            let looped_source = source.repeat_infinite();
                            sink.append(looped_source);
                            sink.play();
                            Ok(())
                        }
                        Err(e) => Err(format!("Failed to decode music file: {}", e)),
                    }
                }
                Err(e) => Err(format!("Failed to open music file: {}", e)),
            }
        } else {
            Err("Audio system not initialized".to_string())
        }
    }

    // Play a sound effect
    pub fn play_effect(&self, effect: SoundEffect) -> Result<(), String> {
        if !self.effects_enabled {
            return Ok(());
        }

        if let Some(sink) = &self.effects_sink {
            // Get path for the requested effect
            let effect_path = match effect {
                SoundEffect::GameStart => "assets/audio/game_start.mp3",
                SoundEffect::LaserBroken => "assets/audio/laser_broken.mp3",
                SoundEffect::Buzzer => "assets/audio/buzzer.mp3",
            };

            // Check if file exists
            if !Path::new(effect_path).exists() {
                return Err(format!("Sound effect file not found: {}", effect_path));
            }

            // Open the file and decode it
            match File::open(effect_path) {
                Ok(file) => {
                    let reader = BufReader::new(file);
                    match Decoder::new(reader) {
                        Ok(source) => {
                            sink.append(source);
                            Ok(())
                        }
                        Err(e) => Err(format!("Failed to decode effect file: {}", e)),
                    }
                }
                Err(e) => Err(format!("Failed to open effect file: {}", e)),
            }
        } else {
            Err("Audio system not initialized".to_string())
        }
    }

    // Update settings based on user preferences
    pub fn update_settings(
        &mut self,
        master_volume: f32,
        effect_volume: f32,
        ambient_enabled: bool,
        effects_enabled: bool,
    ) {
        self.master_volume = master_volume / 100.0; // Convert from percentage
        self.effect_volume = effect_volume / 100.0; // Convert from percentage
        self.ambient_enabled = ambient_enabled;
        self.effects_enabled = effects_enabled;

        // Update sink volumes
        if let Some(sink) = &self.music_sink {
            if self.ambient_enabled {
                sink.set_volume(self.master_volume);
                sink.play();
            } else {
                sink.pause();
            }
        }

        if let Some(sink) = &self.effects_sink {
            sink.set_volume(self.effect_volume * self.master_volume);
        }
    }

    // Stop all audio
    pub fn stop_all(&self) {
        if let Some(sink) = &self.music_sink {
            sink.stop();
        }

        if let Some(sink) = &self.effects_sink {
            sink.stop();
        }
    }

    // Pause/resume background music
    pub fn toggle_music(&self, play: bool) {
        if let Some(sink) = &self.music_sink {
            if play && self.ambient_enabled {
                sink.play();
            } else {
                sink.pause();
            }
        }
    }
}
