import { AppBar, Toolbar, Typography, Button, IconButton, Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: "none",
            color: "inherit",
            fontWeight: "bold",
          }}
        >
          lazer-mazer
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button color="inherit" component={RouterLink} to="/about">
            About
          </Button>
          <Button color="inherit" component={RouterLink} to="/debug">
            DEBUG
          </Button>
          <Button color="inherit" component={RouterLink} to="/game">
            GAME
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
