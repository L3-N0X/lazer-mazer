import React from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  FormGroup,
  FormControlLabel,
  Switch,
  Slider,
  Tab,
  Tabs,
} from "@mui/material";
import { LaserConfigList } from "../components/LaserConfigList";
import { GameSettings } from "../components/GameSettings";
import { ArduinoSettings } from "../components/ArduinoSettings";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);
  const [volume, setVolume] = React.useState<number>(70);
  const [ambientSound, setAmbientSound] = React.useState<boolean>(true);
  const [effectsSound, setEffectsSound] = React.useState<boolean>(true);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    setVolume(newValue as number);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Settings
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="Laser Configuration" />
          <Tab label="Game Settings" />
          <Tab label="Arduino Connection" />
          <Tab label="Sound Settings" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Laser Configuration
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="body1">
            Configure your lasers below. Each laser can be reordered by dragging to match the order
            of your physical laser setup.
          </Typography>
          <LaserConfigList />
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Game Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="body1">
            Configure game rules and behavior for your laser maze experience.
          </Typography>

          <GameSettings />
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Arduino Connection
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="body1">
            Configure the connection to your Arduino board for laser detection.
          </Typography>

          <ArduinoSettings />
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Sound Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography gutterBottom>Master Volume</Typography>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              aria-labelledby="volume-slider"
              valueLabelDisplay="auto"
            />
          </Box>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={ambientSound}
                  onChange={(e) => setAmbientSound(e.target.checked)}
                />
              }
              label="Ambient Sounds"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={effectsSound}
                  onChange={(e) => setEffectsSound(e.target.checked)}
                />
              }
              label="Sound Effects"
            />
          </FormGroup>
        </Paper>
      </TabPanel>
    </Container>
  );
};

export default Settings;
