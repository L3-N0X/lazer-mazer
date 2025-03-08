import React from "react";
import { Button, Typography, Container, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 64px)", // Accounting for AppBar height
          textAlign: "center",
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: "bold",
            fontSize: { xs: "3rem", sm: "4rem" },
            background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          lazer-mazer
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mb: 4 }}>
          Configure your laser maze experience
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => navigate("/game")}
          sx={{
            fontSize: "1.5rem",
            py: 1.5,
            px: 4,
            borderRadius: 2,
            background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
            boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
          }}
        >
          Start
        </Button>
      </Box>
    </Container>
  );
};

export default Home;
