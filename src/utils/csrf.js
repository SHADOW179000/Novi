// Generate CSRF token on app load
export const generateCSRFToken = () => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const token = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  sessionStorage.setItem('novi_csrf_token', token)
  return token
}

export const getCSRFToken = () => {
  return sessionStorage.getItem('novi_csrf_token') 
    || generateCSRFToken()
}

export const validateCSRFToken = (token) => {
  const stored = sessionStorage.getItem('novi_csrf_token')
  return stored && stored === token
}
