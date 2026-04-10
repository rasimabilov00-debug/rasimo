/**
 * Restaurant Hunter - Integrates SerpApi notebook logic into React
 * Fetches restaurants with websites and enriches data from the API
 */

import { normalizeSourceLabel } from "./sourceLabel";
import { normalizeRestaurant } from "./restaurantNormalizer";

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

const normalizeText = (value) =>
  (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

const toRestaurantKey = (restaurant = {}) => {
  const name = normalizeText(restaurant.name);
  const address = normalizeText(restaurant.address);
  return `${name}__${address}`;
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
  const website = extractWebsiteFromItem(item) || "";

  return normalizeRestaurant(
    {
      id: item.id || item.place_id || "",
      name: item.title || "",
      address: item.address || "",
      lat: item.gps_coordinates?.latitude ?? item.latitude ?? null,
      lng: item.gps_coordinates?.longitude ?? item.longitude ?? null,
      website,
      source: normalizeSourceLabel("hunter"),
      category: item.type || "Restaurant",
      description: item.description || "",
      offerTitle: item.offer_title || (item.description ? "Available Offer" : ""),
      offerValidUntil: "",
      studentDiscount: "",
      price: item.price || "",
      rating: item.rating || "",
      reviews: item.reviews || "",
      phone: item.phone || "",
    },
    { defaultSource: "hunter" }
  );
};

/**
 * Search restaurants using backend API (which calls SerpApi)
 */
export const searchRestaurantsWithWebsites = async (
  query = "",
  location = "Budapest, Hungary",
  targetCount = 10
) => {
  try {
    const params = new URLSearchParams({
      location: location,
      limit: targetCount
    });

    if ((query || "").toString().trim()) {
      params.set("q", query);
    }

    const response = await fetch(`/api/search-restaurants?${params}`);
    
    if (!response.ok) {
      console.warn("API search failed, will use fallback data");
      return [];
    }

    // Backend provides search results (SerpApi or Google Places fallback).
    const data = await response.json();
    const items = data.restaurants || [];

    // Keep restaurants even if website is missing, because many local results
    // do not include official websites in this endpoint response.
    const formatted = items
      .map((item) => {
        const website = extractWebsiteFromItem(item);
        const formattedItem = formatRestaurantData(item);

        // Keep only likely official links; marketplace/social links are cleared.
        if (website && !isLikelyOfficial(website)) {
          formattedItem.website = "";
        }

        return formattedItem;
      })
      .filter(Boolean)

    const seen = new Set();
    const unique = formatted.filter((restaurant) => {
      const key = toRestaurantKey(restaurant);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`✅ Found ${unique.length} restaurants with valid websites`);
    return unique.slice(0, targetCount);
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
 * Resolve official website URLs for a list of restaurants through backend lookup.
 */
export const resolveRestaurantWebsites = async (restaurants = []) => {
  try {
    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      return restaurants;
    }

    // Ask backend to find a better official website when one is missing.
    const response = await fetch("/api/resolve-websites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurants }),
    });

    if (!response.ok) {
      console.warn("Website resolution failed, returning original list");
      return restaurants;
    }

    const data = await response.json();
    return Array.isArray(data.restaurants)
      ? data.restaurants.map((item) => normalizeRestaurant(item, { defaultSource: item.source || item.Source || "sheet" }))
      : restaurants;
  } catch (error) {
    console.error("Error resolving restaurant websites:", error);
    return restaurants;
  }
};

/**
 * Main function to fetch and enrich restaurant data from notebook logic
 */
export const fetchRestaurantsFromHunter = async (
  query = "",
  location = "Budapest, Hungary",
  targetCount = 20,
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
