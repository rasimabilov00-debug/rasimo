import {
  normalizeSourceLabel,
  getRestaurantSourceLabel,
  getSourceDisplayLabel,
} from "./sourceLabel";

describe("sourceLabel", () => {
  describe("normalizeSourceLabel", () => {
    it("should normalize 'hunter' to 'hunting'", () => {
      expect(normalizeSourceLabel("hunter")).toBe("hunting");
    });

    it("should normalize 'hunting' to 'hunting'", () => {
      expect(normalizeSourceLabel("hunting")).toBe("hunting");
    });

    it("should normalize 'api' to 'hunting'", () => {
      expect(normalizeSourceLabel("api")).toBe("hunting");
    });

    it("should normalize 'serpapi' to 'hunting'", () => {
      expect(normalizeSourceLabel("serpapi")).toBe("hunting");
    });

    it("should normalize sheet-like values to 'sheet'", () => {
      expect(normalizeSourceLabel("sheet")).toBe("sheet");
      expect(normalizeSourceLabel("Sheet")).toBe("sheet");
      expect(normalizeSourceLabel("Google Sheet")).toBe("sheet");
      expect(normalizeSourceLabel("google sheets")).toBe("sheet");
    });

    it("should normalize admin-like values to 'admin'", () => {
      expect(normalizeSourceLabel("admin")).toBe("admin");
      expect(normalizeSourceLabel("Admin")).toBe("admin");
      expect(normalizeSourceLabel("admin panel")).toBe("admin");
    });

    it("should normalize case-insensitively", () => {
      expect(normalizeSourceLabel("HUNTER")).toBe("hunting");
      expect(normalizeSourceLabel("ADMIN")).toBe("admin");
      expect(normalizeSourceLabel("SHEET")).toBe("sheet");
      expect(normalizeSourceLabel("HUNTING")).toBe("hunting");
    });

    it("should handle whitespace", () => {
      expect(normalizeSourceLabel("  hunter  ")).toBe("hunting");
      expect(normalizeSourceLabel("  admin  ")).toBe("admin");
      expect(normalizeSourceLabel("  sheet  ")).toBe("sheet");
    });

    it("should default to 'sheet' for empty string", () => {
      expect(normalizeSourceLabel("")).toBe("sheet");
    });

    it("should default to 'sheet' for null", () => {
      expect(normalizeSourceLabel(null)).toBe("sheet");
    });

    it("should default to 'sheet' for undefined", () => {
      expect(normalizeSourceLabel(undefined)).toBe("sheet");
    });

    it("should return normalized value for unrecognized source", () => {
      const result = normalizeSourceLabel("unknown");
      expect(result).toBe("unknown");
    });

    it("should preserve normalized text for custom sources", () => {
      expect(normalizeSourceLabel("Custom Source")).toBe("custom source");
    });

    it("should normalize multiple hunting-related aliases", () => {
      const hunters = ["hunter", "hunting", "api", "serpapi"];
      hunters.forEach((source) => {
        expect(normalizeSourceLabel(source)).toBe("hunting");
      });
    });
  });

  describe("getRestaurantSourceLabel", () => {
    it("should get source label from restaurant object", () => {
      const restaurant = { source: "hunter" };
      expect(getRestaurantSourceLabel(restaurant)).toBe("hunting");
    });

    it("should handle missing source in restaurant", () => {
      const restaurant = {};
      expect(getRestaurantSourceLabel(restaurant)).toBe("sheet");
    });

    it("should handle null restaurant", () => {
      expect(getRestaurantSourceLabel(null)).toBe("sheet");
    });

    it("should normalize source from restaurant", () => {
      const restaurant = { source: "ADMIN" };
      expect(getRestaurantSourceLabel(restaurant)).toBe("admin");
    });
  });

  describe("getSourceDisplayLabel", () => {
    it("should return 'Admin' for admin source", () => {
      expect(getSourceDisplayLabel("admin")).toBe("Admin");
    });

    it("should return 'Hunting' for hunting source", () => {
      expect(getSourceDisplayLabel("hunting")).toBe("Hunting");
    });

    it("should return 'Hunting' for hunter source (normalized)", () => {
      expect(getSourceDisplayLabel("hunter")).toBe("Hunting");
    });

    it("should return 'Hunting' for api source (normalized)", () => {
      expect(getSourceDisplayLabel("api")).toBe("Hunting");
    });

    it("should return 'Hunting' for serpapi source (normalized)", () => {
      expect(getSourceDisplayLabel("serpapi")).toBe("Hunting");
    });

    it("should return 'Sheet' for sheet source", () => {
      expect(getSourceDisplayLabel("sheet")).toBe("Sheet");
    });

    it("should return 'Sheet' for empty source", () => {
      expect(getSourceDisplayLabel("")).toBe("Sheet");
    });

    it("should return 'Sheet' for unknown source", () => {
      expect(getSourceDisplayLabel("unknown")).toBe("Sheet");
    });

    it("should return 'Sheet' for null source", () => {
      expect(getSourceDisplayLabel(null)).toBe("Sheet");
    });

    it("should be case-insensitive", () => {
      expect(getSourceDisplayLabel("ADMIN")).toBe("Admin");
      expect(getSourceDisplayLabel("HUNTING")).toBe("Hunting");
      expect(getSourceDisplayLabel("SHEET")).toBe("Sheet");
    });
  });
});
