import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import App from "./App";
import AdminPanel from "./components/AdminPanel";
import "./AppRouter.css";

const AppNavigation = () => {
  const location = useLocation();
  if (location.pathname === "/admin") return null;

  return (
    <div className="app-nav-bar">
      <div className="nav-content">
        <h1 className="nav-brand">🍽️ Restaurant Map</h1>
        <Link to="/admin" className="admin-link">🔐 Admin</Link>
      </div>
    </div>
  );
};

const AppRouterWrapper = () => {
const [restaurants, setRestaurants] = useState(() => {
  try {
    const saved = localStorage.getItem("adminUpdatedRestaurants");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
});

const handleRestaurantsUpdate = (updatedRestaurants) => {
  setRestaurants(updatedRestaurants);
  localStorage.setItem(
    "adminUpdatedRestaurants",
    JSON.stringify(updatedRestaurants)
  );
};

  return (
    <BrowserRouter>
      <AppNavigation />
      <Routes>
        <Route
          path="/"
          element={
            <App
              restaurants={restaurants}
              setRestaurants={setRestaurants}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <AdminPanel
              restaurants={restaurants}
              onRestaurantsUpdate={handleRestaurantsUpdate}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouterWrapper;