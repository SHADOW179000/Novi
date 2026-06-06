import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { getCSRFToken } from '../utils/csrf';
import { encryptedStore, encryptedRetrieve } from '../utils/encryption';
import { detectPromptInjection, sanitizeForAI } from '../utils/promptSecurity';
import { monitor } from '../utils/securityMonitor';
import { speakResponse } from '../utils/speech';
import StepChecklist from './StepChecklist';
import MiniLeafletMap from './MiniLeafletMap';
import ServicesPanel from './ServicesPanel';
import LoadingSpinner from './LoadingSpinner';
import { showToast } from './Toast';

const languages = [
  { label: 'English', code: 'en-IN' },
  { label: 'Hindi', code: 'hi-IN' },
  { label: 'Tamil', code: 'ta-IN' },
  { label: 'Telugu', code: 'te-IN' },
  { label: 'Kannada', code: 'kn-IN' },
  { label: 'Bengali', code: 'bn-IN' },
  { label: 'Marathi', code: 'mr-IN' }
];

// Helper to calculate distance in km using Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* Call Button Component */
const CallButton = ({ number, label }) => {
  if (!number) return null;
  const formattedLabel = label
    ? label.replace(/_/g, ' ').toUpperCase()
    : 'EMERGENCY';
  return (
    <a href={`tel:${number}`} className="call-button-link">
      <button className="call-button-green" type="button">
        <i className="fa-solid fa-phone-flip" aria-hidden="true"></i>
        <span>Call {formattedLabel}: {number}</span>
      </button>
    </a>
  );
};

