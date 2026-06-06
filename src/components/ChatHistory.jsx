import { useState, useEffect } from 'react';
import { encryptedRetrieve } from '../utils/encryption';
import { speakResponse } from '../utils/speech';

export default function ChatHistory({ anonymousMode }) {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      const storedHistory = await encryptedRetrieve('chat_history');
      if (storedHistory) {
        setHistory(storedHistory);
      }
    };
    loadHistory();
  }, []);

  const clearHistory = () => {
    if (window.confirm("Delete all chat history? Cannot be undone.")) {
      localStorage.removeItem('novi_enc_chat_history');
      setHistory([]);
    }
  };

  const getEmergencyIcon = (type) => {
    const icons = {
      medical: 'fa-truck-medical',
      police: 'fa-building-shield',
      fire: 'fa-fire-extinguisher',
      women_safety: 'fa-person-dress',
      road_accident: 'fa-car-burst',
      disaster: 'fa-house-crack'
    };
    return icons[type] || 'fa-circle-exclamation';
  };

  const isToday = (dateString) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  const isThisWeek = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    const diff = now - d;
    return diff <= 7 * 24 * 60 * 60 * 1000;
  };

  const filteredHistory = history.filter(chat => {
    // Search
    if (searchTerm && !chat.userMessage.toLowerCase().includes(searchTerm.toLowerCase()) && !chat.noviResponse.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filters
    if (filter === 'Emergency' && (!chat.emergencyType || chat.emergencyType === 'general')) return false;
    if (filter === 'Today' && !isToday(chat.timestamp)) return false;
    if (filter === 'This Week' && !isThisWeek(chat.timestamp)) return false;

    return true;
  });

  if (anonymousMode) {
    return (
      <div className="chat-history-container" style={{ padding: '20px', textAlign: 'center' }}>
        <h2 className="screen-title" style={{ justifyContent: 'center' }}>
          <i className="fa-solid fa-clock-rotate-left"></i> Past Conversations
        </h2>
        <div className="anonymous-warning" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '10px', border: '1px solid var(--success)', marginTop: '20px' }}>
          <i className="fa-solid fa-user-secret" style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: '10px' }}></i>
          <h3 style={{ color: 'var(--success)' }}>Chat history is disabled in Anonymous Mode</h3>
          <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>Turn off Anonymous Mode in Settings to record past emergency conversations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-history-container" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <h2 className="screen-title" style={{ justifyContent: 'center', marginBottom: '20px' }}>
        <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--blue)' }}></i> Past Conversations
      </h2>

      <div className="history-controls" style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <i className="fa-solid fa-search" style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--gray)' }}></i>
          <input 
            type="text" 
            placeholder="Search conversations..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--card)', color: 'white' }}
          />
        </div>
        <div className="history-filters" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
          {['All', 'Emergency', 'Today', 'This Week'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              style={{ 
                padding: '6px 12px', 
                borderRadius: '15px', 
                border: 'none', 
                background: filter === f ? 'var(--blue)' : 'var(--card)',
                color: filter === f ? 'white' : 'var(--gray)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--gray)', marginTop: '40px' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '3rem', marginBottom: '10px', opacity: 0.5 }}></i>
            <p>No conversations found.</p>
          </div>
        ) : (
          filteredHistory.map(chat => (
            <div key={chat.id} className="history-card" style={{ background: 'var(--card)', borderRadius: '10px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                  {new Date(chat.timestamp).toLocaleString()}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {chat.emergencyType && chat.emergencyType !== 'general' && (
                    <i className={`fa-solid ${getEmergencyIcon(chat.emergencyType)}`} style={{ color: 'var(--red)' }} title={chat.emergencyType}></i>
                  )}
                  {chat.emotion && (
                    <span className={`badge ${chat.emotion === 'PANIC' ? 'warning-badge' : chat.emotion === 'CALM' ? 'verified-badge' : ''}`} style={{ fontSize: '0.6rem' }}>
                      {chat.emotion}
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <strong>User:</strong> <span style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>{chat.userMessage}</span>
              </div>

              {expandedId === chat.id ? (
                <>
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>NOVI:</strong>
                      <button
                        className="speaker-btn"
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--blue)', 
                          cursor: 'pointer', 
                          padding: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          transition: 'background-color 0.2s'
                        }}
                        title="Read aloud"
                        aria-label="Read response aloud"
                        onClick={() => speakResponse(chat.noviResponse, chat.language || 'en-IN', chat.emotion || 'NEUTRAL')}
                      >
                        <i className="fa-solid fa-volume-high" style={{ fontSize: '1.05rem' }} aria-hidden="true"></i>
                      </button>
                    </div>
                    <p style={{ color: 'var(--white)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', marginTop: '5px' }}>{chat.noviResponse}</p>
                    {chat.helpline && (
                      <div style={{ marginTop: '10px', color: 'var(--blue)', fontSize: '0.9rem' }}>
                        <i className="fa-solid fa-phone"></i> Helpline provided: {chat.helpline}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setExpandedId(null)} style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>
                    Show less <i className="fa-solid fa-chevron-up"></i>
                  </button>
                </>
              ) : (
                <button onClick={() => setExpandedId(chat.id)} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>
                  Expand to see response <i className="fa-solid fa-chevron-down"></i>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <button onClick={clearHistory} style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,51,51,0.1)', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          <i className="fa-solid fa-trash"></i> Clear All History
        </button>
      )}
    </div>
  );
}
