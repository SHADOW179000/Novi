// Generate encryption key from app secret
const getEncryptionKey = async () => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('NOVI_SECURE_KEY_2025'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  
  const salt = new TextEncoder().encode('NOVI_SALT_V1')
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt data with AES-256-GCM
export const encryptData = async (data) => {
  try {
    const key = await getEncryptionKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(
      JSON.stringify(data)
    )
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    )
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(
      iv.length + encrypted.byteLength
    )
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)
    
    return btoa(String.fromCharCode(...combined))
  } catch {
    return null
  }
}

// Decrypt data
export const decryptData = async (encryptedStr) => {
  try {
    const key = await getEncryptionKey()
    const combined = new Uint8Array(
      atob(encryptedStr).split('').map(c => c.charCodeAt(0))
    )
    
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    return JSON.parse(new TextDecoder().decode(decrypted))
  } catch {
    return null
  }
}

// Encrypted storage functions
export const encryptedStore = async (key, data) => {
  const encrypted = await encryptData(data)
  if (encrypted) {
    localStorage.setItem(`novi_enc_${key}`, encrypted)
  }
}

export const encryptedRetrieve = async (key) => {
  const stored = localStorage.getItem(`novi_enc_${key}`)
  if (!stored) return null
  return await decryptData(stored)
}
