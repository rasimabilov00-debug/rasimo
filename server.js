const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const BUDAPEST_CENTER = {
  latitude: 47.4979,
  longitude: 19.0402,
};

const SEARCH_QUERIES = [
  "restaurants in Budapest",
  "cheap restaurants in Budapest",
  "burger restaurants in Budapest",
  "pizza restaurants in Budapest",
  "kebab restaurants in Budapest",
  "student friendly restaurants in Budapest",
  "street food in Budapest",
  "fast food in Budapest",
  "cafes in Budapest",
  "lunch restaurants in Budapest",
];

const normalizeName = (value = "") =>
  value.toString().trim().toLowerCase().replace(/\s+/g, " ");

const mapPlaceToRestaurant = (place) => {
  const location = place.location || {};
  return {
    title: place.displayName?.text || "",
    name: place.displayName?.text || "",
    snippet: place.editorialSummary?.text || "",
    address: place.formattedAddress || "",
    latitude: location.latitude || null,
    longitude: location.longitude || null,
    website: "",
    link: "",
    category:
      Array.isArray(place.types) && place.types.length > 0
        ? place.types[0]
        : "restaurant",
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || null,
    placeId: place.id || "",
  };
};

async function searchText(query) {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.editorialSummary",
      },
      body: JSON.stringify({
        textQuery: query,
        pageSize: 20,
        locationBias: {
          circle: {
            center: BUDAPEST_CENTER,
            radius: 8000.0,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Places error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return Array.isArray(data.places) ? data.places : [];
}

app.get("/api/restaurants", async (req, res) => {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({
        error: "Missing GOOGLE_PLACES_API_KEY in server environment",
      });
    }

    const results = await Promise.all(SEARCH_QUERIES.map((q) => searchText(q)));
    const flattened = results.flat().map(mapPlaceToRestaurant);

    const seen = new Set();
    const unique = flattened.filter((item) => {
      const key = normalizeName(item.title);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({
      count: unique.length,
      data: unique,
    });
  } catch (error) {
    console.error("Places API fetch failed:", error);
    res.status(500).json({
      error: "Failed to fetch restaurants",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});