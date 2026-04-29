const { SEARCH_QUERIES, BUDAPEST_CENTER } = require("../config/searchQueries");

const WEBSITE_LOOKUP_CACHE = new Map();
const COORDINATE_LOOKUP_CACHE = new Map();

const NON_OFFICIAL_HOST_HINTS = [
  "google.com",
  "maps.google",
  "goo.gl",
  "tripadvisor.",
  "restaurantguru.",
  "welovebudapest.",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "wolt.com",
  "foodora.",
  "ubereats.",
  "yelp.",
  "foursquare.",
  "tasteatlas.",
  "wanderlog.",
  "wikipedia.org",
];

const normalizeName = (value = "") =>
  value.toString().trim().toLowerCase().replace(/\s+/g, " ");

const normalizeAddress = (value = "") =>
  value.toString().trim().toLowerCase().replace(/\s+/g, " ");

const toRestaurantIdentityKey = (item = {}) => {
  const name = normalizeName(item.title || item.name || item.displayName || "");
  const address = normalizeAddress(item.address || item.formattedAddress || "");
  return `${name}__${address}`;
};

const dedupeRestaurants = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = toRestaurantIdentityKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mapPlaceToRestaurant = (place) => {
  const location = place.location || {};
  return {
    title: place.displayName?.text || "",
    name: place.displayName?.text || "",
    snippet: place.editorialSummary?.text || "",
    address: place.formattedAddress || "",
    latitude: location.latitude || null,
    longitude: location.longitude || null,
    website: place.websiteUri || "",
    link: place.websiteUri || "",
    category:
      Array.isArray(place.types) && place.types.length > 0
        ? place.types[0]
        : "restaurant",
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || null,
    placeId: place.id || "",
  };
};

const mapPlaceResult = (place = {}) => ({
  title: place.displayName?.text || "",
  address: place.formattedAddress || "",
  type: Array.isArray(place.types) ? place.types[0] : "restaurant",
  rating: place.rating || null,
  reviews: place.userRatingCount || null,
  description: place.editorialSummary?.text || "",
  gps_coordinates: {
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
  },
  website: place.websiteUri || "",
  links: {
    website: place.websiteUri || "",
    directions: "",
  },
});

const mapSerpApiItem = (item = {}) => ({
  title: item.title || "",
  address: item.address || "",
  type: item.type || "restaurant",
  rating: item.rating || null,
  reviews: item.reviews || null,
  phone: item.phone || "",
  description: item.description || "",
  price: item.price || "",
  gps_coordinates: {
    latitude: item.gps_coordinates?.latitude ?? item.latitude ?? null,
    longitude: item.gps_coordinates?.longitude ?? item.longitude ?? null,
  },
  website:
    item.links?.website || item.website || item.website_link || item.link || "",
  links: {
    website:
      item.links?.website || item.website || item.website_link || item.link || "",
    directions: item.links?.directions || item.directions || "",
  },
});

const looksLikeHttpUrl = (value = "") => /^https?:\/\//i.test(value);

const isLikelyOfficialWebsiteHost = (url = "") => {
  if (!looksLikeHttpUrl(url)) return false;

  try {
    const host = new URL(url).hostname.toLowerCase();
    return !NON_OFFICIAL_HOST_HINTS.some((hint) => host.includes(hint));
  } catch {
    return false;
  }
};

const toRestaurantName = (restaurant = {}) =>
  (restaurant["Restaurant Name"] || restaurant.name || restaurant.title || "")
    .toString()
    .trim();

const toRestaurantAddress = (restaurant = {}) =>
  (restaurant.Address || restaurant.address || "").toString().trim();

const toRestaurantWebsite = (restaurant = {}) =>
  (
    restaurant.Website ||
    restaurant.website ||
    restaurant.website_link ||
    restaurant.link ||
    restaurant?.links?.website ||
    ""
  )
    .toString()
    .trim();

const pickBestPlaceMatch = ({ places = [], restaurantName = "" }) => {
  if (!Array.isArray(places) || places.length === 0) return null;

  const normalizedTarget = normalizeName(restaurantName);
  if (!normalizedTarget) return places[0];

  const exact = places.find((place) => {
    const candidate = normalizeName(place?.displayName?.text || "");
    return candidate === normalizedTarget;
  });
  if (exact) return exact;

  const partial = places.find((place) => {
    const candidate = normalizeName(place?.displayName?.text || "");
    return candidate.includes(normalizedTarget) || normalizedTarget.includes(candidate);
  });
  if (partial) return partial;

  return places[0];
};

