import { useState, useEffect } from 'react';

let toastCallback = null

export const showToast = (message, type='success', duration=3000) => {
  if (toastCallback) toastCallback({ message, type, duration })
}

const Toast = () => {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    toastCallback = ({ message, type, duration }) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    return () => { toastCallback = null }
  }, [])
  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default Toast;
