const SESSION_DURATION = 4 * 60 * 60 * 1000 // 4 hours
const SESSION_KEY = 'novi_session'

export const createSession = () => {
  const session = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
    lastActivity: Date.now()
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export const getSession = () => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (!stored) return createSession()
    
    const session = JSON.parse(stored)
    
    // Check expiry
    if (Date.now() > session.expiresAt) {
      clearSession()
      return createSession()
    }
    
    // Update last activity
    session.lastActivity = Date.now()
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
    
  } catch {
    return createSession()
  }
}

export const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem('novi_csrf_token')
}

export const isSessionValid = () => {
  const session = getSession()
  return session && Date.now() < session.expiresAt
}

// Auto logout after 30 minutes of inactivity
let inactivityTimer
export const resetInactivityTimer = () => {
  clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(() => {
    clearSession()
    // Show session expired message
    window.dispatchEvent(new Event('novi_session_expired'))
  }, 30 * 60 * 1000) // 30 minutes
}
