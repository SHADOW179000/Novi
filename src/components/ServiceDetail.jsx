import { useState, useEffect } from 'react';

/* ─── Helpline numbers per service ─── */
const HELPLINES = {
  police: '100', fire: '101', medical: '108', disaster: '1070',
  woman: '181', child: '1098', elderly: '14567', railway: '139',
  cyber: '1930', road: '1073', gas: '1906', mental: '9152987821'
};

/* ─── Overpass API queries per service ─── */
const OVERPASS_QUERIES = {
  police:   (lat, lon) => `[out:json];node["amenity"="police"](around:3000,${lat},${lon});out 5;`,
  fire:     (lat, lon) => `[out:json];node["amenity"="fire_station"](around:3000,${lat},${lon});out 5;`,
  medical:  (lat, lon) => `[out:json];(node["amenity"="hospital"](around:3000,${lat},${lon});node["amenity"="clinic"](around:3000,${lat},${lon}););out 5;`,
  disaster: (lat, lon) => `[out:json];node["amenity"="hospital"](around:3000,${lat},${lon});out 5;`,
  woman:    (lat, lon) => `[out:json];node["amenity"="police"](around:3000,${lat},${lon});out 5;`,
  child:    (lat, lon) => `[out:json];node["amenity"="police"](around:3000,${lat},${lon});out 5;`,
  elderly:  (lat, lon) => `[out:json];node["amenity"="hospital"](around:3000,${lat},${lon});out 5;`,
  railway:  (lat, lon) => `[out:json];node["railway"="station"](around:5000,${lat},${lon});out 5;`,
  cyber:    (lat, lon) => `[out:json];node["amenity"="police"](around:3000,${lat},${lon});out 5;`,
  road:     (lat, lon) => `[out:json];node["amenity"="hospital"](around:3000,${lat},${lon});out 5;`,
  gas:      (lat, lon) => `[out:json];node["amenity"="fire_station"](around:3000,${lat},${lon});out 5;`,
  mental:   (lat, lon) => `[out:json];node["amenity"="hospital"](around:3000,${lat},${lon});out 5;`,
};

/* ─── Checklists per service ─── */
const CHECKLISTS = {
  police: [
    'Call 100 immediately',
    'Stay in a safe location',
    'Do not confront the suspect',
    'Note suspect description and vehicle number',
    'Do not touch anything at crime scene',
    'File FIR - keep complaint number safe',
    'Contact a trusted person immediately'
  ],
  fire: [
    'Call 101 immediately',
    'Alert everyone - shout FIRE FIRE FIRE',
    'Leave building NOW - use stairs not lift',
    'Crawl low under smoke to exit',
    'Close all doors behind you to slow fire',
    'Do NOT go back inside for any reason',
    'Meet at safe assembly point outside',
    'Account for all family members'
  ],
  medical: [
    'Call 108 immediately - stay on line',
    'Keep patient still - do not move them',
    'Do NOT give food or water to patient',
    'Loosen tight clothing around neck and chest',
    'Note exact symptoms and when they started',
    'Note all medicines patient takes',
    'Keep patient awake and talking if conscious',
    'Clear path for ambulance to reach you'
  ],
  disaster: [
    'Call 112 immediately',
    'Move to higher ground if flooding',
    'Stay inside strong building if cyclone or storm',
    'Do NOT touch electrical switches or wires',
    'Follow ONLY official government announcements',
    'Stock water bottles and medicines immediately',
    'Keep important documents in waterproof bag',
    'Contact family to inform your location'
  ],
  woman: [
    'Call 181 or 1091 immediately',
    'Move to nearest crowded public place NOW',
    'Call police 100 if in immediate physical danger',
    'Share live location with trusted contact right now',
    'Go to nearest police station for FIR',
    'Preserve all evidence - messages photos calls',
    'Do not delete any threatening messages',
    'Contact NGO or shelter if needed'
  ],
  child: [
    'Call 1098 Childline immediately',
    'Note exact last seen location and time',
    'Collect recent clear photograph of child',
    'Contact nearest police station immediately',
    'File missing person FIR - get copy',
    'Check nearby hospitals and shelters',
    'Do NOT post on social media without police advice',
    'Inform neighbours and local shop owners'
  ],
  elderly: [
    'Call 14567 Senior Citizens Helpline',
    'Ensure elderly person is physically safe',
    'Check for injuries - do not move if fallen badly',
    'Call 108 if medical attention needed',
    'Contact family members immediately',
    'Note any medications they need urgently',
    'Stay with elderly person - do not leave alone',
    'Contact local police if elder is missing'
  ],
  railway: [
    'Call Railway helpline 139 immediately',
    'Call 108 if medical emergency in train',
    'Note train number and coach number exactly',
    'Note exact station or kilometer marker',
    'Alert railway staff or TTE immediately',
    'Pull emergency chain ONLY if train is moving and life at risk',
    'Do not block emergency exits',
    'Help other passengers calmly'
  ],
  cyber: [
    'Call 1930 Cybercrime helpline NOW',
    'Do NOT share any more OTPs or passwords',
    'Call your bank immediately to block all cards',
    'Screenshot every transaction and conversation',
    'Do NOT transfer any more money to anyone',
    'File complaint at cybercrime.gov.in',
    'Note all phone numbers and account numbers used',
    'File FIR at nearest police station'
  ],
  road: [
    'Call 108 for ambulance immediately',
    'Call 100 for police',
    'Switch on vehicle hazard warning lights',
    'Warn oncoming traffic with cloth or waving',
    'Do NOT move seriously injured person',
    'Note offender vehicle number immediately',
    'Take photos of accident scene if safe',
    'Get witness contact details',
    'Do not flee scene - it is a legal requirement'
  ],
  gas: [
    'Do NOT switch ON or OFF any electrical switches',
    'Do NOT use mobile phone inside building',
    'Extinguish ALL flames immediately',
    'Turn off gas valve or regulator if safe to reach',
    'Open all windows and doors fully',
    'Evacuate all people from building NOW',
    'Call from outside building only - call 101',
    'Do not re-enter until fire brigade declares safe'
  ],
  mental: [
    'Call iCall 9152987821 - they will listen without judgement',
    'You are not alone - help is available right now',
    'Move away from any potentially harmful objects',
    'Contact one trusted person and stay with them',
    'Do not make any major decisions right now',
    'Go to nearest hospital emergency if feeling unsafe',
    'Breathing exercise: inhale 4 counts hold 4 exhale 4',
    'Remember: this feeling will pass with support'
  ]
};

