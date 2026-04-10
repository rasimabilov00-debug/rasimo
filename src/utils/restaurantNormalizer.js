import { normalizeSourceLabel } from "./sourceLabel";

const toText = (value) => (value ?? "").toString().trim();

const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
};

const firstValue = (obj, aliases = []) => {
  for (const alias of aliases) {
    const value = alias.includes(".") ? getByPath(obj, alias) : obj?.[alias];
    const text = toText(value);
    if (text) return text;
  }
  return "";
};

const toCoordinate = (value) => {
  const raw = toText(value);
  if (!raw) return null;

  const canonical = raw.replace(/,/g, ".").replace(/[^0-9+\-.]/g, "");
  const parsed = Number.parseFloat(canonical);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const toId = ({ name, address, lat, lng, source }) => {
  const n = toText(name).toLowerCase();
  const a = toText(address).toLowerCase();

  if (n && a) return `${n}__addr__${a}`;
  if (n && lat !== null && lng !== null) return `${n}__geo__${lat.toFixed(5)}__${lng.toFixed(5)}`;
  if (n) return `${n}__name__${source}`;

  return `${source}__unknown`;
};

export const normalizeRestaurant = (input = {}, options = {}) => {
  const defaultSource = options.defaultSource || "sheet";

  const name = firstValue(input, ["name", "Restaurant Name", "title", "displayName.text"]);
  const address = firstValue(input, ["address", "Address", "formattedAddress"]);
  const lat = toCoordinate(firstValue(input, ["lat", "latitude", "Latitude", "gps_coordinates.latitude", "location.latitude"]));
  const lng = toCoordinate(firstValue(input, ["lng", "lon", "longitude", "Longitude", "gps_coordinates.longitude", "location.longitude"]));
  const website = firstValue(input, ["website", "Website", "website_link", "link", "links.website", "websiteUri"]);
  const source = normalizeSourceLabel(firstValue(input, ["source", "Source"]) || defaultSource);
  const category = firstValue(input, ["category", "Category", "type", "Type"]) || "Restaurant";
  const description = firstValue(input, ["description", "Description", "snippet", "editorialSummary.text"]);

  const normalized = {
    id: toId({ name, address, lat, lng, source }),
    name,
    address,
    lat,
    lng,
    website,
    source,
    category,
    description,
    offerTitle: firstValue(input, ["offerTitle", "Offer Title", "offer_title"]),
    offerValidUntil: firstValue(input, ["offerValidUntil", "Offer Valid Until"]),
    studentDiscount: firstValue(input, ["studentDiscount", "Student Discount"]),
    price: firstValue(input, ["price", "Price"]),
    rating: firstValue(input, ["rating", "Rating"]),
    reviews: firstValue(input, ["reviews", "Reviews"]),
    phone: firstValue(input, ["phone", "Phone"]),
  };

  return normalized;
};

export const hasNormalizedCoords = (restaurant = {}) =>
  typeof restaurant?.lat === "number" &&
  !Number.isNaN(restaurant.lat) &&
  typeof restaurant?.lng === "number" &&
  !Number.isNaN(restaurant.lng);

export const normalizeRestaurantList = (items = [], options = {}) =>
  (Array.isArray(items) ? items : []).map((item) => normalizeRestaurant(item, options));
