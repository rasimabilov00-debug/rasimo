import Papa from "papaparse";

const SHEET_ID = "18lnywex_IOZegpbI9XbaEcDyV5Y5H-R8K7gzxGFtido";
const API_KEY = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;

// Your tab name from the screenshot
const SHEET_RANGE = "Form_Responses!A1:Z2000";

const SHEETS_API_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
  SHEET_RANGE
)}?key=${API_KEY}`;

// CSV fallback
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const normalizeText = (value) => (value || "").toString().trim();

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

const toRestaurantShape = (row = {}) => ({
  "Restaurant Name": row["Restaurant Name"] || "",
  Address: row.Address || "",
  Latitude: row.Latitude ? String(row.Latitude) : "",
  Longitude: row.Longitude ? String(row.Longitude) : "",
  "Offer Title": row["Offer Title"] || "",
  Description: row.Description || "",
  Price: row.Price || "",
  "Offer Valid Until": row["Offer Valid Until"] || "",
  Website: row.Website || "",
  Category: row.Category || "Restaurant",
  "Student Discount": row["Student Discount"] || "",
});

const hasValidCoords = (row) => {
  const lat = parseFloat(row.Latitude);
  const lng = parseFloat(row.Longitude);

  return !Number.isNaN(lat) && !Number.isNaN(lng);
};

export const fetchRestaurantData = async () => {
  console.log("🔍 Starting Google Sheet fetch...");
  console.log("🔑 API key present:", !!API_KEY);
  console.log("📄 Sheet range:", SHEET_RANGE);

  // Try Google Sheets API first
  if (API_KEY) {
    try {
      console.log("🔐 Fetching via Google Sheets API...");
      const response = await fetch(SHEETS_API_URL);

      if (!response.ok) {
        const text = await response.text();
        console.warn("⚠️ Sheets API failed, switching to CSV fallback:", response.status, text);
        throw new Error(`Sheets API failed: ${response.status}`);
      }

      const data = await response.json();
      const parsed = parseRowsToObjects(data.values || []).map(toRestaurantShape);

      const valid = parsed.filter(
        (r) => normalizeText(r["Restaurant Name"]) && hasValidCoords(r)
      );

      console.log("✅ Sheets API total rows:", parsed.length);
      console.log("🗺️ Sheets API valid restaurants:", valid.length);
      console.log("🍽️ Restaurant names:", valid.map((r) => r["Restaurant Name"]));

      return valid;
    } catch (error) {
      console.warn("⚠️ Google Sheets API error, using CSV fallback:", error);
    }
  }

  // CSV fallback
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

    const parsed = rows.map(toRestaurantShape);

    const valid = parsed.filter(
      (r) => normalizeText(r["Restaurant Name"]) && hasValidCoords(r)
    );

    console.log("✅ CSV total rows:", parsed.length);
    console.log("🗺️ CSV valid restaurants:", valid.length);
    console.log("🍽️ Restaurant names:", valid.map((r) => r["Restaurant Name"]));

    return valid;
  } catch (error) {
    console.error("💥 Google Sheet fetch failed:", error);
    return [];
  }
};

// IMPORTANT: App.js already calls fetchRestaurantsFromSERPAPI,
// so make it return sheet data directly
export const fetchRestaurantsFromSERPAPI = fetchRestaurantData;