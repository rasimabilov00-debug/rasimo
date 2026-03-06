import Papa from "papaparse";

const SHEET_ID = "18lnywex_IOZegpbI9XbaEcDyV5Y5H-R8K7gzxGFtido";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// no proxies needed

export const fetchRestaurantData = async () => {
  console.log("🔍 Starting restaurant data fetch...");

  // Fetch directly since sheet is publicly accessible
  try {
    console.log("🔄 Fetching sheet directly");
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    console.log("✅ Direct fetch successful! CSV length:", csvText.length);

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          const validRestaurants = results.data.filter(
            (row) => row["Restaurant Name"] && row["Restaurant Name"].trim()
          );
          console.log("🍽️ Valid restaurants:", validRestaurants.length);
          resolve(validRestaurants);
        },
        error: (error) => reject(error),
      });
    });
  } catch (finalError) {
    console.error("💥 Fetch failed:", finalError);
    throw finalError;
  }
};
