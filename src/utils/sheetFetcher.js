import Papa from "papaparse";

const SHEET_ID = "18lnywex_IOZegpbI9XbaEcDyV5Y5H-R8K7gzxGFtido";
const API_KEY = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;
const SHEET_RANGE = "Form_Responses!A1:Z2000";

const SHEETS_API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
  SHEET_RANGE
)}?key=${API_KEY}`;

const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const PIPELINE_URL = "/pipeline-restaurants.json";

const normalizeText = (value) => (value || "").toString().trim();

const normalizeKey = (restaurant = {}) => {
  const name = normalizeText(restaurant["Restaurant Name"]).toLowerCase();
  const address = normalizeText(restaurant.Address).toLowerCase();
  return `${name}__${address}`;
};

const hasValidCoords = (row) => {
  const lat = parseFloat(row.Latitude);
  const lng = parseFloat(row.Longitude);
  return !Number.isNaN(lat) && !Number.isNaN(lng);
};

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

const toRestaurantShape = (row = {}, source = "sheet") => ({
  "Restaurant Name":
    row["Restaurant Name"] || row.name || row.title || "",
  Address: row.Address || row.address || "",
  Latitude:
    row.Latitude !== undefined && row.Latitude !== null && row.Latitude !== ""
      ? String(row.Latitude)
      : row.latitude !== undefined && row.latitude !== null && row.latitude !== ""
      ? String(row.latitude)
      : "",
  Longitude:
    row.Longitude !== undefined && row.Longitude !== null && row.Longitude !== ""
      ? String(row.Longitude)
      : row.longitude !== undefined && row.longitude !== null && row.longitude !== ""
      ? String(row.longitude)
      : "",
  "Offer Title":
    row["Offer Title"] || row.offerTitle || row.offer_title || "",
  Description: row.Description || row.description || "",
  Price: row.Price || row.price || "",
  "Offer Valid Until":
    row["Offer Valid Until"] || row.offerValidUntil || "",
  Website: row.Website || row.website || row.link || "",
  Category: row.Category || row.category || "Restaurant",
  "Student Discount":
    row["Student Discount"] || row.studentDiscount || "",
  Source: row.Source || row.source || source,
});

const mergeRestaurants = (sheetRestaurants = [], pipelineRestaurants = []) => {
  const merged = [];
  const seen = new Set();

  // pipeline first so pipeline version wins on duplicates
  [...pipelineRestaurants, ...sheetRestaurants].forEach((restaurant) => {
    const shaped = toRestaurantShape(restaurant, restaurant.Source || "sheet");
    const key = normalizeKey(shaped);

    if (!normalizeText(shaped["Restaurant Name"])) return;
    if (!hasValidCoords(shaped)) return;
    if (seen.has(key)) return;

    seen.add(key);
    merged.push(shaped);
  });

  return merged;
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
        (r) => normalizeText(r["Restaurant Name"]) && hasValidCoords(r)
      );

      console.log("✅ Sheets API total rows:", parsed.length);
      console.log("🗺️ Sheets API valid restaurants:", valid.length);
      console.log(
        "🍽️ Sheet restaurant names:",
        valid.map((r) => r["Restaurant Name"])
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
      (r) => normalizeText(r["Restaurant Name"]) && hasValidCoords(r)
    );

    console.log("✅ CSV total rows:", parsed.length);
    console.log("🗺️ CSV valid restaurants:", valid.length);
    console.log(
      "🍽️ Sheet restaurant names:",
      valid.map((r) => r["Restaurant Name"])
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
      (r) => normalizeText(r["Restaurant Name"]) && hasValidCoords(r)
    );

    console.log("🟣 Pipeline total rows:", parsed.length);
    console.log("🟣 Pipeline valid restaurants:", valid.length);
    console.log(
      "🟣 Pipeline restaurant names:",
      valid.map((r) => r["Restaurant Name"])
    );

    return valid;
  } catch (error) {
    console.warn("⚠️ Pipeline fetch failed:", error);
    return [];
  }
};

export const fetchRestaurantData = async () => {
  const [sheetRestaurants, pipelineRestaurants] = await Promise.all([
    fetchSheetRestaurants(),
    fetchPipelineRestaurants(),
  ]);

  const merged = mergeRestaurants(sheetRestaurants, pipelineRestaurants);

  console.log("✅ Final merged restaurants:", merged.length);
  console.log(
    "✅ Final sources:",
    merged.map((r) => ({
      name: r["Restaurant Name"],
      source: r.Source,
    }))
  );

  return merged;
};

export const fetchRestaurantsFromSERPAPI = fetchRestaurantData;