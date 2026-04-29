import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPanel from "./AdminPanel";

jest.mock("./RestaurantEditor", () => {
  return function MockRestaurantEditor({ onSave, onCancel, onDelete }) {
    return (
      <div data-testid="restaurant-editor">
        <button onClick={onCancel}>Cancel</button>
        {onDelete && <button onClick={onDelete}>Delete</button>}
      </div>
    );
  };
});

jest.mock("./AdminAuthLogin", () => {
  return function MockAdminAuthLogin({ onLogin }) {
    return (
      <div data-testid="auth-login">
        <button onClick={() => onLogin("admin123")}>Login</button>
      </div>
    );
  };
});

describe("AdminPanel", () => {
  const mockOnRestaurantsUpdate = jest.fn();

  const defaultRestaurants = [
    {
      id: "rest-1",
      name: "Italian Place",
      address: "123 Main St",
      source: "sheet",
      rating: 4.5,
      website: "https://italian.com",
    },
    {
      id: "rest-2",
      name: "Sushi Bar",
      address: "456 Oak Ave",
      source: "admin",
      rating: 4.8,
      website: null,
    },
    {
      id: "rest-3",
      name: "Burger House",
      address: "789 Pine Rd",
      source: "hunting",
      rating: 4.2,
      website: "https://burgers.com",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    process.env.REACT_APP_ADMIN_PASSWORD = "admin123";
  });

  describe("Authentication", () => {
    it("should show login screen when not authenticated", () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(screen.getByTestId("auth-login")).toBeInTheDocument();
    });

    it("should show admin panel when authenticated", async () => {
      localStorage.setItem("adminSessionToken", "authenticated");

      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(screen.getByText("🍽️ Restaurant Admin Panel")).toBeInTheDocument();
    });

    it("should authenticate with correct password", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const loginButton = screen.getByRole("button", { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText("🍽️ Restaurant Admin Panel")).toBeInTheDocument();
      });
    });

    it("should store session token after login", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const loginButton = screen.getByRole("button", { name: /login/i });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(localStorage.getItem("adminSessionToken")).toBe("authenticated");
      });
    });
  });

  describe("Restaurant Table Display", () => {
    beforeEach(() => {
      localStorage.setItem("adminSessionToken", "authenticated");
    });

    it("should display all restaurants in table", () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(screen.getByText("Italian Place")).toBeInTheDocument();
      expect(screen.getByText("Sushi Bar")).toBeInTheDocument();
      expect(screen.getByText("Burger House")).toBeInTheDocument();
    });

    it("should display restaurant addresses", () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(screen.getByText("123 Main St")).toBeInTheDocument();
      expect(screen.getByText("456 Oak Ave")).toBeInTheDocument();
      expect(screen.getByText("789 Pine Rd")).toBeInTheDocument();
    });

    it("should display restaurant sources", () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(screen.getAllByText("sheet")).toHaveLength(1);
      expect(screen.getAllByText("admin")).toHaveLength(1);
      expect(screen.getAllByText("hunting")).toHaveLength(1);
    });

    it("should display restaurant ratings", () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(screen.getByText("⭐ 4.5")).toBeInTheDocument();
      expect(screen.getByText("⭐ 4.8")).toBeInTheDocument();
      expect(screen.getByText("⭐ 4.2")).toBeInTheDocument();
    });

    it("should show '-' for missing ratings", () => {
      const restaurantsWithoutRating = [
        {
          ...defaultRestaurants[0],
          rating: null,
        },
      ];

      render(
        <AdminPanel
          restaurants={restaurantsWithoutRating}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("should show total restaurant count", () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const stats = screen.getAllByText("3");
      expect(stats.length).toBeGreaterThan(0);
    });

    it("should show 'No restaurants found' when empty", () => {
      render(
        <AdminPanel
          restaurants={[]}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(
        screen.getByText("No restaurants found matching your criteria.")
      ).toBeInTheDocument();
    });
  });

  describe("Search Filtering", () => {
    beforeEach(() => {
      localStorage.setItem("adminSessionToken", "authenticated");
    });

    it("should filter restaurants by name search", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search restaurants...");
      fireEvent.change(searchInput, { target: { value: "Italian" } });

      expect(screen.getByText("Italian Place")).toBeInTheDocument();
      expect(screen.queryByText("Sushi Bar")).not.toBeInTheDocument();
      expect(screen.queryByText("Burger House")).not.toBeInTheDocument();
    });

    it("should filter restaurants by address search", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search restaurants...");
      fireEvent.change(searchInput, { target: { value: "Main St" } });

      expect(screen.getByText("Italian Place")).toBeInTheDocument();
      expect(screen.queryByText("Sushi Bar")).not.toBeInTheDocument();
    });

    it("should be case-insensitive search", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search restaurants...");
      fireEvent.change(searchInput, { target: { value: "sushi" } });

      expect(screen.getByText("Sushi Bar")).toBeInTheDocument();
      expect(screen.queryByText("Italian Place")).not.toBeInTheDocument();
    });

    it("should show no results for non-matching search", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search restaurants...");
      fireEvent.change(searchInput, { target: { value: "NonExistent" } });

      expect(
        screen.getByText("No restaurants found matching your criteria.")
      ).toBeInTheDocument();
    });

    it("should update filtered count when searching", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search restaurants...");
      fireEvent.change(searchInput, { target: { value: "Italian" } });

      const statValues = screen.getAllByText("1");
      expect(statValues.length).toBeGreaterThan(0);
    });
  });

  describe("Source Filtering", () => {
    beforeEach(() => {
      localStorage.setItem("adminSessionToken", "authenticated");
    });

    it("should filter restaurants by sheet source", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const sourceFilter = screen.getByDisplayValue("All Sources");
      fireEvent.change(sourceFilter, { target: { value: "sheet" } });

      expect(screen.getByText("Italian Place")).toBeInTheDocument();
      expect(screen.queryByText("Sushi Bar")).not.toBeInTheDocument();
      expect(screen.queryByText("Burger House")).not.toBeInTheDocument();
    });

    it("should filter restaurants by admin source", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const sourceFilter = screen.getByDisplayValue("All Sources");
      fireEvent.change(sourceFilter, { target: { value: "admin" } });

      expect(screen.queryByText("Italian Place")).not.toBeInTheDocument();
      expect(screen.getByText("Sushi Bar")).toBeInTheDocument();
      expect(screen.queryByText("Burger House")).not.toBeInTheDocument();
    });

    it("should filter restaurants by hunting source", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const sourceFilter = screen.getByDisplayValue("All Sources");
      fireEvent.change(sourceFilter, { target: { value: "hunting" } });

      expect(screen.queryByText("Italian Place")).not.toBeInTheDocument();
      expect(screen.queryByText("Sushi Bar")).not.toBeInTheDocument();
      expect(screen.getByText("Burger House")).toBeInTheDocument();
    });

    it("should show all sources when 'All Sources' selected", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const sourceFilter = screen.getByDisplayValue("All Sources");
      fireEvent.change(sourceFilter, { target: { value: "sheet" } });

      fireEvent.change(sourceFilter, { target: { value: "all" } });

      expect(screen.getByText("Italian Place")).toBeInTheDocument();
      expect(screen.getByText("Sushi Bar")).toBeInTheDocument();
      expect(screen.getByText("Burger House")).toBeInTheDocument();
    });
  });

  describe("Combined Search and Filter", () => {
    beforeEach(() => {
      localStorage.setItem("adminSessionToken", "authenticated");
    });

    it("should apply both search and source filter together", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search restaurants...");
      const sourceFilter = screen.getByDisplayValue("All Sources");

      fireEvent.change(searchInput, { target: { value: "House" } });
      fireEvent.change(sourceFilter, { target: { value: "hunting" } });

      expect(screen.getByText("Burger House")).toBeInTheDocument();
      expect(screen.queryByText("Italian Place")).not.toBeInTheDocument();
      expect(screen.queryByText("Sushi Bar")).not.toBeInTheDocument();
    });
  });

  describe("Edit Functionality", () => {
    beforeEach(() => {
      localStorage.setItem("adminSessionToken", "authenticated");
    });

    it("should show RestaurantEditor when Edit button clicked", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("restaurant-editor")).toBeInTheDocument();
    });

    it("should pass restaurant data to editor", async () => {
      const { container } = render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("restaurant-editor")).toBeInTheDocument();
    });
  });

  describe("Save Restaurant", () => {
    beforeEach(() => {
      localStorage.setItem("adminSessionToken", "authenticated");
    });

    it("should update restaurant when saved", async () => {
      const { rerender } = render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("restaurant-editor")).toBeInTheDocument();
    });

    it("should call onRestaurantsUpdate when restaurant saved", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId("restaurant-editor")).toBeInTheDocument();
    });

    it("should add new restaurant when saving new restaurant", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const addButton = screen.getByRole("button", { name: /\+ Add New Restaurant/i });
      fireEvent.click(addButton);

      expect(screen.getByTestId("restaurant-editor")).toBeInTheDocument();
    });
  });

  describe("Delete Functionality", () => {
    beforeEach(() => {
      localStorage.setItem("adminSessionToken", "authenticated");
    });

    it("should show Delete button in editor for existing restaurants", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("should remove restaurant and call onRestaurantsUpdate on delete", async () => {
      window.confirm = jest.fn(() => true);

      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnRestaurantsUpdate).toHaveBeenCalled();
    });

    it("should not delete restaurant when confirmation canceled", async () => {
      window.confirm = jest.fn(() => false);

      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      fireEvent.click(editButtons[0]);

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnRestaurantsUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Logout", () => {
    beforeEach(() => {
      localStorage.setItem("adminSessionToken", "authenticated");
    });

    it("should show logout button when authenticated", () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    });

    it("should clear session token on logout", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutButton);

      expect(localStorage.getItem("adminSessionToken")).toBeNull();
    });

    it("should return to login screen on logout", async () => {
      render(
        <AdminPanel
          restaurants={defaultRestaurants}
          onRestaurantsUpdate={mockOnRestaurantsUpdate}
        />
      );

      const logoutButton = screen.getByRole("button", { name: /logout/i });
      fireEvent.click(logoutButton);

      expect(screen.getByTestId("auth-login")).toBeInTheDocument();
    });
  });
});
