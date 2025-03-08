import React from "react";
import {
  Button,
  Typography,
  Container,
  Box,
  Card,
  CardContent,
  CardActions,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import {
  Settings as SettingsIcon,
  BugReport as DebugIcon,
  PlayArrow as PlayIcon,
  Info as InfoIcon,
  ArrowForward as ArrowIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 4,
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: "bold",
            fontSize: { xs: "3rem", sm: "4rem" },
            background: "linear-gradient(45deg, #ff4d4d 30%, #ffa77d 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 2,
          }}
        >
          lazer-mazer
        </Typography>

        <Typography
          variant="h6"
          gutterBottom
          sx={{ mb: 4, maxWidth: "600px", textAlign: "center" }}
        >
          Create and navigate through an exciting laser maze challenge
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={<PlayIcon />}
          onClick={() => navigate("/game")}
          sx={{
            fontSize: "1.2rem",
            py: 1.5,
            px: 4,
            borderRadius: 2,
            background: "linear-gradient(45deg, #ff4d4d 30%, #ff6b6b 90%)",
            boxShadow: "0 3px 5px 2px rgba(255, 77, 77, .3)",
            mb: 6,
          }}
        >
          Start Game
        </Button>

        <Paper
          elevation={3}
          sx={{ p: 3, mb: 4, width: "100%", borderRadius: 2, bgcolor: "background.paper" }}
        >
          <Typography variant="h5" gutterBottom color="primary" sx={{ mb: 2 }}>
            Welcome to lazer-mazer
          </Typography>
          <Typography variant="body1" paragraph>
            lazer-mazer is an interactive laser maze game that tests your agility and precision.
            Using Arduino-based hardware with laser emitters and sensors, you can set up a real
            physical maze and challenge yourself or friends to navigate through without breaking the
            beams.
          </Typography>
        </Paper>

        <Typography variant="h5" sx={{ alignSelf: "flex-start", mb: 2 }}>
          Quick Access
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: "100%", bgcolor: "background.paper", borderRadius: 2 }}>
              <CardContent>
                <SettingsIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" component="div" gutterBottom>
                  Settings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure your maze layout, sensor settings, and game parameters
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate("/settings")}
                  endIcon={<ArrowIcon />}
                >
                  Configure
                </Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: "100%", bgcolor: "background.paper", borderRadius: 2 }}>
              <CardContent>
                <DebugIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" component="div" gutterBottom>
                  Debug
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Test your sensor connections and troubleshoot hardware issues
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate("/debug")}
                  endIcon={<ArrowIcon />}
                >
                  Debug
                </Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: "100%", bgcolor: "background.paper", borderRadius: 2 }}>
              <CardContent>
                <InfoIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h6" component="div" gutterBottom>
                  About
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Learn more about lazer-mazer and how it works
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate("/about")}
                  endIcon={<ArrowIcon />}
                >
                  Learn More
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        <Paper
          elevation={3}
          sx={{ p: 3, width: "100%", borderRadius: 2, bgcolor: "background.paper" }}
        >
          <Typography variant="h5" gutterBottom color="secondary">
            Getting Started
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon sx={{ color: "primary.main" }}>1.</ListItemIcon>
              <ListItemText
                primary="Set up your hardware"
                secondary="Connect your Arduino and laser sensors according to the documentation"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ color: "primary.main" }}>2.</ListItemIcon>
              <ListItemText
                primary="Configure your maze"
                secondary="Use the Settings page to design your laser maze layout"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ color: "primary.main" }}>3.</ListItemIcon>
              <ListItemText
                primary="Test your connections"
                secondary="Use the Debug section to ensure all sensors are working properly"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ color: "primary.main" }}>4.</ListItemIcon>
              <ListItemText
                primary="Start the game"
                secondary="Begin a new game session and challenge yourself or friends"
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default Home;
