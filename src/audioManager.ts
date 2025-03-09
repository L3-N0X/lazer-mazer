// Sound effect types
export enum SoundEffect {
  GameStart = "GameStart",
  GameOver = "GameOver",
  LaserBroken = "LaserBroken",
  Buzzer = "Buzzer",
}

export class AudioManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private backgroundMusic: HTMLAudioElement | null = null;
  private musicVolume: number = 0.7;
  private effectVolume: number = 0.7;
  private ambientEnabled: boolean = true;
  private effectsEnabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      // In Tauri, assets should be accessed relative to the public directory
      // Try multiple formats for better browser compatibility
      this.loadSoundEffect(SoundEffect.GameStart, ["./assets/audio/game_start.wav"]);
      this.loadSoundEffect(SoundEffect.GameOver, ["./assets/audio/game_over.wav"]);
      this.loadSoundEffect(SoundEffect.LaserBroken, ["./assets/audio/laser_broken.wav"]);
      this.loadSoundEffect(SoundEffect.Buzzer, ["./assets/audio/game_finished.wav"]);

      // Set up background music with multiple format options
      this.backgroundMusic = new Audio();
      this.setupSourcesForAudio(this.backgroundMusic, ["./assets/audio/loop.wav"]);

      if (this.backgroundMusic) {
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = this.musicVolume;
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize audio manager:", error);
    }
  }

  private loadSoundEffect(effect: SoundEffect, sources: string[]) {
    const audio = new Audio();
    this.setupSourcesForAudio(audio, sources);
    this.sounds.set(effect, audio);
  }

  private setupSourcesForAudio(audio: HTMLAudioElement, sources: string[]) {
    // Create source elements for each possible file
    sources.forEach((src) => {
      const sourceElement = document.createElement("source");
      sourceElement.src = src;

      // Set the type based on file extension
      if (src.endsWith(".mp3")) {
        sourceElement.type = "audio/mpeg";
      } else if (src.endsWith(".wav")) {
        sourceElement.type = "audio/wav";
      } else if (src.endsWith(".ogg")) {
        sourceElement.type = "audio/ogg";
      }

      audio.appendChild(sourceElement);
    });

    // Add error handler
    audio.addEventListener("error", (e) => {
      console.error(`Audio error: ${e.message || "Could not load audio"}`, e);
    });
  }

  playEffect(effect: SoundEffect) {
    if (!this.effectsEnabled || !this.initialized) return;

    const sound = this.sounds.get(effect);
    if (sound) {
      try {
        // Clone the audio to allow multiple simultaneous playback
        const soundToPlay = sound.cloneNode(true) as HTMLAudioElement;
        soundToPlay.volume = this.effectVolume;

        // Add specific error handling for this playback
        const playPromise = soundToPlay.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn(`Error playing sound effect ${effect}:`, err);
          });
        }
      } catch (err) {
        console.error(`Failed to play effect ${effect}:`, err);
      }
    } else {
      console.error(`Sound effect not found: ${effect}`);
    }
  }

  startBackgroundMusic() {
    if (!this.ambientEnabled || !this.initialized || !this.backgroundMusic) return;

    try {
      this.backgroundMusic.volume = this.musicVolume;
      this.backgroundMusic.currentTime = 0;

      const playPromise = this.backgroundMusic.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Error playing background music:", err);
        });
      }
    } catch (err) {
      console.error("Failed to start background music:", err);
    }
  }

  stopBackgroundMusic() {
    if (!this.backgroundMusic) return;

    try {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    } catch (err) {
      console.error("Failed to stop background music:", err);
    }
  }

  updateSettings(
    musicVolume: number,
    effectVolume: number,
    ambientEnabled: boolean,
    effectsEnabled: boolean
  ) {
    this.musicVolume = musicVolume / 100;
    this.effectVolume = effectVolume / 100;
    this.ambientEnabled = ambientEnabled;
    this.effectsEnabled = effectsEnabled;

    if (this.backgroundMusic) {
      try {
        this.backgroundMusic.volume = this.musicVolume;

        // Only control playback if music was already playing or if we're turning it off
        const isCurrentlyPlaying = !this.backgroundMusic.paused;

        if (!ambientEnabled && isCurrentlyPlaying) {
          // If ambient sound is disabled but music is playing, stop it
          this.backgroundMusic.pause();
        }
        // Don't automatically start music when settings change
      } catch (err) {
        console.error("Error updating audio settings:", err);
      }
    }
  }

  stopAllAudio() {
    this.stopBackgroundMusic();

    // Stop any playing sound effects
    this.sounds.forEach((sound) => {
      try {
        sound.pause();
        sound.currentTime = 0;
      } catch (err) {
        console.error("Error stopping audio:", err);
      }
    });
  }
}

// Export a singleton instance
export const audioManager = new AudioManager();
