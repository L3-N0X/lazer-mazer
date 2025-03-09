import React, { useEffect } from "react";
import { Typography, Box, FormGroup, FormControlLabel, Switch, Slider } from "@mui/material";
import { useLaserConfig } from "../context/LaserConfigContext";
import { audioManager } from "../audioManager";

export const SoundSettings: React.FC = () => {
  const { laserConfig, updateSoundSettings } = useLaserConfig();
  const { soundSettings } = laserConfig;

  const [volume, setVolume] = React.useState<number>(soundSettings.masterVolume);
  const [effectVolume, setEffectVolume] = React.useState<number>(soundSettings.effectVolume);
  const [ambientSound, setAmbientSound] = React.useState<boolean>(soundSettings.ambientSound);
  const [effectsSound, setEffectsSound] = React.useState<boolean>(soundSettings.effectsSound);

  useEffect(() => {
    // Update local state if context values change
    setVolume(soundSettings.masterVolume);
    setEffectVolume(soundSettings.effectVolume);
    setAmbientSound(soundSettings.ambientSound);
    setEffectsSound(soundSettings.effectsSound);
  }, [soundSettings]);

  // Update audio settings in the frontend when changed
  useEffect(() => {
    audioManager.updateSettings(
      soundSettings.masterVolume,
      soundSettings.effectVolume,
      soundSettings.ambientSound,
      soundSettings.effectsSound
    );
  }, [soundSettings]);

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const newVolume = newValue as number;
    setVolume(newVolume);
    updateSoundSettings({
      ...soundSettings,
      masterVolume: newVolume,
    });
  };

  const handleEffectVolumeChange = (_event: Event, newValue: number | number[]) => {
    const newEffectVolume = newValue as number;
    setEffectVolume(newEffectVolume);
    updateSoundSettings({
      ...soundSettings,
      effectVolume: newEffectVolume,
    });
  };

  const handleAmbientSoundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAmbientSound(newValue);
    updateSoundSettings({
      ...soundSettings,
      ambientSound: newValue,
    });
  };

  const handleEffectsSoundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setEffectsSound(newValue);
    updateSoundSettings({
      ...soundSettings,
      effectsSound: newValue,
    });
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>Music Volume</Typography>
        <Slider
          value={volume}
          onChange={handleVolumeChange}
          aria-labelledby="music-volume-slider"
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography gutterBottom>Effect Volume</Typography>
        <Slider
          value={effectVolume}
          onChange={handleEffectVolumeChange}
          aria-labelledby="effect-volume-slider"
          valueLabelDisplay="auto"
        />
      </Box>

      <FormGroup>
        <FormControlLabel
          control={<Switch checked={ambientSound} onChange={handleAmbientSoundChange} />}
          label="Ambient Sounds"
        />
        <FormControlLabel
          control={<Switch checked={effectsSound} onChange={handleEffectsSoundChange} />}
          label="Sound Effects"
        />
      </FormGroup>
    </>
  );
};