/* ─── Haversine distance in metres ─── */
function getDistanceMetres(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLam = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ═══════════════════════════════════════════════════════════
   ServiceDetail Component
   ═══════════════════════════════════════════════════════════ */
export default function ServiceDetail({ service, onBack, onClose }) {
  const [coords, setCoords] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locError, setLocError] = useState(null);
  const [checked, setChecked] = useState([]);

  const checklist = CHECKLISTS[service.id] || [];
  const helpline = HELPLINES[service.id] || '112';

  /* initialise checklist */
  useEffect(() => {
    setChecked(new Array(checklist.length).fill(false));
  }, [service.id, checklist.length]);

  /* get GPS */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => { setLocError('Location access denied'); setLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /* fetch nearby places */
  useEffect(() => {
    if (!coords) return;
    const queryFn = OVERPASS_QUERIES[service.id];
    if (!queryFn) { setLoading(false); return; }

    fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: queryFn(coords.lat, coords.lon),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Overpass API error');
        return res.json();
      })
      .then((data) => {
        const results = (data.elements || [])
          .map((el) => ({
            name: el.tags?.name || el.tags?.['name:en'] || `${service.label} Station`,
            lat: el.lat,
            lon: el.lon,
            distance: Math.round(getDistanceMetres(coords.lat, coords.lon, el.lat, el.lon)),
            phone: el.tags?.phone || el.tags?.['contact:phone'],
          }))
          .sort((a, b) => a.distance - b.distance);
        setPlaces(results);
        setLoading(false);
      })
      .catch(() => {
        setLocError('Could not load nearby locations');
        setLoading(false);
      });
  }, [coords, service.id, service.label]);

  /* toggle checklist item */
  const toggleCheck = (index) => {
    const next = [...checked];
    next[index] = !next[index];
    setChecked(next);
  };

  /* progress */
  const doneCount = checked.filter(Boolean).length;
  const progress = checked.length > 0 ? Math.round((doneCount / checked.length) * 100) : 0;
  const progressColor = progress < 34 ? 'var(--red)' : progress < 67 ? '#F59E0B' : 'var(--success)';
  const allChecked = checked.length > 0 && checked.every(Boolean);

  /* format distance */
  const fmtDist = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

  return (
    <div className="service-detail-overlay">
      {/* Header */}
      <div className="sd-header">
        <button className="sd-back-btn" onClick={onBack} aria-label="Back to services">
          <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
        </button>
        <div className="sd-title">
          <i className={`fa-solid ${service.icon}`} aria-hidden="true" style={{ color: 'var(--red)' }}></i>
          <span>{service.label} Emergency</span>
        </div>
        <button className="sd-close-btn" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div className="sd-scroll">
        {/* ── Location Bar ── */}
        <div className="sd-location-card">
          <div className="sd-location-row">
            <i className="fa-solid fa-location-dot" aria-hidden="true" style={{ color: 'var(--blue)', fontSize: '1.1rem' }}></i>
            <span>
              {coords
                ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
                : 'Finding your location...'}
            </span>
          </div>
          {coords && (
            <span className="sd-live-badge">
              <i className="fa-solid fa-circle" aria-hidden="true"></i> Live Location Active
            </span>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="sd-loading">
            <div className="map-spinner"></div>
            <p>Finding nearest {service.label.toLowerCase()} help...</p>
          </div>
        )}

        {/* ── Error ── */}
        {locError && !loading && (
          <div className="sd-error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {locError}
          </div>
        )}

        {/* ── Nearby Places ── */}
        {!loading && places.length > 0 && (
          <div className="sd-nearby">
            <h4 className="sd-section-title">
              <i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i> Nearby {service.label} Services
            </h4>
            {places.map((place, i) => (
              <div key={i} className="sd-nearby-card">
                <div className="sd-nearby-info">
                  <strong>{place.name}</strong>
                  <span className="sd-nearby-dist">
                    <i className="fa-solid fa-route" aria-hidden="true"></i> {fmtDist(place.distance)} away
                  </span>
                </div>
                <div className="sd-nearby-actions">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="sd-nav-btn"
                  >
                    <i className="fa-solid fa-diamond-turn-right" aria-hidden="true"></i> Navigate
                  </a>
                  <a href={`tel:${place.phone || helpline}`} className="sd-call-btn">
                    <i className="fa-solid fa-phone" aria-hidden="true"></i> Call
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && places.length === 0 && !locError && (
          <div className="sd-no-results">
            <i className="fa-solid fa-map-location-dot" aria-hidden="true" style={{ fontSize: '2rem', opacity: 0.4 }}></i>
            <p>No nearby places found within 3 km</p>
          </div>
        )}

        {/* ── Helpline Card ── */}
        <div className="sd-helpline-card">
          <div className="sd-helpline-info">
            <span className="sd-helpline-label">
              <i className={`fa-solid ${service.icon}`} aria-hidden="true"></i> {service.label} Helpline
            </span>
            <span className="sd-helpline-number">{helpline}</span>
          </div>
          <div className="sd-helpline-actions">
            <a href={`tel:${helpline}`} className="sd-helpline-call">
              <i className="fa-solid fa-phone" aria-hidden="true"></i> Call Now
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `EMERGENCY! I need ${service.label} help.\nMy location: ${
                  coords ? `https://maps.google.com/?q=${coords.lat},${coords.lon}` : 'Unknown'
                }\nPlease call me immediately!\nSent via NOVI Emergency App`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="sd-helpline-share"
            >
              <i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Share Location
            </a>
          </div>
        </div>

        {/* ── Checklist ── */}
        {checklist.length > 0 && (
          <div className="sd-checklist">
            <h4 className="sd-section-title">
              <i className="fa-solid fa-list-check" aria-hidden="true"></i> Immediate Steps - {service.label}
            </h4>

            {/* Progress Bar */}
            <div className="sd-progress-wrap">
              <div className="sd-progress-track">
                <div
                  className="sd-progress-fill"
                  style={{ width: `${progress}%`, backgroundColor: progressColor }}
                ></div>
              </div>
              <span className="sd-progress-text" style={{ color: progressColor }}>
                {progress}% completed
              </span>
            </div>

            {/* Items */}
            <div className="sd-checklist-items">
              {checklist.map((step, i) => (
                <label key={i} className={`sd-check-item ${checked[i] ? 'sd-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked[i] || false}
                    onChange={() => toggleCheck(i)}
                    className="sd-check-input"
                  />
                  <span className="sd-check-icon">
                    <i className={`fa-solid ${checked[i] ? 'fa-square-check' : 'fa-square'}`} aria-hidden="true"></i>
                  </span>
                  <span className="sd-check-text">{step}</span>
                </label>
              ))}
            </div>

            {/* All done message */}
            {allChecked && (
              <div className="sd-all-done">
                <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                <p>Stay safe. Help is on the way.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
