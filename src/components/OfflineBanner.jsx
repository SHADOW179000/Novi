import { useState, useEffect } from 'react';
import { showToast } from './Toast';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [show, setShow] = useState(!navigator.onLine)

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      setShow(true)
      showToast('Connection restored', 'success')
      setTimeout(() => setShow(false), 3000)
    }
    const onOffline = () => {
      setIsOnline(false)
      setShow(true)
      showToast('You are offline', 'warning')
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!show) return null
  return (
    <div className={`offline-banner ${isOnline?'online':'offline'}`}
         role="status" aria-live="polite">
      <i className={`fa ${isOnline?'fa-wifi':'fa-wifi-slash'}`}
         aria-hidden="true" />
      <span>
        {isOnline 
          ? 'Connection restored'
          : 'Offline - Showing cached emergency data'}
      </span>
    </div>
  )
}

export default OfflineBanner;
