import React, { useState, useEffect } from "react";
import MapComponent from "./MapComponent";
import RestaurantList from "./RestaurantList";
import { fetchRestaurantsFromSERPAPI } from "./utils/sheetFetcher";
import "./App.css";

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRestaurantIndex, setSelectedRestaurantIndex] = useState(null);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRestaurantsFromSERPAPI();
        console.log("✅ App loaded restaurants:", data?.length || 0, data);
        setRestaurants(Array.isArray(data) ? data : []);
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