import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RestaurantEditor from "./RestaurantEditor";

describe("RestaurantEditor", () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnDelete = jest.fn();

  const defaultRestaurant = {
    id: "test-1",
    name: "Test Restaurant",
    address: "123 Test St",
    lat: 47.4979,
    lng: 19.0402,
    website: "https://example.com",
    source: "sheet",
    category: "restaurant",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it("renders the form with restaurant data", () => {
    render(
      <RestaurantEditor
        restaurant={defaultRestaurant}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue("Test Restaurant")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123 Test St")).toBeInTheDocument();
    expect(screen.getByDisplayValue("47.4979")).toBeInTheDocument();
    expect(screen.getByDisplayValue("19.0402")).toBeInTheDocument();
  });

  it("shows validation errors for required fields", async () => {
    render(
      <RestaurantEditor
        restaurant={{
          ...defaultRestaurant,
          name: "",
          address: "",
          lat: "",
          lng: "",
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Restaurant name is required")).toBeInTheDocument();
    expect(screen.getByText("Address is required")).toBeInTheDocument();
    expect(screen.getByText(/Latitude must be between -90 and 90/)).toBeInTheDocument();
    expect(screen.getByText(/Longitude must be between -180 and 180/)).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("validates website URL", async () => {
    render(
      <RestaurantEditor
        restaurant={{
          ...defaultRestaurant,
          website: "not a valid url",
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/Please enter a valid website URL/)).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("calls onSave with updated data", async () => {
    render(
      <RestaurantEditor
        restaurant={defaultRestaurant}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.change(screen.getByDisplayValue("Test Restaurant"), {
      target: { value: "Updated Restaurant" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Restaurant",
        })
      );
    });
  });

  it("normalizes old hunter source to hunting on save", async () => {
    render(
      <RestaurantEditor
        restaurant={{
          ...defaultRestaurant,
          source: "hunter",
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "hunting",
        })
      );
    });
  });

  it("calls onCancel when cancel is clicked", () => {
    render(
      <RestaurantEditor
        restaurant={defaultRestaurant}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("calls onDelete when delete is confirmed", () => {
    render(
      <RestaurantEditor
        restaurant={defaultRestaurant}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it("does not call onDelete when delete is canceled", () => {
    window.confirm = jest.fn(() => false);

    render(
      <RestaurantEditor
        restaurant={defaultRestaurant}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });
});