import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { fetchRestaurantData } from "./utils/sheetFetcher";
import "leaflet/dist/leaflet.css";

const MapComponent = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]);
  const [sheetMarkers, setSheetMarkers] = useState([]);

  useEffect(() => {
    // Fetch data from Google Sheet
    const loadData = async () => {
      try {
        const data = await fetchRestaurantData();
        setSheetMarkers(data);
      } catch (error) {
        console.error("Error loading restaurant data:", error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Request user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userCoords = [latitude, longitude];
          setUserLocation(userCoords);
          setMapCenter(userCoords);
        },
        (error) => {
          console.error("Error getting user location:", error);
          // Keep default center if geolocation fails
        }
      );
    }
  }, []);

        // Step 2: Define unique marker icons for each restaurant (5 different colors)
        const restaurantIcons = [
          // Red for first restaurant
          new Icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
          // Orange for second restaurant
          new Icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
          // Yellow for third restaurant
          new Icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
          // Green for fourth restaurant
          new Icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
          // Blue for fifth restaurant
          new Icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        ];

        // Custom icon for user location (purple to distinguish from restaurants)
        const userLocationIcon = new Icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });

  return (
    <MapContainer
      center={mapCenter}
      zoom={13}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      {userLocation && (
        <Marker position={userLocation} icon={userLocationIcon}>
          <Popup>📍 You are here</Popup>
        </Marker>
      )}
      {sheetMarkers.map((marker, index) => {
        // Parse latitude and longitude from sheet
        const lat = parseFloat(marker.Latitude);
        const lng = parseFloat(marker.Longitude);
        const restaurantName = marker["Restaurant Name"] || "";
        const offerTitle = marker["Offer Title"] || "";
        const description = marker.Description || "";
        const price = marker.Price || "";
        const category = marker.Category || "";

        console.log(`Marker ${index}: ${restaurantName}, Lat: ${lat}, Lng: ${lng}`);

        if (lat && lng && !isNaN(lat) && !isNaN(lng) && restaurantName) {
          // Use unique icon for each restaurant (cycle through 5 colors)
          const restaurantIcon = restaurantIcons[index % restaurantIcons.length];

          return (
            <Marker
              key={index}
              position={[lat, lng]}
              icon={restaurantIcon}
            >
              <Popup>
                <div style={{ maxWidth: "200px" }}>
                  <strong>{restaurantName}</strong>
                  {offerTitle && <p><em>{offerTitle}</em></p>}
                  {description && <p>{description}</p>}
                  {price && <p><strong>Price: {price}</strong></p>}
                  {category && <p>Category: {category}</p>}
                </div>
              </Popup>
            </Marker>
          );
        }
        return null;
      })}
    </MapContainer>
  );
};

export default MapComponent;