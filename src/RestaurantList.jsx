import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RestaurantList.css";

const RestaurantList = ({
  restaurants = [],
  selectedRestaurantIndex,
  onRestaurantSelect,
  loading,
  error,
}) => {
  const itemRefs = useRef([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const indexedRestaurants = useMemo(() => {
    return restaurants.map((restaurant, originalIndex) => ({
      restaurant,
      originalIndex,
    }));
  }, [restaurants]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        restaurants
          .map((r) => (r.Category || "").trim())
          .filter((c) => c !== "")
      )
    );
    unique.sort();
    return ["All", ...unique];
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    if (selectedCategory === "All") return indexedRestaurants;

    return indexedRestaurants.filter(
      ({ restaurant }) => (restaurant.Category || "").trim() === selectedCategory
    );
  }, [indexedRestaurants, selectedCategory]);

  useEffect(() => {
    console.log("🍽️ RestaurantList received restaurants:", restaurants.length);
    console.log("🍽️ Filtered restaurants:", filteredRestaurants.length);
    console.log(
      "🍽️ Restaurant names:",
      restaurants.map((r) => r["Restaurant Name"]).filter(Boolean)
    );
  }, [restaurants, filteredRestaurants]);

  useEffect(() => {
    if (selectedRestaurantIndex === null || selectedRestaurantIndex === undefined) {
      return;
    }

    const visibleIndex = filteredRestaurants.findIndex(
      ({ originalIndex }) => originalIndex === selectedRestaurantIndex
    );

    if (visibleIndex !== -1 && itemRefs.current[visibleIndex]) {
      itemRefs.current[visibleIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedRestaurantIndex, filteredRestaurants]);

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
      <div className="restaurant-list-header">
        <h2>Restaurants & Offers ({filteredRestaurants.length})</h2>

        <div className="category-filter">
          <label htmlFor="category-select">Food category</label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredRestaurants.length === 0 ? (
        <p>No restaurants found</p>
      ) : (
        <div className="restaurants-grid">
          {filteredRestaurants.map(({ restaurant, originalIndex }, visibleIndex) => {
            const isSelected = originalIndex === selectedRestaurantIndex;

            return (
              <div
                key={`${restaurant["Restaurant Name"] || "restaurant"}-${originalIndex}`}
                ref={(element) => {
                  itemRefs.current[visibleIndex] = element;
                }}
                className={`restaurant-card ${isSelected ? "selected" : ""}`}
                onClick={() =>
                  onRestaurantSelect && onRestaurantSelect(originalIndex)
                }
                style={{ cursor: "pointer" }}
              >
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
                      <strong>Student Discount:</strong>{" "}
                      {restaurant["Student Discount"]}
                    </p>
                  )}
                </div>

                {restaurant.Website && (
                  <a
                    href={restaurant.Website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="website-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Visit Website →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RestaurantList;