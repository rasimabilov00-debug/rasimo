import React, { useState, useEffect, useMemo } from "react";
import MapComponent from "./MapComponent";
import RestaurantList from "./RestaurantList";
import { fetchRestaurantsFromSERPAPI } from "./utils/sheetFetcher";
import {
  fetchRestaurantsFromHunter,
  resolveRestaurantWebsites,
} from "./utils/restaurantHunter";
import { normalizeSourceLabel } from "./utils/sourceLabel";
import { normalizeRestaurantList } from "./utils/restaurantNormalizer";
import "./App.css";

const TARGET_RESTAURANT_COUNT = 52;
const FAVORITES_STORAGE_KEY = "restaurantFavorites";

const normalizeText = (value) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const toSearchableText = (restaurant = {}) => {
  const tagValue =
    Array.isArray(restaurant.tags) || Array.isArray(restaurant.Tags)
      ? [...(restaurant.tags || []), ...(restaurant.Tags || [])].join(" ")
      : restaurant.tags || restaurant.Tags || "";

  const parts = [
    restaurant.name,
    restaurant.category,
    tagValue,
    restaurant.address,
    restaurant.description,
  ];

  return normalizeText(parts.filter(Boolean).join(" "));
};

const toKeywordText = (restaurant = {}) => {
  const tagValue =
    Array.isArray(restaurant.tags) || Array.isArray(restaurant.Tags)
      ? [...(restaurant.tags || []), ...(restaurant.Tags || [])].join(" ")
      : restaurant.tags || restaurant.Tags || "";

  return normalizeText(
    [
      restaurant.category,
      tagValue,
    ]
      .filter(Boolean)
      .join(" ")
  );
};

const toSuggestionFields = (restaurant = {}) => {
  const tagValue =
    Array.isArray(restaurant.tags) || Array.isArray(restaurant.Tags)
      ? [...(restaurant.tags || []), ...(restaurant.Tags || [])].join(" ")
      : restaurant.tags || restaurant.Tags || "";

  return [
    restaurant.name,
    restaurant.category,
    tagValue,
    restaurant.address,
  ].map((value) => (value || "").toString().trim()).filter(Boolean);
};

const getSearchScore = (restaurant = {}, searchTokens = [], fullQuery = "") => {
  const nameText = normalizeText(restaurant.name);
  const keywordText = toKeywordText(restaurant);
  const addressText = normalizeText(restaurant.address);
  const descriptionText = normalizeText(restaurant.description);
  const searchableText = toSearchableText(restaurant);

  let score = 0;

  for (const token of searchTokens) {
    if (!searchableText.includes(token)) {
      return -1;
    }

    if (nameText.includes(token)) score += 12;
    if (keywordText.includes(token)) score += 8;
    if (addressText.includes(token)) score += 3;
    if (descriptionText.includes(token)) score += 2;

    if (nameText.startsWith(token)) score += 4;
    if (keywordText.startsWith(token)) score += 3;
  }

  if (fullQuery) {
    if (nameText.includes(fullQuery)) score += 8;
    if (keywordText.includes(fullQuery)) score += 6;
    if (addressText.includes(fullQuery)) score += 2;
    if (descriptionText.includes(fullQuery)) score += 1;
  }

  return score;
};

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const toCoordinateKey = (restaurant = {}) => {
  const lat = Number.parseFloat(restaurant.lat);
  const lng = Number.parseFloat(restaurant.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return "";
  return `${lat.toFixed(5)}__${lng.toFixed(5)}`;
};

const toRestaurantKey = (restaurant = {}) => {
  const name = normalizeText(restaurant.name);
  const address = normalizeText(restaurant.address);

  if (!name) return "";
  if (address) return `${name}__addr__${address}`;

  const coordinateKey = toCoordinateKey(restaurant);
  if (coordinateKey) return `${name}__geo__${coordinateKey}`;

  return `${name}__name__`;
};

const getFavoriteKey = (restaurant = {}) => {
  const idValue = (restaurant?.id || "").toString().trim();
  if (idValue) return `id__${idValue}`;

  const name = normalizeText(restaurant?.name);
  const address = normalizeText(restaurant?.address);
  if (name && address) return `name_addr__${name}__${address}`;
  if (name) return `name__${name}`;

  return "";
};

const toSourceList = (restaurant = {}) => {
  const sources = [];

  if (Array.isArray(restaurant.sources)) {
    sources.push(...restaurant.sources);
  } else if (typeof restaurant.sources === "string") {
    sources.push(...restaurant.sources.split(/[|,]/g));
  }

  if (Array.isArray(restaurant.Sources)) {
    sources.push(...restaurant.Sources);
  } else if (typeof restaurant.Sources === "string") {
    sources.push(...restaurant.Sources.split(/[|,]/g));
  }

  if (hasValue(restaurant.source)) {
    sources.push(normalizeSourceLabel(restaurant.source));
  }

  return Array.from(new Set(sources.map((s) => `${s}`.trim()).filter(Boolean)));
};

const pickPreferredValue = (existingValue, incomingValue) => {
  const existingHasValue = hasValue(existingValue);
  const incomingHasValue = hasValue(incomingValue);

  if (!existingHasValue && incomingHasValue) return incomingValue;
  if (existingHasValue && !incomingHasValue) return existingValue;
  if (!existingHasValue && !incomingHasValue) return existingValue;

  if (typeof existingValue === "string" && typeof incomingValue === "string") {
    if (incomingValue.trim().length > existingValue.trim().length) {
      return incomingValue;
    }
  }

  return existingValue;
};

const mergeRestaurantRecord = (existing = {}, incoming = {}) => {
  const merged = { ...existing };
  const keys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);

  keys.forEach((key) => {
    merged[key] = pickPreferredValue(existing[key], incoming[key]);
  });

  const sources = Array.from(
    new Set([...toSourceList(existing), ...toSourceList(incoming)])
  );

  if (sources.length > 0) {
    merged.source = sources[0];
    merged.sources = sources;
  }

  return merged;
};

