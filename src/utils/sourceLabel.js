const normalizeSourceText = (value) => (value || "").toString().trim().toLowerCase();

export const normalizeSourceLabel = (value) => {
  const normalized = normalizeSourceText(value);

  if (!normalized) return "sheet";
  if (normalized === "custom" || normalized === "hunter" || normalized === "serpapi") {
    return "hunter";
  }
  if (normalized.includes("pipeline")) return "pipeline";
  if (normalized.includes("sheet") || normalized.includes("form")) return "sheet";

  return normalized;
};

export const getRestaurantSourceLabel = (restaurant = {}) =>
  normalizeSourceLabel(restaurant.Source || restaurant.source);

export const getSourceDisplayLabel = (sourceLabel = "") => {
  const normalized = normalizeSourceLabel(sourceLabel);
  if (normalized === "pipeline") return "Pipeline";
  if (normalized === "hunter") return "Hunter";
  return "Sheet";
};
