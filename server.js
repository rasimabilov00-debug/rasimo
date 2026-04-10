const express = require("express");
const cors = require("cors");
require("dotenv").config();

const restaurantRoutes = require("./routes/restaurantRoutes");

// Keep server.js simple: app setup + middleware + route mounting.
const app = express();

app.use(cors());
app.use(express.json());

// All restaurant API logic lives in routes/services modules.
app.use("/api", restaurantRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
