import React, { useState, useEffect } from "react";
import "../styles/RestaurantEditor.css";
import { normalizeSourceLabel } from "../utils/sourceLabel";

const normalizeEditorRestaurant = (restaurant = {}) => ({
  ...restaurant,
  source: normalizeSourceLabel(restaurant?.source),
});

const RestaurantEditor = ({ restaurant, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState(normalizeEditorRestaurant(restaurant));
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFormData(normalizeEditorRestaurant(restaurant));
  }, [restaurant]);

  const isValidUrl = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Restaurant name is required";
    }

    if (!formData.address || !formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    const lat = parseFloat(formData.lat);
    const lng = parseFloat(formData.lng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.lat = "Latitude must be between -90 and 90";
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.lng = "Longitude must be between -180 and 180";
    }

    if (formData.website && !isValidUrl(formData.website)) {
      newErrors.website = "Please enter a valid website URL";
    }

    const rating = parseFloat(formData.rating);
    if (formData.rating && (isNaN(rating) || rating < 0 || rating > 5)) {
      newErrors.rating = "Rating must be between 0 and 5";
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "source" ? normalizeSourceLabel(value) : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const normalizedRestaurant = {
      ...formData,
      source: normalizeSourceLabel(formData.source),
    };

    setIsLoading(true);

    setTimeout(() => {
      onSave(normalizedRestaurant);
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="restaurant-editor-container">
      <div className="editor-card">
        <div className="editor-header">
          <h1>
            {restaurant.id?.startsWith("new_")
              ? "Add New Restaurant"
              : "Edit Restaurant"}
          </h1>
          <button className="close-btn" onClick={onCancel} title="Close editor">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="editor-form">
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>

            <div className="form-group">
              <label htmlFor="name">Restaurant Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                placeholder="e.g., Szechuan House"
                className={`form-input ${errors.name ? "error" : ""}`}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                placeholder="e.g., 123 Main Street, Budapest"
                className={`form-input ${errors.address ? "error" : ""}`}
              />
              {errors.address && (
                <span className="error-text">{errors.address}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category || "restaurant"}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="bar">Bar</option>
                  <option value="bistro">Bistro</option>
                  <option value="pizzeria">Pizzeria</option>
                  <option value="steakhouse">Steakhouse</option>
                  <option value="asian">Asian</option>
                  <option value="italian">Italian</option>
                  <option value="mexican">Mexican</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="source">Source</label>
                <select
                  id="source"
                  name="source"
                  value={formData.source || "admin"}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="admin">Admin</option>
                  <option value="sheet">Sheet</option>
                  <option value="hunting">Hunting</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Location</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lat">Latitude *</label>
                <input
                  type="number"
                  id="lat"
                  name="lat"
                  value={formData.lat || ""}
                  onChange={handleChange}
                  step="0.00001"
                  placeholder="47.4979"
                  className={`form-input ${errors.lat ? "error" : ""}`}
                />
                {errors.lat && <span className="error-text">{errors.lat}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="lng">Longitude *</label>
                <input
                  type="number"
                  id="lng"
                  name="lng"
                  value={formData.lng || ""}
                  onChange={handleChange}
                  step="0.00001"
                  placeholder="19.0402"
                  className={`form-input ${errors.lng ? "error" : ""}`}
                />
                {errors.lng && <span className="error-text">{errors.lng}</span>}
              </div>
            </div>

            <p className="location-hint">
              💡 Current coordinates: {formData.lat}, {formData.lng}
            </p>
          </div>

          <div className="form-section">
            <h3 className="section-title">Details</h3>

            <div className="form-group">
              <label htmlFor="website">Website URL</label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website || ""}
                onChange={handleChange}
                placeholder="https://example.com"
                className={`form-input ${errors.website ? "error" : ""}`}
              />
              {errors.website && (
                <span className="error-text">{errors.website}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rating">Rating (0-5)</label>
                <input
                  type="number"
                  id="rating"
                  name="rating"
                  value={formData.rating || ""}
                  onChange={handleChange}
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="4.5"
                  className={`form-input ${errors.rating ? "error" : ""}`}
                />
                {errors.rating && (
                  <span className="error-text">{errors.rating}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="userRatingCount">Number of Ratings</label>
                <input
                  type="number"
                  id="userRatingCount"
                  name="userRatingCount"
                  value={formData.userRatingCount || ""}
                  onChange={handleChange}
                  min="0"
                  placeholder="123"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>

            {onDelete && (
              <button
                type="button"
                className="btn-delete"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this restaurant?"
                    )
                  ) {
                    onDelete();
                  }
                }}
                disabled={isLoading}
              >
                Delete
              </button>
            )}

            <button type="submit" className="btn-save" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Restaurant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestaurantEditor;