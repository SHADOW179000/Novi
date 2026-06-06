import { useState, useEffect } from 'react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent standard prompt
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Delay showing the banner by 30 seconds
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 30000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismissClick = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="install-prompt-banner" role="alert">
      <div className="install-prompt-content">
        <i className="fa-solid fa-download install-icon" aria-hidden="true"></i>
        <span>Install NOVI for offline emergency access</span>
      </div>
      <div className="install-prompt-actions">
        <button className="install-btn-action" onClick={handleInstallClick} aria-label="Install NOVI app">Install</button>
        <button className="dismiss-btn-action" onClick={handleDismissClick} aria-label="Dismiss install prompt">Dismiss</button>
      </div>
    </div>
  );
}

export default InstallPrompt;
