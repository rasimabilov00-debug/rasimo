const normalizeSourceText = (value) =>
  (value || "").toString().trim().toLowerCase();

export const normalizeSourceLabel = (value) => {
  const normalized = normalizeSourceText(value);

  if (!normalized) return "sheet";

  if (
    normalized === "hunter" ||
    normalized === "hunting" ||
    normalized === "api" ||
    normalized === "serpapi"
  ) {
    return "hunting";
  }

  if (normalized.includes("sheet")) return "sheet";
  if (normalized.includes("admin")) return "admin";

  return normalized;
};

export const getRestaurantSourceLabel = (restaurant = {}) =>
  normalizeSourceLabel(restaurant?.source);

export const getSourceDisplayLabel = (source = "") => {
  const s = normalizeSourceLabel(source);

  if (s === "admin") return "Admin";
  if (s === "hunting") return "Hunting";
  return "Sheet";
};