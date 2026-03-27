import React, { useState, useEffect } from "react";
import MapComponent from "./MapComponent";
import RestaurantList from "./RestaurantList";
import { fetchRestaurantsFromSERPAPI } from "./utils/sheetFetcher";
import { fetchRestaurantsFromHunter } from "./utils/restaurantHunter";
import "./App.css";

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRestaurantIndex, setSelectedRestaurantIndex] = useState(null);

  const normalizeText = (value) => (value || "").toString().trim().toLowerCase();

  const toRestaurantKey = (restaurant = {}) => {
    const name = normalizeText(restaurant["Restaurant Name"]);
    const address = normalizeText(restaurant.Address);
    return `${name}__${address}`;
  };

  const mergeRestaurantLists = (baseRestaurants = [], hunterRestaurants = []) => {
    const merged = [];
    const seen = new Set();

    [...baseRestaurants, ...hunterRestaurants].forEach((restaurant) => {
      const key = toRestaurantKey(restaurant);
      if (!restaurant || !restaurant["Restaurant Name"] || !key) return;
      if (seen.has(key)) return;

      seen.add(key);
      merged.push(restaurant);
    });

    return merged;
  };

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);

        const [baseResult, hunterResult] = await Promise.allSettled([
          fetchRestaurantsFromSERPAPI(),
          fetchRestaurantsFromHunter(
            "restaurants",
            "Budapest, Hungary",
            15,
            false
          ),
        ]);

        const baseRestaurants =
          baseResult.status === "fulfilled" && Array.isArray(baseResult.value)
            ? baseResult.value
            : [];

        const hunterRestaurants =
          hunterResult.status === "fulfilled" && Array.isArray(hunterResult.value)
            ? hunterResult.value
            : [];

        if (baseResult.status === "rejected") {
          console.warn("Sheet/pipeline fetch failed:", baseResult.reason);
        }

        if (hunterResult.status === "rejected") {
          console.warn("Hunter fetch failed:", hunterResult.reason);
        }

        const combined = mergeRestaurantLists(baseRestaurants, hunterRestaurants);

        console.log("✅ Loaded base restaurants:", baseRestaurants.length);
        console.log("✅ Loaded hunter restaurants:", hunterRestaurants.length);
        console.log("✅ Final merged restaurants:", combined.length);

        setRestaurants(combined);
      } catch (err) {
        console.error("Failed to load restaurants:", err);
        setError("Error loading restaurant data.");
      } finally {
        setLoading(false);
      }
    };

    loadRestaurants();
  }, []);

  const handleRestaurantSelect = (index) => {
    setSelectedRestaurantIndex(index);
  };

  return (
    <div className="app-container">
      <div className="map-section">
        <MapComponent
          restaurants={restaurants}
          onRestaurantSelect={handleRestaurantSelect}
          selectedRestaurantIndex={selectedRestaurantIndex}
          loading={loading}
        />
      </div>
      <div className="list-section">
        <RestaurantList
          restaurants={restaurants}
          selectedRestaurantIndex={selectedRestaurantIndex}
          onRestaurantSelect={handleRestaurantSelect}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}

export default App;