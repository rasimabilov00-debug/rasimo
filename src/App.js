import React from "react";
import MapComponent from "./MapComponent";
import RestaurantList from "./RestaurantList";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <div className="map-section">
        <MapComponent />
      </div>
      <div className="list-section">
        <RestaurantList />
      </div>
    </div>
  );
}

export default App;