import { useState, useRef, useEffect } from 'react';
import './App.css';
import ChatBot from './components/ChatBot';
import HelplineSearch from './components/HelplineSearch';
import MapView from './components/MapView';
import SOSButton from './components/SOSButton';
import Settings from './components/Settings';
import FakeCall from './components/FakeCall';
import Calculator from './components/Calculator';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';
import PrivacyPolicy from './components/PrivacyPolicy';
import ErrorBoundary from './components/ErrorBoundary';
import Onboarding from './components/Onboarding';
import SOSPage from './components/SOSPage';
import ChatHistory from './components/ChatHistory';
import Toast, { showToast } from './components/Toast';
import { generateCSRFToken } from './utils/csrf';
import { createSession, resetInactivityTimer } from './utils/session';

function App() {
  const [isRegistered, setIsRegistered] = useState(localStorage.getItem('novi_registered') === 'true');

  useEffect(() => {
    generateCSRFToken()
    createSession()
    
    // Reset timer on user activity
    const events = ['click', 'keypress', 'scroll', 'touchstart']
    const handleActivity = () => resetInactivityTimer()
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })
    
    // Listen for session expiry
    const handleSessionExpired = () => {
      showToast('Session expired for your security. Please refresh.')
    }
    window.addEventListener('novi_session_expired', handleSessionExpired)
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      window.removeEventListener('novi_session_expired', handleSessionExpired)
    }
  }, [])
  const [activeTab, setActiveTab] = useState('chat');
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'system', text: 'NOVI AI Navigator active. State your emergency or request assistance.' }
  ]);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [calculatorMode, setCalculatorMode] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [longPressFakeCall, setLongPressFakeCall] = useState(
    localStorage.getItem('novi_longpress_fakecall') === 'true'
  );
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(
    localStorage.getItem('novi_voice_output') !== 'false'
  );

  const longPressTimer = useRef(null);

  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('novi_longpress_fakecall', longPressFakeCall.toString());
  }, [longPressFakeCall]);

  useEffect(() => {
    localStorage.setItem('novi_voice_output', voiceOutputEnabled.toString());
  }, [voiceOutputEnabled]);

  // Long press handlers for fake call trigger
  const handleLongPressStart = (e) => {
    if (!longPressFakeCall || showFakeCall || calculatorMode) return;
    // Avoid triggering on interactive elements
    const tag = e.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag) || e.target.closest('button, a, input, textarea, select, .toggle-switch')) return;
    longPressTimer.current = setTimeout(() => {
      setShowFakeCall(true);
    }, 5000);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Clear temporary app-level message history state if anonymousMode is toggled on
  useEffect(() => {
    if (anonymousMode) {
      setChatMessages([
        { sender: 'system', text: 'NOVI AI Navigator active. State your emergency or request assistance.' }
      ]);
    }
  }, [anonymousMode]);

  const handleAnonymousModeChange = (value) => {
    setAnonymousMode(value);
    showToast(
      value ? 'Anonymous mode on' : 'Anonymous mode off',
      value ? 'info' : 'warning'
    );
  };

  const handleTap = () => {
    tapCount.current++;
    if (tapCount.current === 3) {
      setCalculatorMode(true);
      tapCount.current = 0;
    }
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 1000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ErrorBoundary>
            <ChatBot anonymousMode={anonymousMode} setActiveTab={setActiveTab} voiceOutputEnabled={voiceOutputEnabled} />
          </ErrorBoundary>
        );

      case 'helplines':
        return (
          <ErrorBoundary>
            <HelplineSearch />
          </ErrorBoundary>
        );

      case 'map':
        return (
          <ErrorBoundary>
            <MapView anonymousMode={anonymousMode} />
          </ErrorBoundary>
        );

      case 'sos':
        return (
          <ErrorBoundary>
            <SOSPage />
          </ErrorBoundary>
        );

      case 'settings':
        return (
          <ErrorBoundary>
            <Settings 
              setShowFakeCall={setShowFakeCall} 
              anonymousMode={anonymousMode}
              setAnonymousMode={handleAnonymousModeChange}
              setActiveTab={setActiveTab}
              longPressFakeCall={longPressFakeCall}
              setLongPressFakeCall={setLongPressFakeCall}
              voiceOutputEnabled={voiceOutputEnabled}
              setVoiceOutputEnabled={setVoiceOutputEnabled}
            />
          </ErrorBoundary>
        );
      
      case 'history':
        return (
          <ErrorBoundary>
            <ChatHistory anonymousMode={anonymousMode} />
          </ErrorBoundary>
        );

      case 'privacy':
        return (
          <ErrorBoundary>
            <PrivacyPolicy setActiveTab={setActiveTab} />
          </ErrorBoundary>
        );

      default:
        return null;
    }
  };

  if (calculatorMode) {
    return <Calculator setCalculatorMode={setCalculatorMode} anonymousMode={anonymousMode} />;
  }

  if (!isRegistered) {
    return (
      <div className="app-container" style={{ paddingBottom: 0 }}>
        <Onboarding onComplete={() => setIsRegistered(true)} />
      </div>
    );
  }

  return (
    <div
      className="app-container"
      onClick={handleTap}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onTouchCancel={handleLongPressEnd}
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
    >
      <OfflineBanner />
      <header className="app-header">
        <div className="logo-container">
          <i 
            className="fa-solid fa-shield-halved animate-shield" 
            aria-hidden="true"
            style={{ color: anonymousMode ? 'var(--success)' : 'var(--red)', fontSize: '1.25rem' }}
          ></i>
          <span className="logo-text">NO<span>VI</span></span>
        </div>
        <div className="status-badge">
          <i className={anonymousMode ? 'fa-solid fa-user-secret' : 'fa-solid fa-circle-check'} aria-hidden="true"></i>
          <span>{anonymousMode ? 'Anonymous Mode Active' : 'Secure Mode'}</span>
        </div>
      </header>

      <main className="app-content">
        {renderContent()}
      </main>

      {/* SOS button is always visible on every page */}
      <ErrorBoundary>
        <SOSButton />
      </ErrorBoundary>
      <InstallPrompt />
      <Toast />

      {activeTab !== 'sos' && (
        <button
          className="sos-floating"
          onClick={() => setActiveTab('sos')}
          aria-label="Activate SOS emergency alert"
        >
          <span>SOS</span>
        </button>
      )}

      <nav className="bottom-nav" aria-label="Main navigation">
        <button 
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          aria-label="Open chat"
          aria-current={activeTab === 'chat' ? 'page' : undefined}
        >
          <i className="fa-solid fa-comments" aria-hidden="true"></i>
          <span className="nav-label">Chat</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'helplines' ? 'active' : ''}`}
          onClick={() => setActiveTab('helplines')}
          aria-label="Open helplines"
          aria-current={activeTab === 'helplines' ? 'page' : undefined}
        >
          <i className="fa-solid fa-phone" aria-hidden="true"></i>
          <span className="nav-label">Helplines</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
          aria-label="Open map"
          aria-current={activeTab === 'map' ? 'page' : undefined}
        >
          <i className="fa-solid fa-map-location-dot" aria-hidden="true"></i>
          <span className="nav-label">Map</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'sos' ? 'active' : ''} sos-tab`}
          onClick={() => setActiveTab('sos')}
          aria-label="Activate SOS"
          aria-current={activeTab === 'sos' ? 'page' : undefined}
        >
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
          <span className="nav-label">SOS</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'settings' || activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          aria-label="Open settings"
          aria-current={activeTab === 'settings' || activeTab === 'privacy' ? 'page' : undefined}
        >
          <i className="fa-solid fa-gear" aria-hidden="true"></i>
          <span className="nav-label">Settings</span>
        </button>
      </nav>

      {showFakeCall && <FakeCall setShowFakeCall={setShowFakeCall} />}
    </div>
  );
}

export default App;
