import { useState, useEffect } from 'react';

function FakeCall({ setShowFakeCall }) {
  const [isAnswered, setIsAnswered] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Audio effect for ringtone
  useEffect(() => {
    if (isAnswered) return;

    let audioCtx = null;
    let osc = null;
    let isPlaying = false;
    let intervalId = null;

    const playBeep = () => {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        osc = audioCtx.createOscillator();
        osc.frequency.value = 440;
        osc.connect(audioCtx.destination);
        osc.start();
        isPlaying = true;

        // Stop the beep after 1 second (beep pattern: 1s beep, 1s silence)
        setTimeout(() => {
          if (osc && isPlaying) {
            osc.stop();
            osc.disconnect();
            isPlaying = false;
          }
        }, 1000);
      } catch (err) {
        console.error("Failed to play ringtone beep:", err);
      }
    };

    // Initial play
    playBeep();

    // Repeat every 2 seconds
    intervalId = setInterval(playBeep, 2000);

    return () => {
      clearInterval(intervalId);
      if (osc && isPlaying) {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      }
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [isAnswered]);

  // Call timer effect
  useEffect(() => {
    if (!isAnswered) return;

    const timerId = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [isAnswered]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDecline = () => {
    setShowFakeCall(false);
  };

  const handleAnswer = () => {
    setIsAnswered(true);
  };

  return (
    <div className="fake-call-overlay" role="dialog" aria-label="Incoming phone call">
      <div className="fake-call-container">
        {/* Caller Avatar with Animated Pulse Rings */}
        <div className={`avatar-wrapper ${isAnswered ? 'call-active' : ''}`}>
          <div className="pulse-ring ring-1" aria-hidden="true"></div>
          <div className="pulse-ring ring-2" aria-hidden="true"></div>
          <div className="pulse-ring ring-3" aria-hidden="true"></div>
          <div className="avatar-circle">
            <i className="fa-solid fa-user" aria-hidden="true"></i>
          </div>
        </div>

        {/* Caller Info */}
        <div className="caller-info">
          <h2 className="caller-name">Mom</h2>
          <span className="caller-number">+91 98765 43210</span>
        </div>

        {/* Call Status / Timer */}
        <div className="call-status" role="status">
          {isAnswered ? (
            <span className="call-timer">{formatTime(seconds)}</span>
          ) : (
            <span className="incoming-text">Incoming Call...</span>
          )}
        </div>

        {/* Controls */}
        <div className="call-controls">
          {!isAnswered ? (
            <>
              {/* Answer Button */}
              <button className="call-btn answer-btn" onClick={handleAnswer} aria-label="Answer call">
                <i className="fa-solid fa-phone" aria-hidden="true"></i>
              </button>
              {/* Decline Button */}
              <button className="call-btn decline-btn" onClick={handleDecline} aria-label="Decline call">
                <i className="fa-solid fa-phone-slash" aria-hidden="true"></i>
              </button>
            </>
          ) : (
            /* End Call Button for Active State */
            <button className="call-btn decline-btn end-active-btn" onClick={handleDecline} aria-label="End call">
              <i className="fa-solid fa-phone-slash" aria-hidden="true"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FakeCall;
