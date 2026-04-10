import React, { useEffect, useMemo, useRef } from "react";
import "./RestaurantList.css";
import { getRestaurantWebsiteUrl } from "./utils/websiteUrl";
import {
  getRestaurantSourceLabel,
  getSourceDisplayLabel,
} from "./utils/sourceLabel";

const RestaurantList = ({
  restaurants = [],
  selectedRestaurantIndex,
  onRestaurantSelect,
  loading,
  error,
  selectedCategory = "All",
  onCategoryChange,
  categories = ["All"],
  searchText = "",
  onSearchChange,
}) => {
  const itemRefs = useRef([]);

  // This list is already filtered by App (category + search), so no extra filtering here.
  const indexedRestaurants = useMemo(
    () => restaurants.map((restaurant, index) => ({ restaurant, index })),
    [restaurants]
  );

  useEffect(() => {
    if (selectedRestaurantIndex === null || selectedRestaurantIndex === undefined) {
      return;
    }

    if (itemRefs.current[selectedRestaurantIndex]) {
      itemRefs.current[selectedRestaurantIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedRestaurantIndex, indexedRestaurants]);

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
          </div>

          <div className="panel-counter-card">
            <span className="panel-counter-label">Visible</span>
            <span className="panel-counter-value">{indexedRestaurants.length}</span>
          </div>
        </div>

        <div className="restaurant-toolbar">
          <div className="category-filter modern-filter">
            <label htmlFor="category-select">Selected Category</label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={(e) => onCategoryChange && onCategoryChange(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="search-filter modern-filter">
            <label htmlFor="restaurant-search">Search</label>
            <input
              id="restaurant-search"
              type="text"
              placeholder="burger, pizza, cheap, name..."
              value={searchText}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {indexedRestaurants.length === 0 ? (
          <div className="panel-state-card">No restaurants found.</div>
        ) : (
          <div className="restaurants-grid modern-grid">
            {indexedRestaurants.map(({ restaurant, index }) => {
              const isSelected = index === selectedRestaurantIndex;
              const sourceLabel = getRestaurantSourceLabel(restaurant);
              const isPipeline = sourceLabel === "pipeline";
              const isHunter = sourceLabel === "hunter";
              // Shared helper keeps website links clean and consistent across list/map.
              const websiteUrl = getRestaurantWebsiteUrl(restaurant);
              const sourceBadgeClass = isPipeline
                ? "pipeline-badge"
                : isHunter
                ? "hunter-badge"
                : "sheet-badge";
              const sourceCardClass = isPipeline
                ? "pipeline-card"
                : isHunter
                ? "hunter-card"
                : "sheet-card";

              return (
                <div
                  key={`${restaurant.id || restaurant.name || "restaurant"}-${index}`}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  className={`restaurant-card modern-card ${isSelected ? "selected" : ""} ${sourceCardClass}`}
                  onClick={() =>
                    onRestaurantSelect && onRestaurantSelect(index)
                  }
                >
                  <div className="restaurant-card-top">
                    <div className="restaurant-title-wrap">
                      <h3>{restaurant.name}</h3>
                      {restaurant.category && (
                        <p className="restaurant-mini-category">{restaurant.category}</p>
                      )}
                    </div>

                    <span className={`source-badge ${sourceBadgeClass}`}>
                      {getSourceDisplayLabel(sourceLabel)}
                    </span>
                  </div>

                  {restaurant.offerTitle && (
                    <div className="offer-banner">
                      <span className="offer-icon">✦</span>
                      <span>{restaurant.offerTitle}</span>
                    </div>
                  )}

                  {restaurant.description && (
                    <p className="description">{restaurant.description}</p>
                  )}

                  <div className="detail-chips">
                    {restaurant.price && (
                      <span className="detail-chip">Price: {restaurant.price}</span>
                    )}
                    {restaurant.studentDiscount && (
                      <span className="detail-chip detail-chip-discount">
                        Discount: {restaurant.studentDiscount}
                      </span>
                    )}
                  </div>

                  <div className="restaurant-details refined-details">
                    {restaurant.address && (
                      <div className="detail-row">
                        <span className="detail-label">Address</span>
                        <span className="detail-value">{restaurant.address}</span>
                      </div>
                    )}

                    {restaurant.offerValidUntil && (
                      <div className="detail-row">
                        <span className="detail-label">Valid until</span>
                        <span className="detail-value">
                          {restaurant.offerValidUntil}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    {websiteUrl && (
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="website-link refined-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit website
                      </a>
                    )}

                    <button
                      type="button"
                      className="focus-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestaurantSelect && onRestaurantSelect(index);
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