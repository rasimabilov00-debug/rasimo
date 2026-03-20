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
        <div className="restaurant-panel-shell">
          <div className="restaurant-list-hero">
            <div>
              <p className="panel-kicker">Budapest Food Map</p>
              <h2>Restaurants & Offers</h2>
              <p className="panel-subtitle">Loading restaurants...</p>
            </div>
          </div>
          <div className="panel-state-card">Loading restaurants...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="restaurant-list-container">
        <div className="restaurant-panel-shell">
          <div className="restaurant-list-hero">
            <div>
              <p className="panel-kicker">Budapest Food Map</p>
              <h2>Restaurants & Offers</h2>
              <p className="panel-subtitle">Something went wrong</p>
            </div>
          </div>
          <div className="panel-state-card panel-state-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-list-container">
      <div className="restaurant-panel-shell">
        <div className="restaurant-list-hero">
          <div>
            <p className="panel-kicker">Budapest Food Map</p>
            <h2>Restaurants & Offers</h2>
            <p className="panel-subtitle">
              Discover places, compare categories, and spot pipeline results instantly.
            </p>
          </div>

          <div className="panel-counter-card">
            <span className="panel-counter-label">Visible</span>
            <span className="panel-counter-value">{filteredRestaurants.length}</span>
          </div>
        </div>

        <div className="restaurant-toolbar">
          <div className="category-filter modern-filter">
            <label htmlFor="category-select">Category</label>
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

          <div className="legend-row">
            <span className="legend-pill legend-pill-sheet">Sheet</span>
            <span className="legend-pill legend-pill-pipeline">Pipeline</span>
          </div>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="panel-state-card">No restaurants found.</div>
        ) : (
          <div className="restaurants-grid modern-grid">
            {filteredRestaurants.map(({ restaurant, originalIndex }, visibleIndex) => {
              const isSelected = originalIndex === selectedRestaurantIndex;
              const isPipeline = restaurant.Source === "pipeline";

              return (
                <div
                  key={`${restaurant["Restaurant Name"] || "restaurant"}-${originalIndex}`}
                  ref={(element) => {
                    itemRefs.current[visibleIndex] = element;
                  }}
                  className={`restaurant-card modern-card ${isSelected ? "selected" : ""} ${
                    isPipeline ? "pipeline-card" : "sheet-card"
                  }`}
                  onClick={() =>
                    onRestaurantSelect && onRestaurantSelect(originalIndex)
                  }
                >
                  <div className="restaurant-card-top">
                    <div className="restaurant-title-wrap">
                      <h3>{restaurant["Restaurant Name"]}</h3>
                      {restaurant.Category && (
                        <p className="restaurant-mini-category">{restaurant.Category}</p>
                      )}
                    </div>

                    <span
                      className={`source-badge ${
                        isPipeline ? "pipeline-badge" : "sheet-badge"
                      }`}
                    >
                      {isPipeline ? "Pipeline" : "Sheet"}
                    </span>
                  </div>

                  {restaurant["Offer Title"] && (
                    <div className="offer-banner">
                      <span className="offer-icon">✦</span>
                      <span>{restaurant["Offer Title"]}</span>
                    </div>
                  )}

                  {restaurant.Description && (
                    <p className="description">{restaurant.Description}</p>
                  )}

                  <div className="detail-chips">
                    {restaurant.Price && (
                      <span className="detail-chip">Price: {restaurant.Price}</span>
                    )}
                    {restaurant["Student Discount"] && (
                      <span className="detail-chip detail-chip-discount">
                        Discount: {restaurant["Student Discount"]}
                      </span>
                    )}
                  </div>

                  <div className="restaurant-details refined-details">
                    {restaurant.Address && (
                      <div className="detail-row">
                        <span className="detail-label">Address</span>
                        <span className="detail-value">{restaurant.Address}</span>
                      </div>
                    )}

                    {restaurant["Offer Valid Until"] && (
                      <div className="detail-row">
                        <span className="detail-label">Valid until</span>
                        <span className="detail-value">
                          {restaurant["Offer Valid Until"]}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    {restaurant.Website ? (
                      <a
                        href={restaurant.Website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="website-link refined-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit website
                      </a>
                    ) : (
                      <span className="no-website-text">No website listed</span>
                    )}

                    <button
                      type="button"
                      className="focus-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestaurantSelect && onRestaurantSelect(originalIndex);
                      }}
                    >
                      View on map
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantList;