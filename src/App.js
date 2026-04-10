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

// App is the single source of truth for fetching, merging, and filtering restaurants.
const TARGET_RESTAURANT_COUNT = 52;

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

const hasRenderableCoords = (restaurant = {}) => {
  const lat = Number.parseFloat(restaurant?.lat);
  const lng = Number.parseFloat(restaurant?.lng);
  return !Number.isNaN(lat) && !Number.isNaN(lng);
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

  // Merge strategy:
  // 1) Use name+address as primary duplicate key.
  // 2) Fall back to name+coordinates if address is missing.
  // 3) Merge duplicate records to preserve useful fields from all sources.
  // 4) Keep insertion order stable so output stays predictable.
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

function App() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRestaurantIndex, setSelectedRestaurantIndex] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        setLoading(true);
        setError(null);

        // Data comes from two sources: sheet/pipeline data + hunter/API search results.
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

        // Merge duplicates first, then resolve website links in one pass.
        const combined = mergeRestaurantLists(baseRestaurants, hunterRestaurants).slice(
          0,
          TARGET_RESTAURANT_COUNT
        );
        const withResolvedWebsites = normalizeRestaurantList(
          await resolveRestaurantWebsites(combined)
        );

        console.log("✅ Loaded base restaurants:", baseRestaurants.length);
        console.log("✅ Loaded hunter restaurants:", hunterRestaurants.length);
        console.log("✅ Final merged restaurants:", combined.length);
        console.log("✅ Website-resolved restaurants:", withResolvedWebsites.length);

        setRestaurants(withResolvedWebsites);
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

  // Filtering happens only here so map markers and list cards always match.
  const filteredRestaurants = useMemo(() => {
    return restaurants
      .map((restaurant, originalIndex) => ({ restaurant, originalIndex }))
      .filter(({ restaurant }) => {
        return (
          selectedCategory === "All" ||
          (restaurant?.category || "").toString().trim() === selectedCategory
        );
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
      .map(({ restaurant }) => restaurant)
      .filter(hasRenderableCoords);
  }, [restaurants, selectedCategory, searchTokens, normalizedSearch]);

  useEffect(() => {
    setSelectedRestaurantIndex(null);
  }, [searchText, selectedCategory]);

  return (
    <div className="app-shell">
      <div className="app-container">
        <div className="map-section">
          <MapComponent
            restaurants={filteredRestaurants}
            onRestaurantSelect={handleRestaurantSelect}
            selectedRestaurantIndex={selectedRestaurantIndex}
            loading={loading}
          />
        </div>
        <div className="list-section">
          <RestaurantList
            restaurants={filteredRestaurants}
            selectedRestaurantIndex={selectedRestaurantIndex}
            onRestaurantSelect={handleRestaurantSelect}
            loading={loading}
            error={error}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categoryOptions}
            searchText={searchText}
            onSearchChange={setSearchText}
          />
        </div>
      </div>
    </div>
  );
}

export default App;