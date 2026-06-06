// Vercel Serverless Function: api/chat.js
const rateLimitStore = new Map()

const checkRateLimit = (identifier, maxRequests, windowMs) => {
  const now = Date.now()
  const key = identifier
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, [])
  }
  
  const requests = rateLimitStore.get(key)
    .filter(time => now - time < windowMs)
  
  if (requests.length >= maxRequests) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil(
        (requests[0] + windowMs - now) / 1000
      )
    }
  }
  
  requests.push(now)
  rateLimitStore.set(key, requests)
  return { allowed: true }
}

const ALLOWED_ORIGINS = [
  'https://your-novi-app.vercel.app',
  'https://novi-emergency.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
]

const injectionPatterns = [
  /ignore previous/gi,
  /system prompt/gi,
  /jailbreak/gi,
  /override/gi,
  /forget everything/gi
]

export default async function handler(req, res) {
  // CORS check
  const origin = req.headers.origin || ''
  
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !origin.startsWith('http://localhost')) {
    return res.status(403).json({ error: 'Unauthorized origin' })
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token')
  res.setHeader('Access-Control-Max-Age', '86400')

  // Handle preflight OPTIONS request:
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] 
    || req.socket.remoteAddress 
    || 'unknown'

  // IP based: 20 requests per minute
  const ipLimit = checkRateLimit(`ip_${ip}`, 20, 60000)
  if (!ipLimit.allowed) {
    res.setHeader('Retry-After', ipLimit.retryAfter.toString())
    return res.status(429).json({ 
      error: 'Too many requests. Please slow down.',
      retryAfter: ipLimit.retryAfter
    })
  }

  // AI API abuse: max 50 requests per hour
  const apiLimit = checkRateLimit(`api_${ip}`, 50, 3600000)
  if (!apiLimit.allowed) {
    return res.status(429).json({ 
      error: 'Hourly limit reached. Try again later.'
    })
  }

  // CSRF check
  const csrfToken = req.headers['x-csrf-token']
  if (!csrfToken || csrfToken.length !== 64) {
    return res.status(403).json({ error: 'Invalid request' })
  }

  const { message, language, turnstileToken } = req.body || {}
  
  if (turnstileToken) {
    try {
      const verifyRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: turnstileToken
          })
        }
      )
      const verifyData = await verifyRes.json()
      if (!verifyData.success) {
        return res.status(403).json({ error: 'Bot detected' })
      }
    } catch (err) {
      console.error('Turnstile error:', err)
    }
  }

  if (!message || !language) {
    return res.status(400).json({ error: 'Message and language are required' })
  }

  // Prompt injection check
  const isInjectionAttempt = injectionPatterns.some(p => p.test(message))
  if (isInjectionAttempt) {
    return res.status(400).json({ error: 'Invalid message content' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'Gemini API key is not configured.' })
  }

  try {
    const systemPrompt = `You are NOVI, AI Emergency Navigator for Indian citizens.
Respond in EXACTLY this format, no markdown, no extra text:
EMOTION: PANIC
TYPE: medical
HELPLINE: 108
CONFIDENCE: HIGH
VERIFIED: true
STEPS: 1. First step | 2. Second step | 3. Third step
RESPONSE: Your response in user language here`

    const promptText = `${systemPrompt}\nUser Message (Language: ${language}): ${message}`
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini responded with status ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    const emotion = text.match(/EMOTION:\s*(\w+)/)?.[1] || 'CALM'
    const type = text.match(/TYPE:\s*(\w+)/)?.[1] || 'general'
    const helpline = text.match(/HELPLINE:\s*([\d\-]+)/)?.[1] || '112'
    const confidence = text.match(/CONFIDENCE:\s*(\w+)/)?.[1] || 'LOW'
    const verified = text.match(/VERIFIED:\s*(\w+)/)?.[1]?.toLowerCase() === 'true'
    const stepsRaw = text.match(/STEPS:\s*(.+)/)?.[1]
    const steps = stepsRaw?.split('|').map(s => s.trim()) || ['Call 112 for any emergency']
    const aiResponse = text.match(/RESPONSE:\s*([\s\S]+)/)?.[1] || 'AI temporarily unavailable. Please call helpline directly.'

    return res.status(200).json({
      emotion,
      type,
      helpline,
      confidence,
      verified,
      steps,
      response: aiResponse.trim()
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
