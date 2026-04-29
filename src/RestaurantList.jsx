import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RestaurantList.css";
import { getRestaurantWebsiteUrl } from "./utils/websiteUrl";
import {
  getRestaurantSourceLabel,
  getSourceDisplayLabel,
} from "./utils/sourceLabel";

const RestaurantList = ({
  restaurants = [],
  selectedRestaurantId,
  onRestaurantSelect,
  loading,
  error,
  selectedCategory = "All",
  onCategoryChange,
  categories = ["All"],
  searchText = "",
  onSearchChange,
  searchSuggestions = [],
  showFavoritesOnly = false,
  onShowFavoritesOnlyChange,
  favoriteKeySet,
  onToggleFavorite,
  getFavoriteKey,
}) => {
  const itemRefs = useRef([]);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);

  const indexedRestaurants = useMemo(
    () => restaurants.map((restaurant, index) => ({ restaurant, index })),
    [restaurants]
  );

  useEffect(() => {
    if (!selectedRestaurantId) {
      return;
    }

    const selectedIndex = indexedRestaurants.findIndex(
      ({ restaurant }) => restaurant?.id === selectedRestaurantId
    );

    if (selectedIndex === -1) {
      return;
    }

    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedRestaurantId, indexedRestaurants]);

  const hasSearchText = searchText.toString().trim() !== "";
  const visibleSuggestions = hasSearchText && isSuggestionOpen ? searchSuggestions : [];

  const handleSearchChange = (event) => {
    if (!onSearchChange) return;
    onSearchChange(event.target.value);
    setIsSuggestionOpen(true);
  };

  const handleSuggestionSelect = (suggestion) => {
    if (onSearchChange) {
      onSearchChange(suggestion);
    }
    setIsSuggestionOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsSuggestionOpen(false);
      event.currentTarget.blur();
    }
  };

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
            <div className="search-input-wrap">
              <input
                id="restaurant-search"
                type="text"
                placeholder="burger, pizza, cheap, name..."
                value={searchText}
                onChange={handleSearchChange}
                onFocus={() => setIsSuggestionOpen(true)}
                onBlur={() => setIsSuggestionOpen(false)}
                onKeyDown={handleSearchKeyDown}
              />

              {visibleSuggestions.length > 0 && (
                <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
                  {visibleSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="search-suggestion-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="favorites-filter modern-filter">
            <label htmlFor="favorites-only">Favorites</label>
            <label className="favorites-toggle-row" htmlFor="favorites-only">
              <input
                id="favorites-only"
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) =>
                  onShowFavoritesOnlyChange &&
                  onShowFavoritesOnlyChange(e.target.checked)
                }
              />
              <span>Show favorites only</span>
            </label>
          </div>
        </div>

        {indexedRestaurants.length === 0 ? (
          <div className="panel-state-card">No restaurants found.</div>
        ) : (
          <div className="restaurants-grid modern-grid">
            {indexedRestaurants.map(({ restaurant, index }) => {
              const isSelected = restaurant?.id === selectedRestaurantId;
              const favoriteKey = getFavoriteKey ? getFavoriteKey(restaurant) : "";
              const isFavorite = favoriteKey ? favoriteKeySet?.has(favoriteKey) : false;
              const sourceLabel = getRestaurantSourceLabel(restaurant);
              const isPipeline = sourceLabel === "pipeline";
              const isHunting = sourceLabel === "hunting";
              const websiteUrl = getRestaurantWebsiteUrl(restaurant);
              const displayPrice = (restaurant.price || "").toString().trim() || "Not listed";
              const sourceBadgeClass = isPipeline
                ? "pipeline-badge"
                : isHunting
                ? "hunter-badge"
                : "sheet-badge";
              const sourceCardClass = isPipeline
                ? "pipeline-card"
                : isHunting
                ? "hunter-card"
                : "sheet-card";

              return (
                <div
                  key={`${favoriteKey || restaurant.id || restaurant.name || "restaurant"}-${index}`}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  className={`restaurant-card modern-card ${isSelected ? "selected" : ""} ${sourceCardClass}`}
                  onClick={() => onRestaurantSelect && onRestaurantSelect(restaurant.id)}
                >
                  <div className="restaurant-card-top">
                    <div className="restaurant-title-wrap">
                      <h3>{restaurant.name}</h3>
                      {restaurant.category && (
                        <p className="restaurant-mini-category">{restaurant.category}</p>
                      )}
                    </div>

                    <div className="restaurant-card-actions">
                      <button
                        type="button"
                        className={`favorite-button ${isFavorite ? "is-favorite" : ""}`}
                        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite && onToggleFavorite(restaurant);
                        }}
                      >
                        {isFavorite ? "♥" : "♡"}
                      </button>

                      <span className={`source-badge ${sourceBadgeClass}`}>
                        {getSourceDisplayLabel(sourceLabel)}
                      </span>
                    </div>
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
                    <span className="detail-chip">Price: {displayPrice}</span>
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
                        onRestaurantSelect && onRestaurantSelect(restaurant.id);
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