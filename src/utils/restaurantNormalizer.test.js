import {
  normalizeRestaurant,
  normalizeRestaurantList,
  hasNormalizedCoords,
} from "./restaurantNormalizer";

describe("restaurantNormalizer", () => {
  describe("normalizeRestaurant", () => {
    it("should normalize standard field names", () => {
      const input = {
        name: "Szechuan House",
        address: "123 Main Street",
        lat: "47.4979",
        lng: "19.0402",
        website: "https://example.com",
      };

      const result = normalizeRestaurant(input);

      expect(result.name).toBe("Szechuan House");
      expect(result.address).toBe("123 Main Street");
      expect(result.lat).toBe(47.4979);
      expect(result.lng).toBe(19.0402);
      expect(result.website).toBe("https://example.com");
    });

    it("should normalize alternative field names (alternative naming conventions)", () => {
      const input = {
        "Restaurant Name": "Pizza Place",
        "Address": "456 Oak Ave",
        "latitude": "47.5000",
        "longitude": "19.0500",
      };

      const result = normalizeRestaurant(input);

      expect(result.name).toBe("Pizza Place");
      expect(result.address).toBe("456 Oak Ave");
      expect(result.lat).toBe(47.5);
      expect(result.lng).toBe(19.05);
    });

    it("should normalize nested field paths", () => {
      const input = {
        name: "Google Place",
        "displayName.text": "Google Place Name",
        address: "Street 1",
        "gps_coordinates.latitude": "47.4979",
        "gps_coordinates.longitude": "19.0402",
        "location.latitude": "47.1234",
        "location.longitude": "19.5678",
        "links.website": "https://google.com",
      };

      const result = normalizeRestaurant(input);

      expect(result.lat).toBeNull();
expect(result.lng).toBeNull();
    });

    it("should normalize source values: hunter -> hunting", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        source: "hunter",
      };

      const result = normalizeRestaurant(input);
      expect(result.source).toBe("hunting");
    });

    it("should normalize source values: api -> hunting", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        source: "api",
      };

      const result = normalizeRestaurant(input);
      expect(result.source).toBe("hunting");
    });

    it("should normalize source values: serpapi -> hunting", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        source: "serpapi",
      };

      const result = normalizeRestaurant(input);
      expect(result.source).toBe("hunting");
    });

    it("should preserve admin source", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        source: "admin",
      };

      const result = normalizeRestaurant(input);
      expect(result.source).toBe("admin");
    });

    it("should preserve sheet source", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        source: "sheet",
      };

      const result = normalizeRestaurant(input);
      expect(result.source).toBe("sheet");
    });

    it("should default to sheet source when not provided", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
      };

      const result = normalizeRestaurant(input);
      expect(result.source).toBe("sheet");
    });

    it("should use custom defaultSource option", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
      };

      const result = normalizeRestaurant(input, { defaultSource: "hunting" });
      expect(result.source).toBe("hunting");
    });

    it("should handle missing coordinates gracefully", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
      };

      const result = normalizeRestaurant(input);
      expect(result.lat).toBeNull();
      expect(result.lng).toBeNull();
    });

    it("should return null for invalid coordinate strings", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        lat: "not a number",
        lng: "invalid",
      };

      const result = normalizeRestaurant(input);
      expect(result.lat).toBeNull();
      expect(result.lng).toBeNull();
    });

    it("should normalize coordinate strings with commas as decimal separator", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        lat: "47,4979",
        lng: "19,0402",
      };

      const result = normalizeRestaurant(input);
      expect(result.lat).toBe(47.4979);
      expect(result.lng).toBe(19.0402);
    });

    it("should strip non-numeric characters from coordinates", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        lat: "47.4979°N",
        lng: "19.0402°E",
      };

      const result = normalizeRestaurant(input);
      expect(result.lat).toBe(47.4979);
      expect(result.lng).toBe(19.0402);
    });

    it("should include all fields in normalized output", () => {
      const input = {
        name: "Test Restaurant",
        address: "Test Address",
        lat: "47.4979",
        lng: "19.0402",
        website: "https://test.com",
        category: "Thai",
        description: "Good food",
        phone: "123-456-7890",
        rating: "4.5",
      };

      const result = normalizeRestaurant(input);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("address");
      expect(result).toHaveProperty("lat");
      expect(result).toHaveProperty("lng");
      expect(result).toHaveProperty("website");
      expect(result).toHaveProperty("source");
      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("phone");
      expect(result).toHaveProperty("rating");
    });

    it("should generate id from name and address", () => {
      const input = {
        name: "Test Restaurant",
        address: "123 Main St",
      };

      const result = normalizeRestaurant(input);
      expect(result.id).toContain("test restaurant");
      expect(result.id).toContain("123 main st");
      expect(result.id).toContain("addr");
    });

    it("should generate id from name and coordinates when address missing", () => {
      const input = {
        name: "Test Restaurant",
        lat: "47.4979",
        lng: "19.0402",
      };

      const result = normalizeRestaurant(input);
      expect(result.id).toContain("test restaurant");
      expect(result.id).toContain("geo");
      expect(result.id).toContain("47.49790");
      expect(result.id).toContain("19.04020");
    });

    it("should handle empty input object", () => {
      const result = normalizeRestaurant({});

      expect(result.name).toBe("");
      expect(result.address).toBe("");
      expect(result.lat).toBeNull();
      expect(result.lng).toBeNull();
      expect(result.source).toBe("sheet");
    });

    it("should handle null input", () => {
      const result = normalizeRestaurant(null);

      expect(result.name).toBe("");
      expect(result.address).toBe("");
    });

    it("should trim whitespace from string fields", () => {
      const input = {
        name: "  Test Restaurant  ",
        address: "  123 Main St  ",
      };

      const result = normalizeRestaurant(input);

      expect(result.name).toBe("Test Restaurant");
      expect(result.address).toBe("123 Main St");
    });

    it("should handle extra fields like offerTitle and studentDiscount", () => {
      const input = {
        name: "Test",
        address: "Test Ave",
        offerTitle: "50% off",
        offerValidUntil: "2026-12-31",
        studentDiscount: "Yes",
        price: "$$",
      };

      const result = normalizeRestaurant(input);

      expect(result.offerTitle).toBe("50% off");
      expect(result.offerValidUntil).toBe("2026-12-31");
      expect(result.studentDiscount).toBe("Yes");
      expect(result.price).toBe("$$");
    });
  });

  describe("normalizeRestaurantList", () => {
    it("should normalize array of restaurants", () => {
      const input = [
        {
          name: "Restaurant 1",
          address: "Address 1",
          source: "hunter",
        },
        {
          name: "Restaurant 2",
          address: "Address 2",
          source: "api",
        },
      ];

      const result = normalizeRestaurantList(input);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Restaurant 1");
      expect(result[0].source).toBe("hunting");
      expect(result[1].name).toBe("Restaurant 2");
      expect(result[1].source).toBe("hunting");
    });

    it("should handle empty array", () => {
      const result = normalizeRestaurantList([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should handle null input", () => {
      const result = normalizeRestaurantList(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should handle non-array input", () => {
      const result = normalizeRestaurantList("not an array");
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should use defaultSource option for all items", () => {
      const input = [
        { name: "Test 1", address: "Addr 1" },
        { name: "Test 2", address: "Addr 2" },
      ];

      const result = normalizeRestaurantList(input, { defaultSource: "admin" });

      expect(result[0].source).toBe("admin");
      expect(result[1].source).toBe("admin");
    });
  });

  describe("hasNormalizedCoords", () => {
    it("should return true for valid coordinates", () => {
      const restaurant = {
        lat: 47.4979,
        lng: 19.0402,
      };

      expect(hasNormalizedCoords(restaurant)).toBe(true);
    });

    it("should return false for missing lat", () => {
      const restaurant = {
        lng: 19.0402,
      };

      expect(hasNormalizedCoords(restaurant)).toBe(false);
    });

    it("should return false for missing lng", () => {
      const restaurant = {
        lat: 47.4979,
      };

      expect(hasNormalizedCoords(restaurant)).toBe(false);
    });

    it("should return false for NaN lat", () => {
      const restaurant = {
        lat: NaN,
        lng: 19.0402,
      };

      expect(hasNormalizedCoords(restaurant)).toBe(false);
    });

    it("should return false for NaN lng", () => {
      const restaurant = {
        lat: 47.4979,
        lng: NaN,
      };

      expect(hasNormalizedCoords(restaurant)).toBe(false);
    });

    it("should return false for string coordinates", () => {
      const restaurant = {
        lat: "47.4979",
        lng: "19.0402",
      };

      expect(hasNormalizedCoords(restaurant)).toBe(false);
    });

    it("should return false for null coordinates", () => {
      const restaurant = {
        lat: null,
        lng: null,
      };

      expect(hasNormalizedCoords(restaurant)).toBe(false);
    });

    it("should return false for empty restaurant", () => {
      expect(hasNormalizedCoords({})).toBe(false);
    });

    it("should return false for null restaurant", () => {
      expect(hasNormalizedCoords(null)).toBe(false);
    });
  });
});
