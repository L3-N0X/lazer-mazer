import {
  Box,
  Typography,
  Container,
  Paper,
  Divider,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { CheckCircle, GitHub, Code } from "@mui/icons-material";
import React from "react";

const About: React.FC = () => {
  return (
    <Container maxWidth="lg" className="about-page">
      <Paper elevation={3} sx={{ p: 4, mt: 2, borderRadius: 2, bgcolor: "background.paper" }}>
        <img
          src="/LM-only.svg"
          alt="logo"
          width={200}
          height={200}
          style={{ display: "block", margin: "auto" }}
        />
        <Typography variant="h3" component="h1" gutterBottom color="primary" fontWeight="500">
          About lazer-mazer
        </Typography>
        <Divider sx={{ mb: 4 }} />

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="body1" component={"p"}>
              lazer-mazer is an interactive laser maze game that you can set up and play at home.
              The goal is to navigate through a maze of laser beams without breaking any beams,
              testing your agility and precision.
            </Typography>
            <Typography variant="body1" component={"p"}>
              Using laser pointers and a network of sensors, the system detects when a beam is
              broken, providing real-time feedback. If you break a certain number of beams, you lose
              the game. The game is designed to be fun and challenging for all ages, perfect for
              parties, team-building events, or family game nights.
            </Typography>
            <Typography variant="body1" component={"p"}>
              Customize the difficulty by adjusting the number of beams, their layout, and game
              parameters through an intuitive interface to create the perfect challenge for any
              skill level.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "background.default",
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Typography variant="h5" gutterBottom color="secondary">
                  How It Works
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  1. Set up your Arduino-based hardware with laser emitters and sensors
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  2. Configure your maze layout and game settings in the app
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  3. Start the game and challenge players to navigate through
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  4. Track real-time performance with the scoring system
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" gutterBottom color="secondary">
            Features
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Customizable Laser Maze Configurations"
                    secondary="Design your own layouts with the configuration tool"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Multiple Game Modes and Difficulty Levels"
                    secondary="Race against time or precision-focused challenges"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Real-time Sensor Feedback and Scoring"
                    secondary="Instant notification when beams are broken"
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Multiplayer Support with Networked Sensors"
                    secondary="Connect multiple sensors for larger or competitive setups"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Arduino-based Hardware Integration"
                    secondary="Works with DIY laser maze components and sensors"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Debug & Configuration Tools"
                    secondary="Test and calibrate your sensors through the debug interface"
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h4" gutterBottom color="secondary">
            About the Author
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid>
              <GitHub fontSize="large" color="primary" />
            </Grid>
            <Grid size={{ xs: 12, md: 10 }}>
              <Typography variant="body1" component={"p"}>
                lazer-mazer was created by <strong>L3-N0X</strong>. This project combines hardware
                engineering and software development to create an interactive gaming experience
                that's accessible to hobbyists and enthusiasts.
              </Typography>
              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<GitHub />}
                  href="https://github.com/L3-N0X/lazer-mazer"
                  target="_blank"
                  rel="noopener noreferrer external"
                >
                  GitHub Repository
                </Button>
                <Button variant="outlined" color="secondary" disabled startIcon={<Code />}>
                  Documentation
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      <Box sx={{ mt: 4 }} />
    </Container>
  );
};

export default About;
