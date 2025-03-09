import { AppBar, Toolbar, Typography, Button, IconButton, Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Box
          component={RouterLink}
          to="/"
          sx={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            color: "inherit",
            flexGrow: 1,
          }}
        >
          <img src="/LM-only.svg" alt="logo" width={50} height={50} />
          <Box sx={{ width: 16 }} />
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              textDecoration: "none",
              color: "inherit",
              fontWeight: "bold",
            }}
          >
            lazer-mazer
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button color="inherit" component={RouterLink} to="/game">
            GAME
          </Button>
          <Button color="inherit" component={RouterLink} to="/highscores">
            HIGHSCORES
          </Button>
          <Button color="inherit" component={RouterLink} to="/debug">
            DEBUG
          </Button>
          <Button color="inherit" component={RouterLink} to="/about">
            About
          </Button>
          <IconButton
            edge="end"
            color="inherit"
            aria-label="settings"
            component={RouterLink}
            to="/settings"
          >
            <SettingsIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