/* Chat Map Card Component */
const ChatMapCard = ({ emergencyType, userLocation, nearestPlace, loading, error, openFullMap }) => {
  const amenityMap = {
    medical: 'hospital',
    police: 'police',
    fire: 'fire_station',
    women: 'police',
    women_safety: 'police',
    road: 'hospital',
    road_accident: 'hospital',
    disaster: 'shelter'
  };

  const amenity = amenityMap[emergencyType];
  if (!amenity || !userLocation) return null;

  const amenityLabel = amenity.replace(/_/g, ' ');

  return (
    <div className="chat-map-card">
      {loading && (
        <div className="chat-map-status">
          <div className="chat-map-spinner"></div>
          <p>Finding nearest {amenityLabel} near you...</p>
        </div>
      )}

      {error && (
        <div className="chat-map-error text-danger">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {error}
        </div>
      )}

      {nearestPlace && (
        <div className="chat-map-info">
          <p className="nearest-place-text">
            <strong>Nearest {amenityLabel}:</strong> {nearestPlace.name} (<strong>{nearestPlace.distance} km</strong> away)
          </p>
          <div className="chat-map-actions">
            <a
              href={`https://maps.google.com/dir/?api=1&destination=${nearestPlace.lat},${nearestPlace.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-map-action-btn navigate-btn"
            >
              <i className="fa-solid fa-diamond-turn-right" aria-hidden="true"></i> Navigate
            </a>

            <a
              href={`tel:${nearestPlace.phone || '112'}`}
              className="chat-map-action-btn call-btn"
            >
              <i className="fa-solid fa-phone" aria-hidden="true"></i> Call
            </a>
          </div>
        </div>
      )}

      <div className="chat-mini-map-container">
        <MiniLeafletMap
          center={userLocation}
          nearestPlace={nearestPlace}
          amenity={amenity}
        />
      </div>

      <button
        type="button"
        className="chat-map-full-btn"
        onClick={openFullMap}
      >
        <i className="fa-solid fa-expand" aria-hidden="true"></i> View Full Map
      </button>
    </div>
  );
};

function ChatBot({ anonymousMode, setActiveTab, voiceOutputEnabled }) {
  const [messages, setMessages] = useState([
    {
      id: 'initial',
      sender: 'ai',
      text: anonymousMode
        ? 'NOVI AI Navigator active (Anonymous Mode Active). State your emergency or request assistance.'
        : 'NOVI AI Navigator active. State your emergency or request assistance.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 'HIGH',
      verified: true,
      helpline: '112',
      steps: ['Stay calm', 'Identify your emergency type', 'Select your preferred language above'],
      emotion: 'CALM',
      userLocation: null,
      nearestPlace: null,
      loadingNearest: false,
      nearestError: null
    }
  ]);

  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [emotion, setEmotion] = useState('CALM');
  const [showServices, setShowServices] = useState(false);

  // Reset message history when anonymousMode is toggled
  useEffect(() => {
    setMessages([
      {
        id: 'initial',
        sender: 'ai',
        text: anonymousMode
          ? 'NOVI AI Navigator active (Anonymous Mode Active). State your emergency or request assistance.'
          : 'NOVI AI Navigator active. State your emergency or request assistance.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 'HIGH',
        verified: true,
        helpline: '112',
        steps: ['Stay calm', 'Identify your emergency type', 'Select your preferred language above'],
        emotion: 'CALM',
        userLocation: null,
        nearestPlace: null,
        loadingNearest: false,
        nearestError: null
      }
    ]);
  }, [anonymousMode]);

  // Voice input state
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);
  const noSpeechTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const accumulatedTextRef = useRef('');
  const lastSpeechRef = useRef('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  /* fetch location and nearest place using Overpass API */
  const fetchLocationAndNearestPlace = (msgId, emergencyType, amenity) => {
    if (!navigator.geolocation) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId
            ? { ...msg, nearestError: 'Geolocation is not supported by your browser.' }
            : msg
        )
      );
      return;
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId ? { ...msg, loadingNearest: true } : msg
      )
    );

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const userLoc = { lat, lon };

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId ? { ...msg, userLocation: userLoc } : msg
          )
        );

        try {
          let queryBody = '';
          if (amenity === 'shelter') {
            queryBody = `[out:json];(node["amenity"="shelter"](around:5000,${lat},${lon});node["emergency"="assembly_point"](around:5000,${lat},${lon}););out 1;`;
          } else {
            queryBody = `[out:json];node["amenity"="${amenity}"](around:5000,${lat},${lon});out 1;`;
          }

          const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: queryBody,
          });

          if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
          const osmData = await res.json();
          const element = osmData.elements?.[0];

          if (element) {
            const name = element.tags?.name || element.tags?.['name:en'] || `Nearest ${amenity.replace('_', ' ')}`;
            const dist = getDistanceMetres(lat, lon, element.lat, element.lon) / 1000;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === msgId
                  ? {
                      ...msg,
                      nearestPlace: {
                        name,
                        distance: dist.toFixed(1),
                        lat: element.lat,
                        lon: element.lon,
                        phone: element.tags?.phone || element.tags?.['contact:phone']
                      },
                      loadingNearest: false
                    }
                  : msg
              )
            );
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === msgId
                  ? {
                      ...msg,
                      nearestError: `No nearest ${amenity.replace('_', ' ')} found within 5 km.`,
                      loadingNearest: false
                    }
                  : msg
              )
            );
          }
        } catch (err) {
          console.error('Overpass error:', err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === msgId
                ? {
                    ...msg,
                    nearestError: 'Could not load nearby emergency locations.',
                    loadingNearest: false
                  }
                : msg
            )
          );
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === msgId
              ? {
                  ...msg,
                  nearestError: 'Location access denied or unavailable. Please allow location permissions.',
                  loadingNearest: false
                }
              : msg
          )
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* send message */
  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setVoiceError('');

    // Pre-emptively unlock Speech Synthesis on mobile WebView (user-interaction context)
    if (window.speechSynthesis) {
      try {
        const unlockUtterance = new SpeechSynthesisUtterance('');
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);
      } catch (e) {
        console.warn("Failed to unlock speech synthesis:", e);
      }
    }

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Prompt injection check
      const injectionCheck = detectPromptInjection(text);
      if (!injectionCheck.safe) {
        monitor.log('INJECTION_ATTEMPT', { input: text.substring(0, 50) });
        const warnMsg = {
          sender: 'ai',
          id: Date.now() + 1,
          text: 'Your message was flagged for safety. Please rephrase your request.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: 'HIGH',
          verified: false,
          helpline: '112',
          steps: ['Rephrase your message', 'Avoid system-level commands'],
          emotion: 'CALM',
          userLocation: null,
          nearestPlace: null,
          loadingNearest: false,
          nearestError: null
        };
        setMessages((prev) => [...prev, warnMsg]);
        setLoading(false);
        return;
      }

      const sanitizedText = sanitizeForAI(text);
      let data;

      if (window.Capacitor || window.location.protocol === 'file:') {
        // Standalone mobile app calls Gemini API directly using concatenated key
        const p1 = "";
        const p2 = "";
        const p3 = "";
        const p4 = "";
        const p5 = "";
        const apiKey = p1 + p2 + p3 + p4 + p5;

        const systemPrompt = `You are NOVI, AI Emergency Navigator for Indian citizens.
Respond in EXACTLY this format, no markdown, no extra text:
EMOTION: PANIC
TYPE: medical
HELPLINE: 108
CONFIDENCE: HIGH
VERIFIED: true
STEPS: 1. First step | 2. Second step | 3. Third step
RESPONSE: Your response in user language here`;

        const promptText = `${systemPrompt}\nUser Message (Language: ${selectedLanguage}): ${sanitizedText}`;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status}`);
        }

        const resData = await response.json();
        const textOut = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        const emotion = textOut.match(/EMOTION:\s*(\w+)/)?.[1] || 'CALM';
        const type = textOut.match(/TYPE:\s*(\w+)/)?.[1] || 'general';
        const helpline = textOut.match(/HELPLINE:\s*([\d\-]+)/)?.[1] || '112';
        const confidence = textOut.match(/CONFIDENCE:\s*(\w+)/)?.[1] || 'LOW';
        const verified = textOut.match(/VERIFIED:\s*(\w+)/)?.[1]?.toLowerCase() === 'true';
        const stepsRaw = textOut.match(/STEPS:\s*(.+)/)?.[1];
        const steps = stepsRaw?.split('|').map(s => s.trim()) || ['Call 112 for any emergency'];
        const aiResponse = textOut.match(/RESPONSE:\s*([\s\S]+)/)?.[1] || 'AI temporarily unavailable.';
        
        data = {
          emotion,
          type,
          helpline,
          confidence,
          verified,
          steps,
          response: aiResponse.trim()
        };
      } else {
        // Web browser client calls serverless function relatively
        const res = await axios.post('/api/chat', {
          message: sanitizedText,
          language: selectedLanguage
        }, {
          headers: {
            'X-CSRF-Token': getCSRFToken()
          }
        });
        data = res.data;
      }
      if (data.emotion) setEmotion(data.emotion);

      const aiMsgId = Date.now() + 1;
      const aiMsg = {
        sender: 'ai',
        id: aiMsgId,
        text: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emotion: data.emotion,
        type: data.type,
        helpline: data.helpline,
        confidence: data.confidence,
        verified: data.verified,
        steps: data.steps,
        userLocation: null,
        nearestPlace: null,
        loadingNearest: false,
        nearestError: null
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (voiceOutputEnabled) {
        speakResponse(data.response, selectedLanguage, data.emotion);
      }

      // Save to encrypted chat history if not anonymous
      if (!anonymousMode) {
        let history = await encryptedRetrieve('chat_history') || [];
        
        history.unshift({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          userMessage: text,
          noviResponse: data.response,
          emotion: data.emotion || 'UNKNOWN',
          helpline: data.helpline || null,
          language: selectedLanguage,
          emergencyType: data.type || 'general'
        });
        
        // Limit to 100 messages
        if (history.length > 100) {
          history = history.slice(0, 100);
        }
        
        await encryptedStore('chat_history', history);
      }

      // Check if location-based emergency
      const amenityMap = {
        medical: 'hospital',
        police: 'police',
        fire: 'fire_station',
        women: 'police',
        women_safety: 'police',
        road: 'hospital',
        road_accident: 'hospital',
        disaster: 'shelter'
      };
      const amenity = amenityMap[data.type];
      if (amenity) {
        fetchLocationAndNearestPlace(aiMsgId, data.type, amenity);
      }
    } catch (err) {
      monitor.log('API_FAILURE', { error: err?.message || 'unknown' });
      showToast('AI temporarily unavailable', 'warning');
      const errMsg = {
        sender: 'ai',
        id: Date.now() + 2,
        text: 'AI temporarily unavailable. Please call helpline directly.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: 'LOW',
        verified: false,
        helpline: '112',
        steps: ['Call 112 for any emergency'],
        emotion: 'CALM',
        userLocation: null,
        nearestPlace: null,
        loadingNearest: false,
        nearestError: null
      };
      setMessages((prev) => [...prev, errMsg]);
      setEmotion('CALM');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(inputText);
    setInputText('');
  };

  /* voice input */
  const stoppedManuallyRef = useRef(false);
  const resultReceivedRef = useRef(false);

  const clearTimers = () => {
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopAndSend = (text) => {
    stoppedManuallyRef.current = true;
    clearTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      recognitionRef.current = null;
    }
    setListening(false);

    const cleanText = text.trim();
    if (cleanText) {
      setInputText('');
      sendMessage(cleanText);
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    clearTimers();
    stoppedManuallyRef.current = false;
    resultReceivedRef.current = false;
    accumulatedTextRef.current = '';
    lastSpeechRef.current = '';
    setListening(true);
    setVoiceError('');

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = selectedLanguage;
    if (selectedLanguage === 'hi-IN') recognition.lang = 'hi-IN';
    if (selectedLanguage === 'ta-IN') recognition.lang = 'ta-IN';
    if (selectedLanguage === 'te-IN') recognition.lang = 'te-IN';
    if (selectedLanguage === 'kn-IN') recognition.lang = 'kn-IN';
    if (selectedLanguage === 'bn-IN') recognition.lang = 'bn-IN';
    if (selectedLanguage === 'mr-IN') recognition.lang = 'mr-IN';

    // Start 10-second no-speech timer (if no speech is received within 10s, close automatically)
    noSpeechTimerRef.current = setTimeout(() => {
      console.log('10s no speech timeout reached');
      stopListening();
      setVoiceError('No speech detected. Microphone turned off.');
      showToast('Could not hear you', 'error');
    }, 10000);

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      
      const currentText = transcript.trim();
      
      if (currentText) {
        // Speech detected: clear the 10-second no-speech timer
        if (noSpeechTimerRef.current) {
          clearTimeout(noSpeechTimerRef.current);
          noSpeechTimerRef.current = null;
        }

        lastSpeechRef.current = currentText;
        setInputText(currentText);

        // Start/Reset the 2.5-second silence timer (take input and close if silence for 2.5s)
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          resultReceivedRef.current = true;
          stopAndSend(lastSpeechRef.current);
        }, 2500);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Ignore native no-speech errors since we handle timeouts manually
        return;
      }
      stoppedManuallyRef.current = true;
      clearTimers();
      recognitionRef.current = null;
      setListening(false);
      showToast('Could not hear you', 'error');
      if (event.error === 'not-allowed') {
        setVoiceError('Microphone permission denied. Please enable mic access in browser settings.');
      } else if (event.error === 'audio-capture') {
        setVoiceError('No microphone found or audio capture failed.');
      } else {
        setVoiceError(`Speech error (${event.error}). Please try again.`);
      }
    };

    recognition.onend = () => {
      clearTimers();
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      clearTimers();
      setListening(false);
      recognitionRef.current = null;
    }
  };

  const stopListening = () => {
    stoppedManuallyRef.current = true;
    clearTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      recognitionRef.current = null;
    }
    setListening(false);
  };

  /* emotion border class */
  const getEmotionClass = () => {
    switch (emotion) {
      case 'PANIC': return 'border-panic';
      case 'DANGER': return 'border-danger';
      default: return 'border-calm';
    }
  };

  return (
    <div className={`chat-interface-wrapper ${getEmotionClass()}`}>

      {/* Language Pills */}
      <div className="language-selector-pills" role="group" aria-label="Language selection">
        {languages.map((lang) => (
          <button
            key={lang.code}
            className={`lang-pill ${selectedLanguage === lang.code ? 'active' : ''}`}
            onClick={() => {
              setSelectedLanguage(lang.code);
              showToast('Language changed', 'info');
            }}
            aria-label={`Select ${lang.label} language`}
            aria-pressed={selectedLanguage === lang.code}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages-scroll-area" role="log" aria-label="Chat messages" aria-live="polite">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id || index} className={`chat-message-row ${isUser ? 'user-row' : 'ai-row'}`}>
              <div className={`chat-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>

                {/* AI badge */}
                {!isUser && (
                  <div className="badge-header">
                    {msg.confidence === 'HIGH' && msg.verified ? (
                      <span className="badge verified-badge">
                        <i className="fa-solid fa-circle-check" aria-hidden="true"></i> Verified Helpline
                      </span>
                    ) : (
                      <span className="badge warning-badge">
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Unverified / General
                      </span>
                    )}
                  </div>
                )}

                {/* Text */}
                <p className="message-text">{msg.text}</p>

                {/* Steps -- always via StepChecklist */}
                {!isUser && msg.steps && msg.steps.length > 0 && (
                  <StepChecklist steps={msg.steps} />
                )}

                {/* Helpline */}
                {!isUser && (
                  <div className="helpline-indicator">
                    <i className="fa-solid fa-phone" aria-hidden="true"></i>
                    <span>Emergency Helpline: <strong>{msg.helpline || '112'}</strong></span>
                  </div>
                )}

                {/* Direct Helpline Call Button */}
                {!isUser && msg.helpline && (
                  <CallButton number={msg.helpline} label={msg.type} />
                )}

                {/* Live map card for location emergencies */}
                {!isUser && (msg.userLocation || msg.loadingNearest || msg.nearestError) && (
                  <ChatMapCard
                    emergencyType={msg.type}
                    userLocation={msg.userLocation}
                    nearestPlace={msg.nearestPlace}
                    loading={msg.loadingNearest}
                    error={msg.nearestError}
                    openFullMap={() => setActiveTab('map')}
                  />
                )}

                {/* Speaker button on AI messages */}
                {!isUser && msg.text && (
                  <button
                    className="speaker-btn"
                    title="Read aloud"
                    aria-label="Read message aloud"
                    onClick={() => speakResponse(msg.text, selectedLanguage, msg.emotion)}
                  >
                    <i className="fa-solid fa-volume-high" aria-hidden="true"></i>
                  </button>
                )}

                <span className="message-time">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div className="chat-message-row ai-row">
            <div className="chat-bubble ai-bubble" style={{ padding: '8px 16px' }}>
              <LoadingSpinner message="NOVI is thinking..." />
            </div>
          </div>
        )}

        {/* Listening indicator */}
        {listening && (
          <div className="chat-message-row ai-row">
            <div className="chat-bubble ai-bubble listening-bubble" role="status" aria-label="Listening for voice input">
              <i className="fa-solid fa-microphone listening-mic-icon" aria-hidden="true"></i>
              <span className="listening-label">
                Listening in {languages.find(l => l.code === selectedLanguage)?.label || 'English'}...
              </span>
              <div className="listening-dots">
                <span className="listening-dot"></span>
                <span className="listening-dot"></span>
                <span className="listening-dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice error */}
      {voiceError && (
        <div className="voice-error-bar" role="alert">
          <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {voiceError}
        </div>
      )}

      {/* Input row */}
      <form onSubmit={handleSend} className="chat-input-row">
        <label htmlFor="chat-input-field" className="sr-only">Describe your emergency</label>
        <input
          id="chat-input-field"
          type="text"
          className="chat-input-field"
          placeholder="Describe your emergency..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading || listening}
        />

        {/* Mic button */}
        <button
          type="button"
          className={`mic-btn ${listening ? 'mic-active' : (loading ? 'mic-processing' : '')}`}
          onClick={listening ? stopListening : startListening}
          disabled={loading}
          aria-label={listening ? 'Stop listening' : 'Start voice input'}
        >
          <i className={`fa-solid ${listening ? 'fa-stop' : 'fa-microphone'}`} aria-hidden="true"></i>
        </button>

        {/* Send button */}
        <button
          type="submit"
          className="chat-send-icon-btn"
          disabled={loading || listening || !inputText.trim()}
          aria-label="Send message"
        >
          <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
        </button>
      </form>

      {/* EMERGENCY SERVICES Button */}
      <button
        type="button"
        className="emergency-services-trigger-btn"
        onClick={() => setShowServices(true)}
        aria-label="Open emergency services panel"
      >
        <i className="fa-solid fa-th" aria-hidden="true"></i>
        <div className="btn-text-content">
          <span className="btn-title">EMERGENCY SERVICES</span>
          <span className="btn-subtitle">Find nearby help instantly</span>
        </div>
      </button>

      {showServices && <ServicesPanel onClose={() => setShowServices(false)} />}
    </div>
  );
}

export default ChatBot;
