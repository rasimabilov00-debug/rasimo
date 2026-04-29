const express = require("express");
const {
  getRestaurants,
  searchRestaurants,
  resolveWebsites,
  scanRestaurants,
} = require("../services/restaurantService");

const router = express.Router();

router.get("/restaurants", async (req, res) => {
  try {
    console.log("GET /restaurants keys", {
      serpApiKey: !!process.env.SERPAPI_API_KEY,
      googleApiKey: !!process.env.GOOGLE_PLACES_API_KEY,
    });

    const payload = await searchRestaurants({
      query: "",
      location: "Budapest, Hungary",
      limit: 80,
      serpApiKey: process.env.SERPAPI_API_KEY,
      googleApiKey: undefined,
    });

    res.json({
      count: payload.restaurants.length,
      data: payload.restaurants,
      queriesUsed: payload.queriesUsed,
    });
  } catch (error) {
    console.error("Places API fetch failed:", error);
    res.status(500).json({
      error: "Failed to fetch restaurants",
      details: error.message,
    });
  }
});

router.get("/search-restaurants", async (req, res) => {
  try {
    const { q, location, limit } = req.query;

    const payload = await searchRestaurants({
      query: q,
      location,
      limit,
      serpApiKey: process.env.SERPAPI_API_KEY,
      googleApiKey: undefined,
    });

    res.json(payload);
  } catch (error) {
    console.error("Search restaurants failed:", error);
    res.status(500).json({
      error: "Failed to search restaurants",
      details: error.message,
    });
  }
});

router.post("/resolve-websites", async (req, res) => {
  try {
    const { restaurants } = req.body;

    if (!Array.isArray(restaurants)) {
      return res.status(400).json({ error: "restaurants must be an array" });
    }

    const payload = await resolveWebsites({
      restaurants,
      googleApiKey: process.env.GOOGLE_PLACES_API_KEY,
      serpApiKey: process.env.SERPAPI_API_KEY,
    });

    res.json(payload);
  } catch (error) {
    console.error("Resolve websites failed:", error);
    res.status(500).json({
      error: "Failed to resolve websites",
      details: error.message,
    });
  }
});

router.post("/scan-restaurants", async (req, res) => {
  try {
    const { restaurants } = req.body;

    if (!Array.isArray(restaurants)) {
      return res.status(400).json({ error: "restaurants must be an array" });
    }

    const enriched = scanRestaurants({ restaurants });

    console.log(
      `✅ Website scanning completed for ${enriched.length} restaurants`
    );

    res.json(enriched);
  } catch (error) {
    console.error("Scan restaurants failed:", error);
    res.status(500).json({
      error: "Failed to scan restaurants",
      details: error.message,
    });
  }
});

module.exports = router;