const mergeRestaurantLists = (baseRestaurants = [], hunterRestaurants = []) => {
  const mergedByKey = new Map();
  const orderedKeys = [];

  [...baseRestaurants, ...hunterRestaurants].forEach((restaurant, index) => {
    if (!restaurant || !hasValue(restaurant.name)) return;

    const key = toRestaurantKey(restaurant) || `fallback_${index}`;
    const existing = mergedByKey.get(key);

    if (!existing) {
      mergedByKey.set(key, restaurant);
      orderedKeys.push(key);
      return;
    }

    mergedByKey.set(key, mergeRestaurantRecord(existing, restaurant));
  });

  return orderedKeys.map((key) => mergedByKey.get(key)).filter(Boolean);
};

function App({ restaurants, setRestaurants }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteKeys, setFavoriteKeys] = useState(() => {
    try {
      const rawValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed = rawValue ? JSON.parse(rawValue) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);

        const [baseResult, hunterResult] = await Promise.allSettled([
          fetchRestaurantsFromSERPAPI(),
          fetchRestaurantsFromHunter(
            "",
            "Budapest, Hungary",
            80,
            false
          ),
        ]);

        const baseRestaurants =
          baseResult.status === "fulfilled" && Array.isArray(baseResult.value)
            ? normalizeRestaurantList(baseResult.value, { defaultSource: "sheet" })
            : [];

        const hunterRestaurants =
          hunterResult.status === "fulfilled" && Array.isArray(hunterResult.value)
            ? normalizeRestaurantList(hunterResult.value, {
                defaultSource: "hunter",
              })
            : [];

        if (baseResult.status === "rejected") {
          console.warn("Sheet/pipeline fetch failed:", baseResult.reason);
        }

        if (hunterResult.status === "rejected") {
          console.warn("Hunter fetch failed:", hunterResult.reason);
        }

        const combined = mergeRestaurantLists(baseRestaurants, hunterRestaurants).slice(
          0,
          TARGET_RESTAURANT_COUNT
        );
        const withResolvedWebsites = normalizeRestaurantList(
          await resolveRestaurantWebsites(combined)
        );

        let savedAdminRestaurants = [];

try {
  const saved = localStorage.getItem("adminUpdatedRestaurants");
  savedAdminRestaurants = saved ? JSON.parse(saved) : [];
} catch {
  savedAdminRestaurants = [];
}

const finalRestaurants = mergeRestaurantLists(
  savedAdminRestaurants,
  withResolvedWebsites
);

        console.log("✅ Loaded base restaurants:", baseRestaurants.length);
        console.log("✅ Loaded hunter restaurants:", hunterRestaurants.length);
        console.log("✅ Final merged restaurants:", combined.length);
        console.log("✅ Final restaurants including admin changes:", finalRestaurants.length);

        setRestaurants(finalRestaurants);
      } catch (err) {
        console.error("Failed to load restaurants:", err);
        setError("Error loading restaurant data.");
      } finally {
        setLoading(false);
      }
    };

    loadRestaurants();
  }, []);

  const handleRestaurantSelect = (restaurantId) => {
    setSelectedRestaurantId(restaurantId);
  };

  const toggleFavorite = (restaurant) => {
    const favoriteKey = getFavoriteKey(restaurant);
    if (!favoriteKey) return;

    setFavoriteKeys((currentKeys) => {
      if (currentKeys.includes(favoriteKey)) {
        return currentKeys.filter((key) => key !== favoriteKey);
      }

      return [...currentKeys, favoriteKey];
    });
  };

  const normalizedSearch = normalizeText(searchText);
  const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean);

  const categoryOptions = [
    "All",
    ...Array.from(
      new Set(
        restaurants
          .map((r) => (r?.category || "").toString().trim())
          .filter(Boolean)
      )
    ).sort(),
  ];

  const favoriteKeySet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);

  const filteredRestaurants = useMemo(() => {
    return restaurants
      .map((restaurant, originalIndex) => ({ restaurant, originalIndex }))
      .filter(({ restaurant }) => {
        const matchesCategory =
          selectedCategory === "All" ||
          (restaurant?.category || "").toString().trim() === selectedCategory;

        if (!matchesCategory) return false;
        if (!showFavoritesOnly) return true;

        const favoriteKey = getFavoriteKey(restaurant);
        return favoriteKey ? favoriteKeySet.has(favoriteKey) : false;
      })
      .map(({ restaurant, originalIndex }) => {
        if (searchTokens.length === 0) {
          return { restaurant, originalIndex, score: 0 };
        }

        const score = getSearchScore(restaurant, searchTokens, normalizedSearch);
        return score < 0 ? null : { restaurant, originalIndex, score };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.originalIndex - b.originalIndex;
      })
      .map(({ restaurant }) => restaurant);
  }, [
    restaurants,
    selectedCategory,
    searchTokens,
    normalizedSearch,
    showFavoritesOnly,
    favoriteKeySet,
  ]);

  const searchSuggestions = useMemo(() => {
    if (!normalizedSearch) return [];

    const suggestions = [];
    const seen = new Set();

    for (const restaurant of restaurants) {
      if (
        selectedCategory !== "All" &&
        (restaurant?.category || "").toString().trim() !== selectedCategory
      ) {
        continue;
      }

      if (showFavoritesOnly) {
        const favoriteKey = getFavoriteKey(restaurant);
        if (!favoriteKey || !favoriteKeySet.has(favoriteKey)) {
          continue;
        }
      }

      const fields = toSuggestionFields(restaurant);

      for (const field of fields) {
        const normalizedField = normalizeText(field);

        if (
          !normalizedField.includes(normalizedSearch) ||
          seen.has(normalizedField)
        ) {
          continue;
        }

        seen.add(normalizedField);
        suggestions.push(field);

        if (suggestions.length >= 8) {
          return suggestions;
        }
      }
    }

    return suggestions;
  }, [
    restaurants,
    selectedCategory,
    normalizedSearch,
    showFavoritesOnly,
    favoriteKeySet,
  ]);

  useEffect(() => {
    setSelectedRestaurantId(null);
  }, [searchText, selectedCategory, showFavoritesOnly]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteKeys)
      );
    } catch {
    }
  }, [favoriteKeys]);

  return (
    <div className="app-shell">
      <div className="app-container">
        <div className="map-section">
          <MapComponent
            restaurants={filteredRestaurants}
            onRestaurantSelect={handleRestaurantSelect}
            selectedRestaurantId={selectedRestaurantId}
            loading={loading}
          />
        </div>
        <div className="list-section">
          <RestaurantList
            restaurants={filteredRestaurants}
            selectedRestaurantId={selectedRestaurantId}
            onRestaurantSelect={handleRestaurantSelect}
            loading={loading}
            error={error}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categoryOptions}
            searchText={searchText}
            onSearchChange={setSearchText}
            searchSuggestions={searchSuggestions}
            showFavoritesOnly={showFavoritesOnly}
            onShowFavoritesOnlyChange={setShowFavoritesOnly}
            favoriteKeySet={favoriteKeySet}
            onToggleFavorite={toggleFavorite}
            getFavoriteKey={getFavoriteKey}
          />
        </div>
      </div>
    </div>
  );
}

export default App;