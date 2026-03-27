/**
 * Restaurant Hunter - Integrates SerpApi notebook logic into React
 * Fetches restaurants with websites and enriches data from the API
 */

const BAD_DOMAINS = new Set([
  "tripadvisor.com",
  "foodora.hu",
  "wolt.com",
  "ubereats.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "foursquare.com",
  "yelp.com",
  "restaurantguru.com",
  "welovebudapest.com"
]);

const cleanDomain = (url) => {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return domain.replace("www.", "");
  } catch {
    return null;
  }
};

const isLikelyOfficial = (url) => {
  const domain = cleanDomain(url);
  return domain && !BAD_DOMAINS.has(domain);
};

const extractWebsiteFromItem = (item) => {
  if (!item || typeof item !== "object") return null;

  // Check nested links object
  if (item.links && typeof item.links === "object") {
    const website = item.links.website;
    if (typeof website === "string" && website.startsWith("http")) {
      return website;
    }
  }

  // Check common website keys
  for (const key of ["website", "website_link", "link"]) {
    const val = item[key];
    if (typeof val === "string" && val.startsWith("http")) {
      return val;
    }
  }

  return null;
};

/**
 * Format restaurant data from SerpApi response to match app expectations
 */
const formatRestaurantData = (item) => {
  const website = extractWebsiteFromItem(item);
  const gps = item.gps_coordinates || {};

  return {
    "Restaurant Name": item.title || "",
    "Address": item.address || "",
    "Latitude": gps.latitude || "",
    "Longitude": gps.longitude || "",
    "Category": item.type || "Restaurant",
    "Website": website || "",
    "Phone": item.phone || "",
    "Description": item.description || "",
    "Offer Title": item.offer_title || (item.description ? "Available Offer" : ""),
    "Offer Valid Until": "",
    "Student Discount": "",
    "Price": item.price || "",
    "Rating": item.rating || "",
    "Reviews": item.reviews || "",
    "Source": "custom"
  };
};

/**
 * Search restaurants using backend API (which calls SerpApi)
 */
export const searchRestaurantsWithWebsites = async (
  query = "restaurants",
  location = "Budapest, Hungary",
  targetCount = 10
) => {
  try {
    const params = new URLSearchParams({
      q: query,
      location: location,
      limit: targetCount
    });

    const response = await fetch(`/api/search-restaurants?${params}`);
    
    if (!response.ok) {
      console.warn("API search failed, will use fallback data");
      return [];
    }

    const data = await response.json();
    const items = data.restaurants || [];

    // Keep restaurants even if website is missing, because many local results
    // do not include official websites in this endpoint response.
    const formatted = items
      .map((item) => {
        const website = extractWebsiteFromItem(item);
        if (!website || isLikelyOfficial(website)) {
          return formatRestaurantData(item);
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, targetCount);

    console.log(`✅ Found ${formatted.length} restaurants with valid websites`);
    return formatted;
  } catch (error) {
    console.error("Error searching restaurants:", error);
    return [];
  }
};

/**
 * Enrich restaurant data by scanning websites for menus/offers/discounts
 */
export const enrichRestaurantData = async (restaurants) => {
  try {
    // Call backend to scan websites
    const response = await fetch("/api/scan-restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurants })
    });

    if (!response.ok) {
      console.warn("Website scanning failed, returning original data");
      return restaurants;
    }

    const enriched = await response.json();
    console.log(`✅ Enriched ${enriched.length} restaurants with website data`);
    return enriched;
  } catch (error) {
    console.error("Error enriching restaurant data:", error);
    return restaurants;
  }
};

/**
 * Main function to fetch and enrich restaurant data from notebook logic
 */
export const fetchRestaurantsFromHunter = async (
  query = "restaurants",
  location = "Budapest, Hungary",
  targetCount = 10,
  shouldEnrich = false
) => {
  console.log("🔍 Starting restaurant hunt...");

  try {
    // Step 1: Search for restaurants and their websites
    const restaurants = await searchRestaurantsWithWebsites(query, location, targetCount);

    if (restaurants.length === 0) {
      console.warn("No restaurants found");
      return [];
    }

    // Step 2: Optionally enrich with website scanning
    if (shouldEnrich) {
      const enriched = await enrichRestaurantData(restaurants);
      return enriched;
    }

    return restaurants;
  } catch (error) {
    console.error("Failed to fetch restaurants from hunter:", error);
    return [];
  }
};

export default fetchRestaurantsFromHunter;
