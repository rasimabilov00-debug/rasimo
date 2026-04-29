import { normalizeSourceLabel } from "../utils/sourceLabel";
import React, { useState, useEffect } from "react";
import "../styles/AdminPanel.css";
import RestaurantEditor from "./RestaurantEditor";
import AdminAuthLogin from "./AdminAuthLogin";

const AdminPanel = ({ restaurants = [], onRestaurantsUpdate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState(
    localStorage.getItem("adminSessionToken") ? true : false
  );
  const [localRestaurants, setLocalRestaurants] = useState(restaurants);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [showAddNew, setShowAddNew] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminSessionToken");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    setLocalRestaurants(restaurants);
  }, [restaurants]);

  const handleLogin = (password) => {
    const correctPassword = process.env.REACT_APP_ADMIN_PASSWORD || "admin123";
    if (password === correctPassword) {
      setIsAuthenticated(true);
      localStorage.setItem("adminSessionToken", "authenticated");
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("adminSessionToken");
    setSelectedRestaurant(null);
    setIsEditing(false);
  };

  const handleEditRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsEditing(true);
    setShowAddNew(false);
  };

  const handleAddNew = () => {
    setSelectedRestaurant({
      id: `new_${Date.now()}`,
      name: "",
      address: "",
      lat: 47.4979,
      lng: 19.0402,
      website: "",
      category: "restaurant",
      rating: null,
      source: "admin",
    });
    setIsEditing(true);
    setShowAddNew(true);
  };

  const handleSaveRestaurant = (updatedRestaurant) => {
  const normalizedSource = normalizeSourceLabel(updatedRestaurant.source);

  const cleanedRestaurant = {
    ...updatedRestaurant,
    source: normalizedSource,
    Source: normalizedSource,
    sources: [normalizedSource],
    Sources: [normalizedSource],
  };

  if (showAddNew) {
    const newRestaurants = [...localRestaurants, cleanedRestaurant];
    setLocalRestaurants(newRestaurants);
    onRestaurantsUpdate(newRestaurants);
  } else {
    const updatedList = localRestaurants.map((r) =>
      r.id === cleanedRestaurant.id ? cleanedRestaurant : r
    );
    setLocalRestaurants(updatedList);
    onRestaurantsUpdate(updatedList);
  }

  setIsEditing(false);
  setSelectedRestaurant(null);
  setShowAddNew(false);
};

  const handleDeleteRestaurant = (restaurantId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this restaurant? This action cannot be undone."
      )
    ) {
      const updatedList = localRestaurants.filter((r) => r.id !== restaurantId);
      setLocalRestaurants(updatedList);
      onRestaurantsUpdate(updatedList);
      setSelectedRestaurant(null);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedRestaurant(null);
    setShowAddNew(false);
  };

  const filteredRestaurants = localRestaurants.filter((restaurant) => {
    const matchesSearch =
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource =
      filterSource === "all" || restaurant.source === filterSource;
    return matchesSearch && matchesSource;
  });

  if (!isAuthenticated) {
    return (
      <AdminAuthLogin onLogin={handleLogin} />
    );
  }

  if (isEditing && selectedRestaurant) {
    return (
      <RestaurantEditor
        restaurant={selectedRestaurant}
        onSave={handleSaveRestaurant}
        onCancel={handleCancel}
        onDelete={
          !showAddNew ? () => handleDeleteRestaurant(selectedRestaurant.id) : null
        }
      />
    );
  }

  return (
    <div className="admin-panel-container">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>🍽️ Restaurant Admin Panel</h1>
          <p className="admin-subtitle">Manage your restaurant data</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Sources</option>
            <option value="sheet">Sheet</option>
            <option value="admin">Admin</option>
            <option value="hunting">Hunting</option>
          </select>
        </div>

        <button className="add-btn" onClick={handleAddNew}>
          + Add New Restaurant
        </button>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-label">Total</span>
          <span className="stat-value">{localRestaurants.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Filtered</span>
          <span className="stat-value">{filteredRestaurants.length}</span>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Source</th>
              <th>Rating</th>
              <th>Website</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRestaurants.length > 0 ? (
              filteredRestaurants.map((restaurant) => (
                <tr key={restaurant.id} className="admin-table-row">
                  <td className="name-cell">
                    <strong>{restaurant.name}</strong>
                  </td>
                  <td className="address-cell">{restaurant.address}</td>
                  <td className="source-cell">
                    <span className={`source-badge source-${restaurant.source}`}>
                      {restaurant.source}
                    </span>
                  </td>
                  <td className="rating-cell">
                    {restaurant.rating ? `⭐ ${restaurant.rating}` : "-"}
                  </td>
                  <td className="website-cell">
                    {restaurant.website ? (
                      <a
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="website-link"
                      >
                        Visit
                      </a>
                    ) : (
                      <span className="no-website">No website</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditRestaurant(restaurant)}
                      title="Edit restaurant"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="no-results">
                  No restaurants found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
