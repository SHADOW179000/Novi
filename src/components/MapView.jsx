import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import LoadingSpinner from './LoadingSpinner';
import L from 'leaflet';
import { point, nearestPoint, featureCollection } from '@turf/turf';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Category config
const CATEGORY_CONFIG = {
  hospital: { color: '#FF3333', faIcon: 'fa-house-medical', label: 'Hospital' },
  police:   { color: '#1E90FF', faIcon: 'fa-shield-halved', label: 'Police'   },
  fire_station: { color: '#E67E22', faIcon: 'fa-fire', label: 'Fire Station' },
};

// Build a custom DivIcon using Font Awesome for each category
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

// Custom blue pulsing icon for user location
const userIcon = L.divIcon({
  className: '',
  html: `<div class="user-location-dot"><div class="user-pulse-ring"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Helper: format distance
function formatDistance(metres) {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

// Helper: compute distance from user to a node using @turf/turf
function getDistanceMetres(userLat, userLon, nodeLat, nodeLon) {
  const from = point([userLon, userLat]);
  const to   = point([nodeLon, nodeLat]);
  // Use turf distance (km) * 1000
  const fc = featureCollection([to]);
  const nearest = nearestPoint(from, fc);
  return nearest.properties.distanceToPoint * 1000; // turf returns km
}

// Component that re-centers the map when user location changes
function RecenterMap({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) map.setView([lat, lon], 15, { animate: true });
  }, [lat, lon, map]);
  return null;
}

export default function MapView({ anonymousMode }) {
  const [userPos, setUserPos]       = useState(null);
  const [markers, setMarkers]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError]     = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const mapRef = useRef(null);

  // Get GPS on mount / handle Anonymous Mode changes
  useEffect(() => {
    if (anonymousMode) {
      setUserPos(null);
      setGpsError('GPS Location disabled in Anonymous Mode.');
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsError('');
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('Location access denied. Please allow location permissions to use the map.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError('Location information is unavailable. Please try again.');
            break;
          default:
            setGpsError('Unable to retrieve your location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [anonymousMode]);

  // Fetch nearby places using Overpass API
  const fetchNearby = async (filter) => {
    if (!userPos) return;
    setLoading(true);
    setActiveFilter(filter);
    setFetchError('');
    setMarkers([]);

    const { lat, lon } = userPos;
    const query =
      `[out:json];(` +
      `node["amenity"="hospital"](around:5000,${lat},${lon});` +
      `node["amenity"="police"](around:5000,${lat},${lon});` +
      `node["amenity"="fire_station"](around:5000,${lat},${lon});` +
      `);out;`;

    try {
      const res  = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });
      if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
      const data = await res.json();

      const parsed = data.elements
        .filter((el) => el.type === 'node' && el.tags?.amenity)
        .map((el) => {
          const amenity = el.tags.amenity;
          const name    = el.tags.name || el.tags['name:en'] || CATEGORY_CONFIG[amenity]?.label || 'Unnamed';
          const dist    = getDistanceMetres(lat, lon, el.lat, el.lon);
          return { id: el.id, lat: el.lat, lon: el.lon, name, amenity, dist };
        })
        // Filter to only show the selected category
        .filter((m) => m.amenity === filter)
        .sort((a, b) => a.dist - b.dist);

      setMarkers(parsed);
      if (parsed.length === 0) {
        setFetchError(`No ${CATEGORY_CONFIG[filter]?.label ?? filter}s found within 5 km.`);
      }
    } catch (err) {
      setFetchError('Could not load nearby places. Check your internet connection.');
      console.error('Overpass error:', err);
    } finally {
      setLoading(false);
    }
  };

  const defaultCenter = userPos ? [userPos.lat, userPos.lon] : [20.5937, 78.9629]; // India center

  return (
    <div className="map-view-wrapper">
      {/* Filter Buttons */}
      <div className="map-filter-bar" role="group" aria-label="Map category filters">
        <button
          className={`map-filter-btn hospital ${activeFilter === 'hospital' ? 'active' : ''}`}
          onClick={() => fetchNearby('hospital')}
          disabled={loading || !userPos}
          aria-label="Find nearby hospitals"
          aria-pressed={activeFilter === 'hospital'}
        >
          <i className="fa-solid fa-house-medical" aria-hidden="true"></i>
          <span>Hospitals</span>
        </button>
        <button
          className={`map-filter-btn police ${activeFilter === 'police' ? 'active' : ''}`}
          onClick={() => fetchNearby('police')}
          disabled={loading || !userPos}
          aria-label="Find nearby police stations"
          aria-pressed={activeFilter === 'police'}
        >
          <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
          <span>Police</span>
        </button>
        <button
          className={`map-filter-btn fire ${activeFilter === 'fire_station' ? 'active' : ''}`}
          onClick={() => fetchNearby('fire_station')}
          disabled={loading || !userPos}
          aria-label="Find nearby fire stations"
          aria-pressed={activeFilter === 'fire_station'}
        >
          <i className="fa-solid fa-fire" aria-hidden="true"></i>
          <span>Fire</span>
        </button>
      </div>

      {/* GPS Loading */}
      {gpsLoading && (
        <div className="map-loading-overlay">
          <LoadingSpinner message="Finding your location..." />
        </div>
      )}

      {/* GPS Error Banner */}
      {gpsError && (
        <div className="map-error-banner" role="alert">
          <i className="fa-solid fa-location-xmark" aria-hidden="true"></i>
          <span>{gpsError}</span>
        </div>
      )}

      {/* Fetch Error Banner */}
      {fetchError && !loading && (
        <div className="map-error-banner" role="alert">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
          <span>{fetchError}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="map-loading-overlay">
          <LoadingSpinner message="Finding nearby help..." />
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={defaultCenter}
        zoom={userPos ? 15 : 5}
        className="leaflet-map-container"
        ref={mapRef}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Recenter when GPS obtained */}
        {userPos && <RecenterMap lat={userPos.lat} lon={userPos.lon} />}

        {/* User Location Marker */}
        {userPos && (
          <Marker position={[userPos.lat, userPos.lon]} icon={userIcon}>
            <Popup className="novi-popup">
              <div className="popup-content">
                <strong>Your Location</strong>
                <p>GPS coordinates obtained</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Nearby Place Markers */}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lon]}
            icon={buildDivIcon(m.amenity)}
          >
            <Popup className="novi-popup">
              <div className="popup-content">
                <div className="popup-category" style={{ color: CATEGORY_CONFIG[m.amenity]?.color }}>
                  <i className={`fa-solid ${CATEGORY_CONFIG[m.amenity]?.faIcon}`} aria-hidden="true"></i>
                  {CATEGORY_CONFIG[m.amenity]?.label}
                </div>
                <strong className="popup-name">{m.name}</strong>
                <div className="popup-distance">
                  <i className="fa-solid fa-route" aria-hidden="true"></i> {formatDistance(m.dist)} away
                </div>
                <a
                  href={`https://maps.google.com/dir/?api=1&destination=${m.lat},${m.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="popup-navigate-btn"
                  aria-label={`Navigate to ${m.name}`}
                >
                  <i className="fa-solid fa-diamond-turn-right" aria-hidden="true"></i> Navigate
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Result count badge */}
      {markers.length > 0 && !loading && (
        <div className="map-results-badge" role="status">
          <i className={`fa-solid ${CATEGORY_CONFIG[activeFilter]?.faIcon}`} aria-hidden="true"></i>
          {markers.length} {CATEGORY_CONFIG[activeFilter]?.label}s found nearby
        </div>
      )}
    </div>
  );
}
