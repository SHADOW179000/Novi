import { useState, useEffect, useRef } from 'react';
import { showToast } from './Toast';
import { encryptedRetrieve } from '../utils/encryption';
import LoadingSpinner from './LoadingSpinner';

export default function SOSPage() {
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

  // Get GPS on mount
  useEffect(() => {
    if (!coords) {
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
    return () => clearInterval(timerRef.current);
  }, []);

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
      showToast('No emergency contacts found. Please add them in Settings.', 'error');
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
    
    // Attempt to open all contacts (browsers may block multiple popups)
    // Attempt to open all contacts (browsers will likely block all but the first)
    contacts.forEach((contact, index) => {
      const phone = contact.phone.replace(/\D/g, '');
      const url = `https://wa.me/91${phone}?text=${msg}`;
      // Adding a slight delay might help some browsers, but fallback buttons are needed
      setTimeout(() => {
        window.open(url, '_blank');
      }, index * 300);
    });

    setSent(true);
    showToast('SOS sent to contacts', 'success');
  };

  return (
    <div className="sos-page-container">
      <h2 className="screen-title" style={{ justifyContent: 'center' }}>
        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" style={{ color: 'var(--red)' }}></i> Emergency SOS
      </h2>
      
      {gpsLoading && (
        <LoadingSpinner message="Getting your location..." />
      )}
      
      {coords && !gpsLoading && (
        <p className="sos-sheet-subtitle" style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--success)' }}>
          <i className="fa-solid fa-location-dot" aria-hidden="true"></i> Location Acquired
        </p>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="sos-countdown-overlay" style={{ position: 'relative', background: 'transparent', zIndex: 10 }} role="alert">
          <h3 style={{ marginBottom: '10px' }}>Sending SOS to:</h3>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '20px', textAlign: 'center' }}>
            {contacts.map((c, i) => <li key={i} style={{ color: 'var(--blue)' }}>{c.name}</li>)}
          </ul>
          <div className="sos-countdown-ring">
            <span className="sos-countdown-number">{countdown}</span>
          </div>
          <button className="sos-cancel-btn mt-4" onClick={cancelCountdown} aria-label="Cancel SOS countdown">
            <i className="fa-solid fa-ban" aria-hidden="true"></i> Cancel
          </button>
        </div>
      )}

      {/* Success State */}
      {sent && countdown === null && (
        <div className="sos-success-banner" style={{ margin: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }} role="status">
          <i className="fa-solid fa-circle-check" aria-hidden="true" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
          <h3 style={{ margin: 0, marginBottom: '10px' }}>SOS Alert Dispatched</h3>
          <span style={{ textAlign: 'center', marginBottom: '15px' }}>If your browser blocked the WhatsApp windows, tap the buttons below to send manually:</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '250px' }}>
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

      {/* Main Trigger */}
      {countdown === null && !sent && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="placeholder-text" style={{ marginBottom: '40px', maxWidth: '300px', textAlign: 'center' }}>
            Tap the button below to instantly alert your emergency contacts with your live location.
          </p>
          <button className="sos-trigger" onClick={startCountdown} aria-label="Activate SOS emergency alert">
            <i className="fa-solid fa-hand-pointer" aria-hidden="true"></i>
            <span>ACTIVATE</span>
          </button>
          
          <div className="sos-contacts-preview mt-4" style={{ backgroundColor: 'var(--card)', padding: '15px', borderRadius: '10px', width: '100%', maxWidth: '300px' }}>
            <h4 style={{ margin: 0, marginBottom: '10px', fontSize: '0.9rem', color: 'var(--gray)' }}>Notifying Contacts:</h4>
            {contacts.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {contacts.map((c, i) => (
                  <li key={i} style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                    <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', marginRight: '8px' }} aria-hidden="true"></i> {c.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--red)' }}>No contacts set!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
