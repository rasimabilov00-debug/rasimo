import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const DEFAULT_CENTER = [47.4979, 19.0402];

const hasValidRestaurantCoords = (restaurant) => {
  const lat = parseFloat(restaurant?.Latitude);
  const lng = parseFloat(restaurant?.Longitude);
  return (
    restaurant &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    (restaurant["Restaurant Name"] || "").toString().trim()
  );
};

const getPopupWebsiteUrl = (restaurant) => {
  const name = (restaurant?.["Restaurant Name"] || "")
    .toString()
    .trim()
    .toLowerCase();

  const allowedNames = ["kfc", "bamba", "burger king"];
  const isAllowedRestaurant = allowedNames.some((allowed) =>
    name.includes(allowed)
  );

  if (!isAllowedRestaurant) return null;

  const value = (restaurant?.Website || "").toString().trim();
  if (!value) return null;
  if (/^(n\/a|na|null|none|-|#)$/i.test(value)) return null;

  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
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
    if (!hasValidRestaurantCoords(selected)) return;

    const lat = parseFloat(selected.Latitude);
    const lng = parseFloat(selected.Longitude);

    map.flyTo([lat, lng], 15, { duration: 0.8 });
  }, [selectedRestaurantIndex, restaurants, map]);

  return null;
};

const createMarkerIcon = (color) =>
  new Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const pipelineIcon = createMarkerIcon("violet");
const sheetIcon = createMarkerIcon("blue");
const selectedIcon = createMarkerIcon("red");
const userLocationIcon = createMarkerIcon("green");

const MapComponent = ({
  restaurants = [],
  onRestaurantSelect,
  selectedRestaurantIndex,
}) => {
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter] = useState(DEFAULT_CENTER);

  const visibleRestaurants = useMemo(() => {
    return restaurants
      .map((marker, index) => ({ marker, index }))
      .filter(({ marker }) => hasValidRestaurantCoords(marker));
  }, [restaurants]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
      },
      (error) => {
        console.error("Error getting user location:", error);
      }
    );
  }, []);

  return (
    <MapContainer center={mapCenter} zoom={13} style={{ height: "100vh", width: "100%" }}>
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

      {visibleRestaurants.map(({ marker, index: originalIndex }) => {
        const lat = parseFloat(marker.Latitude);
        const lng = parseFloat(marker.Longitude);
        const restaurantName = marker["Restaurant Name"] || "";
        const isPipeline = marker.Source === "pipeline";
        const isSelected = originalIndex === selectedRestaurantIndex;
        const websiteUrl = getPopupWebsiteUrl(marker);

        const markerIcon = isSelected
          ? selectedIcon
          : isPipeline
          ? pipelineIcon
          : sheetIcon;

        return (
          <Marker
            key={`${restaurantName}-${originalIndex}-${lat}-${lng}`}
            position={[lat, lng]}
            icon={markerIcon}
            eventHandlers={{
              click: () => {
                if (onRestaurantSelect) {
                  onRestaurantSelect(originalIndex);
                }
              },
            }}
          >
            <Popup>
              <div style={{ maxWidth: "240px" }}>
                <h4>{restaurantName}</h4>
                <p>
                  <strong>Source:</strong> {isPipeline ? "Pipeline" : "Sheet"}
                </p>
                {marker["Offer Title"] && <p>{marker["Offer Title"]}</p>}
                {marker.Description && <p>{marker.Description}</p>}
                {marker.Address && (
                  <p>
                    <strong>Address:</strong> {marker.Address}
                  </p>
                )}
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                    Go to website
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;