const pickBestSerpWebsite = ({ items = [], restaurantName = "" }) => {
  if (!Array.isArray(items) || items.length === 0) return "";

  const normalizedTarget = normalizeName(restaurantName);
  const withWebsite = items.filter((item) =>
    isLikelyOfficialWebsiteHost(item?.website)
  );
  if (withWebsite.length === 0) return "";

  const exact = withWebsite.find((item) => {
    const candidate = normalizeName(item?.title || "");
    return normalizedTarget && candidate === normalizedTarget;
  });
  if (exact) return exact.website;

  const partial = withWebsite.find((item) => {
    const candidate = normalizeName(item?.title || "");
    return (
      normalizedTarget &&
      (candidate.includes(normalizedTarget) || normalizedTarget.includes(candidate))
    );
  });
  if (partial) return partial.website;

  return withWebsite[0].website;
};

const searchText = async ({ query, googleApiKey }) => {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.editorialSummary,places.websiteUri",
      },
      body: JSON.stringify({
        textQuery: query,
        pageSize: 20,
        locationBias: {
          circle: {
            center: BUDAPEST_CENTER,
            radius: 8000.0,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Places error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return Array.isArray(data.places) ? data.places : [];
};

const extractGpsCoordinates = (item = {}) => {
  const latitude =
    item.gps_coordinates?.latitude ?? item.location?.latitude ?? item.latitude ?? null;
  const longitude =
    item.gps_coordinates?.longitude ?? item.location?.longitude ?? item.longitude ?? null;

  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { latitude: lat, longitude: lng };
};

const fetchSerpApiMapCoordinates = async ({ query, serpApiKey }) => {
  const response = await fetch(
    `https://serpapi.com/search?engine=google_maps&q=${encodeURIComponent(query)}&api_key=${serpApiKey}`
  );

  if (!response.ok) {
    throw new Error(`SerpApi maps error: ${response.status}`);
  }

  const data = await response.json();
  let candidates = [];

  if (Array.isArray(data.local_results)) {
    candidates = data.local_results;
  } else if (Array.isArray(data.search_results)) {
    candidates = data.search_results;
  } else if (data.place_results) {
    candidates = Array.isArray(data.place_results)
      ? data.place_results
      : [data.place_results];
  }

  for (const item of candidates) {
    const coords = extractGpsCoordinates(item);
    if (coords) return coords;
  }

  return null;
};

const resolveRestaurantCoordinates = async ({ restaurant, serpApiKey }) => {
  if (!serpApiKey) return restaurant;

  const existingCoords = extractGpsCoordinates(restaurant);
  if (existingCoords) return restaurant;

  const name = toRestaurantName(restaurant);
  const address = toRestaurantAddress(restaurant);
  if (!name && !address) return restaurant;

  const cacheKey = `${normalizeName(name)}__${normalizeAddress(address)}`;
  if (COORDINATE_LOOKUP_CACHE.has(cacheKey)) {
    const cached = COORDINATE_LOOKUP_CACHE.get(cacheKey);
    return {
      ...restaurant,
      gps_coordinates: cached,
      latitude: cached.latitude,
      longitude: cached.longitude,
    };
  }

  try {
    const queryCandidates = [];

    if (name && address) {
      queryCandidates.push(`${name} ${address} Budapest`);
      queryCandidates.push(`${address} Budapest`);
    }

    if (name) {
      queryCandidates.push(`${name} Budapest`);
    }

    if (address) {
      queryCandidates.push(`${address} Budapest`);
    }

    console.log(`resolveRestaurantCoordinates for ${name} / ${address}:`, queryCandidates);

    let coords = null;
    for (const queryText of queryCandidates) {
      console.log(`  trying coordinate lookup: ${queryText}`);
      coords = await fetchSerpApiMapCoordinates({ query: queryText, serpApiKey });
      console.log(`  result coords:`, coords);
      if (coords) break;
    }

    if (!coords) {
      console.log(`  no coordinates found for ${name}`);
      return restaurant;
    }

    COORDINATE_LOOKUP_CACHE.set(cacheKey, coords);

    return {
      ...restaurant,
      gps_coordinates: coords,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  } catch (error) {
    console.warn(`Coordinate lookup failed for ${name}:`, error.message);
    return restaurant;
  }
};

const resolveRestaurantCoordinatesForList = async ({ restaurants, serpApiKey }) => {
  if (!serpApiKey || !Array.isArray(restaurants) || restaurants.length === 0) {
    return Array.isArray(restaurants) ? restaurants : [];
  }

  return Promise.all(
    restaurants.map((restaurant) =>
      resolveRestaurantCoordinates({ restaurant, serpApiKey })
    )
  );
};

const fetchSerpApiQuery = async ({ query, location, count, serpApiKey }) => {
  const normalizedQuery = (query || "").toString().trim();
  const normalizedLocation = (location || "").toString().trim();
  const queryWithLocation =
    normalizedLocation &&
    normalizedQuery &&
    !normalizedQuery.toLowerCase().includes(normalizedLocation.toLowerCase())
      ? `${normalizedQuery} ${normalizedLocation}`
      : normalizedQuery || normalizedLocation;

  const requestQuery = queryWithLocation || normalizedQuery;

  const response = await fetch(
    `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(requestQuery)}&api_key=${serpApiKey}&num=${count}`
  );

  if (!response.ok) {
    throw new Error(`SerpApi error: ${response.status}`);
  }

  const data = await response.json();
  const items =
    data.place_results ||
    data.local_results?.places ||
    data.local_results ||
    data.search_results ||
    [];

  return Array.isArray(items) ? items.map(mapSerpApiItem) : [];
};

const fetchSerpApiOrganicWebsite = async ({ query, serpApiKey }) => {
  const response = await fetch(
    `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpApiKey}&num=5`
  );

  if (!response.ok) return "";

  const data = await response.json();
  const candidates = [];

  if (looksLikeHttpUrl(data?.knowledge_graph?.website)) {
    candidates.push(data.knowledge_graph.website);
  }

  if (Array.isArray(data?.organic_results)) {
    for (const result of data.organic_results) {
      if (looksLikeHttpUrl(result?.link)) {
        candidates.push(result.link);
      }
    }
  }

  const official = candidates.find((candidate) =>
    isLikelyOfficialWebsiteHost(candidate)
  );

  return official || "";
};

const resolveOfficialWebsite = async ({
  restaurant,
  googleApiKey,
  serpApiKey,
}) => {
  const name = toRestaurantName(restaurant);
  const address = toRestaurantAddress(restaurant);
  const existingWebsite = toRestaurantWebsite(restaurant);

  if (!name) return "";
  if (looksLikeHttpUrl(existingWebsite)) return existingWebsite;

  const cacheKey = `${normalizeName(name)}__${normalizeAddress(address)}`;
  if (WEBSITE_LOOKUP_CACHE.has(cacheKey)) {
    return WEBSITE_LOOKUP_CACHE.get(cacheKey);
  }

  const query = [name, address, "Budapest"].filter(Boolean).join(" ");

  try {
    let website = "";

    if (googleApiKey) {
      const places = await searchText({ query, googleApiKey });
      const best = pickBestPlaceMatch({ places, restaurantName: name });
      website = best?.websiteUri || "";
    }

    if (!website && serpApiKey) {
      const serpItems = await fetchSerpApiQuery({
        query,
        location: "Budapest, Hungary",
        count: 5,
        serpApiKey,
      });

      website = pickBestSerpWebsite({ items: serpItems, restaurantName: name });
    }

    if (!website && serpApiKey) {
      website = await fetchSerpApiOrganicWebsite({
        query: `${name} Budapest official website`,
        serpApiKey,
      });
    }

    WEBSITE_LOOKUP_CACHE.set(cacheKey, website);
    return website;
  } catch (error) {
    console.warn(`Website lookup failed for ${name}:`, error.message);
    WEBSITE_LOOKUP_CACHE.set(cacheKey, "");
    return "";
  }
};

const getRestaurants = async ({ googleApiKey, serpApiKey }) => {
  console.log("getRestaurants keys", {
    googleApiKey: !!googleApiKey,
    serpApiKey: !!serpApiKey,
  });

  if (!googleApiKey && !serpApiKey) {
    throw new Error("Missing API keys: set SERPAPI_API_KEY or GOOGLE_PLACES_API_KEY");
  }

  if (!googleApiKey && serpApiKey) {
    const { restaurants } = await searchRestaurants({
      query: "",
      location: "Budapest, Hungary",
      limit: 80,
      serpApiKey,
      googleApiKey: undefined,
    });

    return {
      count: restaurants.length,
      data: restaurants,
    };
  }

  try {
    const results = await Promise.all(
      SEARCH_QUERIES.map((query) => searchText({ query, googleApiKey }))
    );

    const flattened = results.flat().map(mapPlaceToRestaurant);
    const unique = dedupeRestaurants(flattened);

    return {
      count: unique.length,
      data: unique,
    };
  } catch (error) {
    if (
      serpApiKey &&
      error.message.includes("API key not valid")
    ) {
      const { restaurants } = await searchRestaurants({
        query: "",
        location: "Budapest, Hungary",
        limit: 80,
        serpApiKey,
        googleApiKey: undefined,
      });

      return {
        count: restaurants.length,
        data: restaurants,
      };
    }

    throw error;
  }
};

const searchRestaurants = async ({
  query,
  location,
  limit,
  serpApiKey,
  googleApiKey,
}) => {
  const cleanedQuery = (query || "").toString().trim();
  const loc = location || "Budapest, Hungary";
  const totalLimit = Number.parseInt(limit, 10) || 52;

  const queriesToUse = cleanedQuery ? [cleanedQuery] : SEARCH_QUERIES;
  const countPerQuery = cleanedQuery
    ? totalLimit
    : Math.max(3, Math.ceil(totalLimit / queriesToUse.length));

  const runGoogleSearch = async () => {
    if (!googleApiKey) {
      throw new Error("Missing API keys: set SERPAPI_API_KEY or GOOGLE_PLACES_API_KEY");
    }

    const results = await Promise.all(
      queriesToUse.map((queryText) => searchText({ query: queryText, googleApiKey }))
    );

    const flattened = results.flat().map(mapPlaceResult);
    return dedupeRestaurants(flattened).slice(0, totalLimit);
  };

  if (serpApiKey) {
    const queryResults = await Promise.allSettled(
      queriesToUse.map((queryText) =>
        fetchSerpApiQuery({
          query: queryText,
          location: loc,
          count: countPerQuery,
          serpApiKey,
        })
      )
    );

    const serpRestaurants = dedupeRestaurants(
      queryResults
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value || [])
    );

    const failedCount = queryResults.filter(
      (result) => result.status === "rejected"
    ).length;

    if (failedCount > 0) {
      console.warn(
        `SerpApi partial failure: ${failedCount}/${queriesToUse.length} queries failed. Falling back to Google Places when available.`
      );
    }

    if (serpRestaurants.length >= totalLimit || !googleApiKey) {
      const resolved = await resolveRestaurantCoordinatesForList({
        restaurants: serpRestaurants.slice(0, totalLimit),
        serpApiKey,
      });

      return {
        restaurants: resolved,
        queriesUsed: queriesToUse,
      };
    }

    try {
      const googleRestaurants = await runGoogleSearch();
      const merged = dedupeRestaurants([
        ...serpRestaurants,
        ...googleRestaurants,
      ]).slice(0, totalLimit);

      const resolved = await resolveRestaurantCoordinatesForList({
        restaurants: merged,
        serpApiKey,
      });

      return { restaurants: resolved, queriesUsed: queriesToUse };
    } catch (googleError) {
      console.warn("Google Places fallback failed:", googleError.message);
      const resolved = await resolveRestaurantCoordinatesForList({
        restaurants: serpRestaurants.slice(0, totalLimit),
        serpApiKey,
      });

      return {
        restaurants: resolved,
        queriesUsed: queriesToUse,
      };
    }
  }

  const unique = await runGoogleSearch();

  return { restaurants: unique, queriesUsed: queriesToUse };
};

const resolveWebsites = async ({ restaurants, googleApiKey, serpApiKey }) => {
  const resolved = await Promise.all(
    restaurants.map(async (restaurant) => {
      const {
        website: _websiteLower,
        link: _linkLower,
        Website: existingWebsite,
        links: existingLinks,
        ...rest
      } = restaurant || {};

      const website = await resolveOfficialWebsite({
        restaurant,
        googleApiKey,
        serpApiKey,
      });

      const finalWebsite = website || existingWebsite || "";

      return {
        ...rest,
        Website: finalWebsite,
        links: {
          ...(existingLinks || {}),
          website: finalWebsite,
        },
      };
    })
  );

  return { restaurants: resolved };
};

const scanRestaurants = ({ restaurants }) => {
  const enriched = restaurants.map((restaurant) => ({
    ...restaurant,
    website_scanned: true,
    menu_signal: false,
    offer_signal: false,
    discount_signal: false,
    matched_keywords: [],
  }));

  return enriched;
};

module.exports = {
  getRestaurants,
  searchRestaurants,
  resolveWebsites,
  scanRestaurants,
};
