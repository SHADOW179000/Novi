import { useState, useEffect, useRef } from 'react';
import { showToast } from './Toast';
import { encryptedRetrieve } from '../utils/encryption';
import LoadingSpinner from './LoadingSpinner';

export default function SOSButton() {
  const [open, setOpen]           = useState(false);
  const [coords, setCoords]       = useState(null);
  const [countdown, setCountdown] = useState(null); // null | 3 | 2 | 1
  const [sent, setSent]           = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const timerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [medical, setMedical] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const u = await encryptedRetrieve('user');
      const c = await encryptedRetrieve('contacts');
      const m = await encryptedRetrieve('medical_profile');
      if (u) setUser(u);
      if (c) setContacts(c);
      if (m) setMedical(m);
    };
    loadData();
  }, []);
  
  const coordsRef = useRef(null);
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  // Get GPS when sheet opens
  useEffect(() => {
    if (open && !coords) {
      setGpsLoading(true);
      navigator.geolocation?.getCurrentPosition(
        (p) => {
          setCoords({ lat: p.coords.latitude, lon: p.coords.longitude });
          setGpsLoading(false);
        },
        () => {
          setCoords(null);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [open]);

  // Cleanup countdown on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const buildMessage = () => {
    const time = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    const currentCoords = coordsRef.current;
    const locStr = currentCoords
      ? `https://maps.google.com/?q=${currentCoords.lat},${currentCoords.lon}`
      : 'Location unavailable';
    
    const userName = user?.name || 'User';
    
    let msg = `EMERGENCY SOS from ${userName}!\nI need immediate help right now!\nMy live location:\n${locStr}\nTime: ${time}`;
    
    if (medical) {
      const hasMedInfo = medical.bloodGroup || medical.allergies || medical.conditions || medical.medications;
      if (hasMedInfo) {
        msg += `\n\nMEDICAL INFORMATION:`;
        msg += `\n• Blood Group: ${medical.bloodGroup || 'Unknown'}`;
        msg += `\n• Allergies: ${medical.allergies || 'None'}`;
        msg += `\n• Conditions: ${medical.conditions || 'None'}`;
        msg += `\n• Medications: ${medical.medications || 'None'}`;
      }
      if (medical.docName) {
        msg += `\n• Emergency Doctor: ${medical.docName}${medical.docPhone ? ` (${medical.docPhone})` : ''}`;
      }
    }
    
    msg += `\nPlease call me immediately!\nSent via NOVI Emergency App`;
    return msg;
  };

  const startCountdown = () => {
    if (contacts.length === 0) {
      showToast('No emergency contacts found.', 'error');
      return;
    }
    setSent(false);
    setCountdown(3);

    let tick = 3;
    timerRef.current = setInterval(() => {
      tick -= 1;
      if (tick <= 0) {
        clearInterval(timerRef.current);
        setCountdown(null);
        executeAction();
      } else {
        setCountdown(tick);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    clearInterval(timerRef.current);
    setCountdown(null);
  };

  const executeAction = () => {
    // Vibrate if available
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);

    const msg = encodeURIComponent(buildMessage());
    
    contacts.forEach((contact, index) => {
      const phone = contact.phone.replace(/\D/g, '');
      const url = `https://wa.me/91${phone}?text=${msg}`;
      setTimeout(() => {
        window.open(url, '_blank');
      }, index * 300);
    });

    setSent(true);
    showToast('SOS sent to contacts', 'success');
  };

  const handleSOSPress = () => {
    if (navigator.vibrate) navigator.vibrate([100]);
    setSent(false);
    setOpen(true);
    // Start countdown immediately when FAB is pressed
    setTimeout(() => {
      startCountdown();
    }, 500); // Small delay to let bottom sheet open
  };

  const handleClose = () => {
    cancelCountdown();
    setOpen(false);
    setSent(false);
  };

  return (
    <>
      {/* Fixed pulsing SOS button */}
      <button
        className="sos-fab"
        onClick={handleSOSPress}
        aria-label="Send SOS emergency alert"
        id="sos-fab-btn"
      >
        <i className="fa-solid fa-triangle-exclamation sos-fab-icon" aria-hidden="true"></i>
        <span className="sos-fab-label">SOS</span>
        <span className="sos-fab-pulse-ring" aria-hidden="true"></span>
      </button>

      {/* Backdrop */}
      {open && <div className="sos-backdrop" onClick={handleClose} aria-hidden="true"></div>}

      {/* Bottom Sheet */}
      {open && (
        <div className={`sos-bottom-sheet ${open ? 'open' : ''}`} role="dialog" aria-label="Emergency SOS panel">
          <div className="sos-sheet-handle" aria-hidden="true"></div>

          {/* Header */}
          <div className="sos-sheet-header">
            <div className="sos-header-icon-wrap">
              <i className="fa-solid fa-circle-exclamation sos-header-icon" aria-hidden="true"></i>
            </div>
            <div>
              <h3 className="sos-sheet-title">Emergency SOS</h3>
              <p className="sos-sheet-subtitle">
                {gpsLoading
                  ? 'Obtaining your GPS location...'
                  : coords
                    ? `GPS obtained: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
                    : 'GPS location unavailable'}
              </p>
            </div>
            <button className="sos-close-btn" onClick={handleClose} aria-label="Close SOS panel">
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>

          {/* GPS Loading Spinner */}
          {gpsLoading && (
            <LoadingSpinner message="Getting your location..." />
          )}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="sos-countdown-overlay" role="alert">
              <h3 style={{ marginBottom: '10px' }}>Sending SOS to:</h3>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px', textAlign: 'center' }}>
                {contacts.map((c, i) => <li key={i} style={{ color: 'var(--blue)' }}>{c.name}</li>)}
              </ul>
              <div className="sos-countdown-ring">
                <span className="sos-countdown-number">{countdown}</span>
              </div>
              <button className="sos-cancel-btn mt-4" onClick={handleClose} aria-label="Cancel SOS countdown">
                <i className="fa-solid fa-ban" aria-hidden="true"></i> Cancel
              </button>
            </div>
          )}

          {/* Success State */}
          {sent && countdown === null && (
            <div className="sos-success-banner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px' }} role="status">
              <i className="fa-solid fa-circle-check" aria-hidden="true" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
              <span style={{ textAlign: 'center', marginBottom: '15px' }}>If your browser blocked the WhatsApp windows, tap the buttons below to send manually:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                {contacts.map((contact, i) => {
                  const phone = contact.phone.replace(/\D/g, '');
                  const url = `https://wa.me/91${phone}?text=${encodeURIComponent(buildMessage())}`;
                  return (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="onboarding-btn primary-btn" style={{ textDecoration: 'none', padding: '10px', fontSize: '0.9rem', backgroundColor: '#25D366' }} aria-label={`Send manual SOS to ${contact.name}`}>
                      <i className="fa-brands fa-whatsapp" aria-hidden="true"></i> Send to {contact.name}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback if no contacts */}
          {contacts.length === 0 && countdown === null && !sent && (
            <div className="sos-actions" style={{ textAlign: 'center' }}>
              <p className="sos-action-label" style={{ color: 'var(--red)' }}>No emergency contacts registered!</p>
              <p className="sos-call-reminder">
                <i className="fa-solid fa-phone" aria-hidden="true"></i> In life-threatening emergencies, call <strong>112</strong> immediately.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
