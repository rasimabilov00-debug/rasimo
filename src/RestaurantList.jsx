import React, { useState, useEffect } from "react";
import { fetchRestaurantData } from "./utils/sheetFetcher";
import "./RestaurantList.css";

const RestaurantList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRestaurantData();
        console.log("Setting restaurants:", data);
        setRestaurants(data);
      } catch (err) {
        console.error("Failed to load restaurants:", err);
        setError("Failed to load restaurants from Google Sheet. Please check the console for details.");
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurants();
  }, []);

  if (loading) {
    return (
      <div className="restaurant-list-container">
        <h2>Restaurants & Offers</h2>
        <p>Loading restaurants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="restaurant-list-container">
        <h2>Restaurants & Offers</h2>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="restaurant-list-container">
      <h2>Restaurants & Offers ({restaurants.length})</h2>
      {restaurants.length === 0 ? (
        <p>No restaurants found</p>
      ) : (
        <div className="restaurants-grid">
          {restaurants.map((restaurant, index) => (
            <div key={index} className="restaurant-card">
              <h3>{restaurant["Restaurant Name"]}</h3>
              {restaurant["Offer Title"] && (
                <p className="offer-title">
                  <strong>📍 {restaurant["Offer Title"]}</strong>
                </p>
              )}
              {restaurant.Description && (
                <p className="description">{restaurant.Description}</p>
              )}
              <div className="restaurant-details">
                {restaurant.Price && (
                  <p>
                    <strong>Price:</strong> {restaurant.Price}
                  </p>
                )}
                {restaurant.Category && (
                  <p>
                    <strong>Category:</strong> {restaurant.Category}
                  </p>
                )}
                {restaurant.Address && (
                  <p>
                    <strong>Address:</strong> {restaurant.Address}
                  </p>
                )}
                {restaurant["Student Discount"] && (
                  <p className="discount">
                    <strong>Student Discount:</strong> {restaurant["Student Discount"]}
                  </p>
                )}
              </div>
              {restaurant.Website && (
                <a
                  href={restaurant.Website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="website-link"
                >
                  Visit Website →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantList;
