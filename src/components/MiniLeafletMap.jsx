import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_CONFIG = {
  hospital: { color: '#FF3333', faIcon: 'fa-house-medical', label: 'Hospital' },
  police:   { color: '#1E90FF', faIcon: 'fa-shield-halved', label: 'Police'   },
  fire_station: { color: '#E67E22', faIcon: 'fa-fire', label: 'Fire Station' },
  shelter:  { color: '#8E44AD', faIcon: 'fa-tent', label: 'Shelter / Evacuation Center' }
};

function buildDivIcon(amenity) {
  const cfg = CATEGORY_CONFIG[amenity] || CATEGORY_CONFIG.hospital;
  return L.divIcon({
    className: '',
    html: `
      <div class="map-fa-pin" style="background:${cfg.color}">
        <i class="fa-solid ${cfg.faIcon}" aria-hidden="true" style="color:#fff;font-size:12px;"></i>
        <div class="map-pin-tail" style="border-top-color:${cfg.color}"></div>
      </div>`,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -40],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div class="user-location-dot"><div class="user-pulse-ring"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function RecenterMiniMap({ center, nearestPlace }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    if (nearestPlace && nearestPlace.lat && nearestPlace.lon) {
      // Fit bounds to show both user and nearest place
      const bounds = L.latLngBounds(
        [center.lat, center.lon],
        [nearestPlace.lat, nearestPlace.lon]
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView([center.lat, center.lon], 15);
    }
  }, [center, nearestPlace, map]);
  return null;
}

export default function MiniLeafletMap({ center, nearestPlace, amenity }) {
  if (!center) return null;

  const mapCenter = [center.lat, center.lon];

  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      zoomControl={false}
      dragging={true}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User Location Marker */}
      <Marker position={mapCenter} icon={userIcon}>
        <Popup className="novi-popup">
          <div className="popup-content">
            <strong>Your Location</strong>
          </div>
        </Popup>
      </Marker>

      {/* Nearest Place Marker */}
      {nearestPlace && nearestPlace.lat && nearestPlace.lon && (
        <Marker
          position={[nearestPlace.lat, nearestPlace.lon]}
          icon={buildDivIcon(amenity)}
        >
          <Popup className="novi-popup">
            <div className="popup-content">
              <strong>{nearestPlace.name}</strong>
              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                <i className="fa-solid fa-route"></i> {nearestPlace.distance} km away
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      <RecenterMiniMap center={center} nearestPlace={nearestPlace} />
    </MapContainer>
  );
}
