import Papa from "papaparse";
import { normalizeSourceLabel } from "./sourceLabel";
import {
  hasNormalizedCoords,
  normalizeRestaurant,
} from "./restaurantNormalizer";

const SHEET_ID = "18lnywex_IOZegpbI9XbaEcDyV5Y5H-R8K7gzxGFtido";
const API_KEY = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;
const SHEET_RANGE = "Form_Responses!A1:Z2000";

const SHEETS_API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
  SHEET_RANGE
)}?key=${API_KEY}`;

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const PIPELINE_URL = "/pipeline-restaurants.json";

// Data source 1: Google Sheet (API first, CSV fallback). Data source 2: local pipeline JSON.

const normalizeText = (value) => (value || "").toString().trim();
const normalizeLookupText = (value) => normalizeText(value).toLowerCase();

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return normalizeText(value) !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const toCoordinateKey = (restaurant = {}) => {
  const lat = Number.parseFloat(restaurant.lat);
  const lng = Number.parseFloat(restaurant.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return "";

  // Round coordinates for stable duplicate matching across source precision differences.
  return `${lat.toFixed(5)}__${lng.toFixed(5)}`;
};

const toRestaurantMergeKey = (restaurant = {}) => {
  const name = normalizeLookupText(restaurant.name);
  const address = normalizeLookupText(restaurant.address);

  if (!name) return "";
  if (address) return `${name}__addr__${address}`;

  const coordinateKey = toCoordinateKey(restaurant);
  if (coordinateKey) return `${name}__geo__${coordinateKey}`;

  return `${name}__name__`;
};

const toSourceList = (restaurant = {}) => {
  const parts = [];

  if (Array.isArray(restaurant.Sources)) {
    parts.push(...restaurant.Sources);
  } else if (typeof restaurant.Sources === "string") {
    parts.push(...restaurant.Sources.split(/[|,]/g));
  }

  if (hasValue(restaurant.source)) {
    parts.push(normalizeSourceLabel(restaurant.source));
  }

  return Array.from(
    new Set(parts.map((part) => normalizeText(part)).filter(Boolean))
  );
};

const pickPreferredValue = (existingValue, incomingValue) => {
  const existingHasValue = hasValue(existingValue);
  const incomingHasValue = hasValue(incomingValue);

  if (!existingHasValue && incomingHasValue) return incomingValue;
  if (existingHasValue && !incomingHasValue) return existingValue;
  if (!existingHasValue && !incomingHasValue) return existingValue;

  if (typeof existingValue === "string" && typeof incomingValue === "string") {
    const existingText = normalizeText(existingValue);
    const incomingText = normalizeText(incomingValue);

    if (incomingText.length > existingText.length) {
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

  // Keep source lineage from all matching records while preserving first-source stability.
  const sources = Array.from(
    new Set([...toSourceList(existing), ...toSourceList(incoming)])
  );

  if (sources.length > 0) {
    merged.source = sources[0];
    merged.sources = sources;
    // Keep legacy aliases temporarily so older code paths do not break.
    merged.Source = sources[0];
    merged.Sources = sources;
  }

  return merged;
};

const hasValidCoords = (row) => hasNormalizedCoords(row);

const parseRowsToObjects = (values = []) => {
  if (!values.length) return [];

  const headers = values[0];

  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] !== undefined ? row[idx] : "";
    });
    return obj;
  });
};

const toRestaurantShape = (row = {}, source = "sheet") =>
  normalizeRestaurant({
    ...row,
    source: row.source || row.Source || source,
  }, { defaultSource: source });

const mergeRestaurants = (sheetRestaurants = [], pipelineRestaurants = []) => {
  const mergedByKey = new Map();
  const orderedKeys = [];

  // Merge strategy:
  // 1) Shape all records into a common schema.
  // 2) Deduplicate by name+address when available, otherwise by name+coordinates.
  // 3) Merge duplicate rows to keep the most useful non-empty fields from each source.
  // 4) Keep insertion order stable so results are predictable across renders.
  [...pipelineRestaurants, ...sheetRestaurants].forEach((restaurant, index) => {
    const shaped = toRestaurantShape(restaurant, restaurant.source || "sheet");

    if (!normalizeText(shaped.name)) return;
    if (!hasValidCoords(shaped)) return;

    const mergeKey = toRestaurantMergeKey(shaped) || `fallback_${index}`;
    const existing = mergedByKey.get(mergeKey);

    if (!existing) {
      mergedByKey.set(mergeKey, shaped);
      orderedKeys.push(mergeKey);
      return;
    }

    mergedByKey.set(mergeKey, mergeRestaurantRecord(existing, shaped));
  });

  return orderedKeys.map((key) => mergedByKey.get(key)).filter(Boolean);
};

const fetchSheetRestaurants = async () => {
  console.log("🔍 Starting Google Sheet fetch...");
  console.log("🔑 API key present:", !!API_KEY);
  console.log("📄 Sheet range:", SHEET_RANGE);

  if (API_KEY) {
    try {
      console.log("🔐 Fetching via Google Sheets API...");
      const response = await fetch(SHEETS_API_URL);

      if (!response.ok) {
        const text = await response.text();
        console.warn(
          "⚠️ Sheets API failed, switching to CSV fallback:",
          response.status,
          text
        );
        throw new Error(`Sheets API failed: ${response.status}`);
      }

      const data = await response.json();
      const parsed = parseRowsToObjects(data.values || []).map((row) =>
        toRestaurantShape(row, "sheet")
      );

      const valid = parsed.filter(
        (r) => normalizeText(r.name) && hasValidCoords(r)
      );

      console.log("✅ Sheets API total rows:", parsed.length);
      console.log("🗺️ Sheets API valid restaurants:", valid.length);
      console.log(
        "🍽️ Sheet restaurant names:",
        valid.map((r) => r.name)
      );

      return valid;
    } catch (error) {
      console.warn("⚠️ Google Sheets API error, using CSV fallback:", error);
    }
  }

  try {
    console.log("🔄 Fetching via CSV fallback...");
    const response = await fetch(SHEET_URL);

    if (!response.ok) {
      throw new Error(`CSV fetch failed: ${response.status}`);
    }

    const csvText = await response.text();

    const rows = await new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data || []),
        error: reject,
      });
    });

    const parsed = rows.map((row) => toRestaurantShape(row, "sheet"));

    const valid = parsed.filter(
      (r) => normalizeText(r.name) && hasValidCoords(r)
    );

    console.log("✅ CSV total rows:", parsed.length);
    console.log("🗺️ CSV valid restaurants:", valid.length);
    console.log(
      "🍽️ Sheet restaurant names:",
      valid.map((r) => r.name)
    );

    return valid;
  } catch (error) {
    console.error("💥 Google Sheet fetch failed:", error);
    return [];
  }
};

const fetchPipelineRestaurants = async () => {
  try {
    console.log(`🟣 Fetching pipeline restaurants from ${PIPELINE_URL}...`);
    const response = await fetch(PIPELINE_URL);

    if (!response.ok) {
      throw new Error(`Pipeline file fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const parsedArray = Array.isArray(data)
      ? data
      : Array.isArray(data.restaurants)
      ? data.restaurants
      : [];

    const parsed = parsedArray.map((item) => toRestaurantShape(item, "pipeline"));

    const valid = parsed.filter(
      (r) => normalizeText(r.name) && hasValidCoords(r)
    );

    console.log("🟣 Pipeline total rows:", parsed.length);
    console.log("🟣 Pipeline valid restaurants:", valid.length);
    console.log(
      "🟣 Pipeline restaurant names:",
      valid.map((r) => r.name)
    );

    return valid;
  } catch (error) {
    console.warn("⚠️ Pipeline fetch failed:", error);
    return [];
  }
};

export const fetchRestaurantData = async () => {
  // Fetch both sources in parallel, then return one merged list for the app.
  const [sheetRestaurants, pipelineRestaurants] = await Promise.all([
    fetchSheetRestaurants(),
    fetchPipelineRestaurants(),
  ]);

  const merged = mergeRestaurants(sheetRestaurants, pipelineRestaurants);

  console.log("✅ Final merged restaurants:", merged.length);
  console.log(
    "✅ Final sources:",
    merged.map((r) => ({
      name: r.name,
      source: r.source,
    }))
  );

  return merged;
};

export const fetchRestaurantsFromSERPAPI = fetchRestaurantData;