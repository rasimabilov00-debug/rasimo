import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getRestaurantWebsiteUrl } from "./utils/websiteUrl";
import {
  getRestaurantSourceLabel,
  getSourceDisplayLabel,
} from "./utils/sourceLabel";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const DEFAULT_CENTER = [47.4979, 19.0402];

const hasValidRestaurantCoords = (restaurant) => {
  const lat = parseFloat(restaurant?.lat);
  const lng = parseFloat(restaurant?.lng);
  return (
    restaurant &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    (restaurant?.name || "").toString().trim()
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
    if (!hasValidRestaurantCoords(selected)) return;

    const lat = parseFloat(selected.lat);
    const lng = parseFloat(selected.lng);

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
const hunterIcon = createMarkerIcon("orange");
const selectedIcon = createMarkerIcon("red");
const userLocationIcon = createMarkerIcon("green");

const MapComponent = ({
  restaurants = [],
  onRestaurantSelect,
  selectedRestaurantIndex,
}) => {
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter] = useState(DEFAULT_CENTER);

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

      {/* Markers render from the same filtered array used by the list, so both always match. */}
      {restaurants.map((marker, originalIndex) => {
        const lat = parseFloat(marker.lat);
        const lng = parseFloat(marker.lng);
        const restaurantName = marker.name || "";
        const sourceLabel = getRestaurantSourceLabel(marker);
        const isPipeline = sourceLabel === "pipeline";
        const isHunter = sourceLabel === "hunter";
        const isSelected = originalIndex === selectedRestaurantIndex;
        // Reuse the same website helper as the list for consistent link behavior.
        const websiteUrl = getRestaurantWebsiteUrl(marker);

        const markerIcon = isSelected
          ? selectedIcon
          : isPipeline
          ? pipelineIcon
          : isHunter
          ? hunterIcon
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
                  <strong>Source:</strong> {getSourceDisplayLabel(sourceLabel)}
                </p>
                {marker.offerTitle && <p>{marker.offerTitle}</p>}
                {marker.description && <p>{marker.description}</p>}
                {marker.address && (
                  <p>
                    <strong>Address:</strong> {marker.address}
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