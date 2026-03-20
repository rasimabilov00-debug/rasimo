import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for marker icons not loading in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const DEFAULT_CENTER = [47.4979, 19.0402]; // Budapest

const isValidCoordinate = (value) => {
  const num = parseFloat(value);
  return !Number.isNaN(num);
};

const hasValidRestaurantCoords = (restaurant) => {
  return (
    restaurant &&
    isValidCoordinate(restaurant.Latitude) &&
    isValidCoordinate(restaurant.Longitude) &&
    (restaurant["Restaurant Name"] || "").toString().trim()
  );
};

const MapFlyToSelected = ({ restaurants, selectedRestaurantIndex }) => {
  const map = useMap();

  useEffect(() => {
    if (
      selectedRestaurantIndex === null ||
      selectedRestaurantIndex === undefined ||
      !restaurants[selectedRestaurantIndex]
    ) {
      return;
    }

    const selected = restaurants[selectedRestaurantIndex];

    if (!hasValidRestaurantCoords(selected)) {
      return;
    }

    const lat = parseFloat(selected.Latitude);
    const lng = parseFloat(selected.Longitude);

    map.flyTo([lat, lng], 15, { duration: 0.8 });
  }, [selectedRestaurantIndex, restaurants, map]);

  return null;
};

const MapComponent = ({
  restaurants = [],
  onRestaurantSelect,
  selectedRestaurantIndex,
}) => {
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  const nearbyRestaurants = useMemo(() => {
    return restaurants
      .map((marker, index) => ({ marker, index }))
      .filter(({ marker }) => hasValidRestaurantCoords(marker));
  }, [restaurants]);

  useEffect(() => {
    console.log("📍 MapComponent received restaurants:", restaurants.length);
    console.log("📍 Restaurants with valid coords:", nearbyRestaurants.length);
    console.log(
      "📍 Restaurant names:",
      restaurants.map((r) => r["Restaurant Name"]).filter(Boolean)
    );
  }, [restaurants, nearbyRestaurants]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setMapCenter(DEFAULT_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userCoords = [latitude, longitude];
        setUserLocation(userCoords);

        // Keep Budapest as default center unless user is also near Budapest.
        const nearBudapest =
          latitude >= 47.0 &&
          latitude <= 47.8 &&
          longitude >= 18.7 &&
          longitude <= 19.5;

        setMapCenter(nearBudapest ? userCoords : DEFAULT_CENTER);
      },
      (error) => {
        console.error("Error getting user location:", error);
        setMapCenter(DEFAULT_CENTER);
      }
    );
  }, []);

  const restaurantIcons = [
    new Icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    }),
    new Icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    }),
    new Icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    }),
    new Icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    }),
    new Icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    }),
  ];

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

      <MapFlyToSelected
        restaurants={restaurants}
        selectedRestaurantIndex={selectedRestaurantIndex}
      />

      {nearbyRestaurants.map(({ marker, index: originalIndex }, nearbyIndex) => {
        const lat = parseFloat(marker.Latitude);
        const lng = parseFloat(marker.Longitude);
        const restaurantName = marker["Restaurant Name"] || "";
        const offerTitle = marker["Offer Title"] || "";
        const description = marker.Description || "";
        const price = marker.Price || "";
        const category = marker.Category || "";
        const restaurantIcon =
          restaurantIcons[nearbyIndex % restaurantIcons.length];

        return (
          <Marker
            key={`${restaurantName}-${originalIndex}-${lat}-${lng}`}
            position={[lat, lng]}
            icon={restaurantIcon}
            eventHandlers={{
              click: () => {
                console.log(
                  `🎯 Marker clicked: ${restaurantName} (index=${originalIndex})`
                );
                if (onRestaurantSelect) {
                  onRestaurantSelect(originalIndex);
                }
              },
            }}
          >
            <Popup>
              <div
                className="restaurant-popup-card"
                style={{ maxWidth: "240px" }}
              >
                <div className="restaurant-popup-header">
                  <h4>{restaurantName}</h4>
                  {offerTitle && <span className="popup-badge">{offerTitle}</span>}
                </div>

                <div className="restaurant-popup-body">
                  {description && <p>{description}</p>}
                  {price && (
                    <p>
                      <strong>Price:</strong> {price}
                    </p>
                  )}
                  {category && (
                    <p>
                      <strong>Category:</strong> {category}
                    </p>
                  )}
                  {marker.Address && (
                    <p>
                      <strong>Address:</strong> {marker.Address}
                    </p>
                  )}
                </div>

                <div className="restaurant-popup-actions">
                  {marker.Website && (
                    <a
                      href={marker.Website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="popup-visit-link"
                    >
                      Go to website
                    </a>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;