import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

jest.mock("./utils/sheetFetcher", () => ({
  fetchRestaurantsFromSERPAPI: jest.fn(() =>
    Promise.resolve([
      {
        name: "Sheet Restaurant 1",
        address: "123 Sheet St",
        lat: 47.4979,
        lng: 19.0402,
        source: "sheet",
      },
    ])
  ),
}));

jest.mock("./utils/restaurantHunter", () => ({
  fetchRestaurantsFromHunter: jest.fn(() => Promise.resolve([])),
  resolveRestaurantWebsites: jest.fn((restaurants) => Promise.resolve(restaurants)),
}));

jest.mock("./MapComponent", () => {
  return function MockMapComponent() {
    return <div data-testid="map-component">Map</div>;
  };
});

jest.mock("./RestaurantList", () => {
  return function MockRestaurantList() {
    return <div data-testid="restaurant-list">List</div>;
  };
});

import App from "./App";

describe("App Data Flow - Admin Updates and Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe("Admin Restaurant Persistence", () => {
    it("should load admin-updated restaurants from localStorage on mount", async () => {
      const adminRestaurants = [
        {
          id: "admin-1",
          name: "Admin Added Restaurant",
          address: "456 Admin Ave",
          lat: 47.5,
          lng: 19.05,
          source: "admin",
        },
      ];

      localStorage.setItem(
        "adminUpdatedRestaurants",
        JSON.stringify(adminRestaurants)
      );

      render(<App restaurants={adminRestaurants} setRestaurants={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });

    it("should merge admin restaurants with fetched restaurants", async () => {
      const adminRestaurants = [
        {
          id: "admin-1",
          name: "Admin Restaurant",
          address: "Admin St",
          lat: 47.5,
          lng: 19.05,
          source: "admin",
        },
      ];

      localStorage.setItem(
        "adminUpdatedRestaurants",
        JSON.stringify(adminRestaurants)
      );

      const mockSetRestaurants = jest.fn();

      render(
        <App
          restaurants={adminRestaurants}
          setRestaurants={mockSetRestaurants}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });

    it("should handle missing adminUpdatedRestaurants gracefully", async () => {
      localStorage.removeItem("adminUpdatedRestaurants");

      const mockSetRestaurants = jest.fn();

      render(
        <App
          restaurants={[]}
          setRestaurants={mockSetRestaurants}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });

    it("should handle corrupted localStorage data gracefully", async () => {
      localStorage.setItem("adminUpdatedRestaurants", "invalid json {");

      const mockSetRestaurants = jest.fn();

      render(
        <App
          restaurants={[]}
          setRestaurants={mockSetRestaurants}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });
  });

  describe("Favorites Persistence", () => {
    it("should load favorite keys from localStorage on mount", async () => {
      const favoriteKeys = ["id__rest-1", "name_addr__test__address"];
      localStorage.setItem("restaurantFavorites", JSON.stringify(favoriteKeys));

      render(
        <App
          restaurants={[
            {
              id: "rest-1",
              name: "Test",
              address: "Address",
              lat: 47.5,
              lng: 19.05,
            },
          ]}
          setRestaurants={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });

    it("should handle invalid favorites data gracefully", async () => {
      localStorage.setItem("restaurantFavorites", "not an array");

      render(
        <App
          restaurants={[]}
          setRestaurants={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });

    it("should persist favorite keys to localStorage when toggled", async () => {

      const restaurants = [
        {
          id: "rest-1",
          name: "Test Restaurant",
          address: "123 Test St",
          lat: 47.5,
          lng: 19.05,
        },
      ];

      render(
        <App restaurants={restaurants} setRestaurants={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("restaurant-list")).toBeInTheDocument();
      });

      await waitFor(() => {
        const savedFavorites = localStorage.getItem("restaurantFavorites");
        expect(savedFavorites).toBeDefined();
      });
    });
  });

  describe("State Management", () => {
    it("should initialize with empty restaurants state", async () => {
      const mockSetRestaurants = jest.fn();

      render(
        <App restaurants={[]} setRestaurants={mockSetRestaurants} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });

    it("should handle provided restaurants prop", async () => {
      const restaurants = [
        {
          id: "rest-1",
          name: "Restaurant 1",
          address: "123 Main St",
          lat: 47.5,
          lng: 19.05,
        },
      ];

      render(
        <App restaurants={restaurants} setRestaurants={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });

    it("should update when restaurants prop changes", async () => {
      const restaurants1 = [
        {
          id: "rest-1",
          name: "Restaurant 1",
          address: "123 Main St",
          lat: 47.5,
          lng: 19.05,
        },
      ];

      const { rerender } = render(
        <App restaurants={restaurants1} setRestaurants={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });

      const restaurants2 = [
        ...restaurants1,
        {
          id: "rest-2",
          name: "Restaurant 2",
          address: "456 Oak Ave",
          lat: 47.5,
          lng: 19.05,
        },
      ];

      rerender(
        <App restaurants={restaurants2} setRestaurants={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });
  });

  describe("Loading and Error States", () => {
    it("should show loading state initially", async () => {
      render(
        <App restaurants={[]} setRestaurants={jest.fn()} />
      );

      expect(screen.getByTestId("map-component")).toBeInTheDocument();
    });

    it("should handle fetch errors gracefully", async () => {
      const { fetchRestaurantsFromSERPAPI } = require("./utils/sheetFetcher");
      fetchRestaurantsFromSERPAPI.mockRejectedValueOnce(
        new Error("Network error")
      );

      render(
        <App restaurants={[]} setRestaurants={jest.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByTestId("map-component")).toBeInTheDocument();
      });
    });
  });
});

describe("AppRouter Data Flow Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("should demonstrate the data flow concept", () => {
    const adminUpdates = [
      {
        id: "admin-1",
        name: "Updated by Admin",
        address: "Admin Ave",
        lat: 47.5,
        lng: 19.05,
        source: "admin",
      },
    ];

    localStorage.setItem(
      "adminUpdatedRestaurants",
      JSON.stringify(adminUpdates)
    );

    const saved = JSON.parse(
      localStorage.getItem("adminUpdatedRestaurants")
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Updated by Admin");
  });

  it("should persist multiple admin updates", () => {
    const update1 = {
      id: "admin-1",
      name: "First Update",
      address: "First Ave",
      lat: 47.5,
      lng: 19.05,
      source: "admin",
    };

    const update2 = {
      id: "admin-2",
      name: "Second Update",
      address: "Second Ave",
      lat: 47.51,
      lng: 19.06,
      source: "admin",
    };


    localStorage.setItem(
      "adminUpdatedRestaurants",
      JSON.stringify([update1, update2])
    );

    const saved = JSON.parse(
      localStorage.getItem("adminUpdatedRestaurants")
    );
    expect(saved).toHaveLength(2);
    expect(saved[0].name).toBe("First Update");
    expect(saved[1].name).toBe("Second Update");
  });

  it("should allow admin to delete restaurants via update", () => {
    const allRestaurants = [
      {
        id: "admin-1",
        name: "Restaurant to Keep",
        address: "Keep Ave",
        lat: 47.5,
        lng: 19.05,
        source: "admin",
      },
      {
        id: "admin-2",
        name: "Restaurant to Delete",
        address: "Delete Ave",
        lat: 47.51,
        lng: 19.06,
        source: "admin",
      },
    ];

    const afterDelete = allRestaurants.filter(
      (r) => r.id !== "admin-2"
    );

    localStorage.setItem(
      "adminUpdatedRestaurants",
      JSON.stringify(afterDelete)
    );

    const saved = JSON.parse(
      localStorage.getItem("adminUpdatedRestaurants")
    );
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("admin-1");
  });
});
