// In-memory store for rate limiting
// For production use Redis or Upstash
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
  'https://your-novi-app.netlify.app',
  'https://novi-emergency.netlify.app',
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

exports.handler = async (event, context) => {
  const origin = event.headers.origin || ''
  
  // CORS check
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ 
        error: 'Unauthorized origin' 
      })
    }
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
    'Access-Control-Max-Age': '86400'
  }

  // Handle preflight OPTIONS request:
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 204, 
      headers: corsHeaders, 
      body: '' 
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0] 
    || event.headers['client-ip'] 
    || 'unknown'

  // IP based: 20 requests per minute
  const ipLimit = checkRateLimit(
    `ip_${ip}`, 20, 60000
  )
  if (!ipLimit.allowed) {
    return {
      statusCode: 429,
      headers: {
        ...corsHeaders,
        'Retry-After': ipLimit.retryAfter.toString()
      },
      body: JSON.stringify({ 
        error: 'Too many requests. Please slow down.',
        retryAfter: ipLimit.retryAfter
      })
    }
  }

  // SOS abuse prevention: max 5 per hour
  const sosLimit = checkRateLimit(
    `sos_${ip}`, 5, 3600000
  )

  // AI API abuse: max 50 requests per hour
  const apiLimit = checkRateLimit(
    `api_${ip}`, 50, 3600000
  )
  if (!apiLimit.allowed) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Hourly limit reached. Try again later.'
      })
    }
  }

  // CSRF check
  const csrfToken = event.headers['x-csrf-token']
  if (!csrfToken || csrfToken.length !== 64) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid request' })
    }
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid body' })
    }
  }

  // Cloudflare Turnstile Bot protection check
  const turnstileToken = body.turnstileToken
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
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Bot detected' })
        }
      }
    } catch (err) {
      console.error('Turnstile error:', err);
    }
  }

  const { message, language } = body;
  if (!message || !language) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Message and language are required' })
    }
  }

  // Prompt injection check
  const isInjectionAttempt = injectionPatterns.some(p => p.test(message));
  if (isInjectionAttempt) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Invalid message content' 
      })
    }
  }

  // Let's call Gemini API from serverless function
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Gemini API key is not configured.' })
    }
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
RESPONSE: Your response in user language here`;

    const promptText = `${systemPrompt}\nUser Message (Language: ${language}): ${message}`;
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
    );

    if (!response.ok) {
      throw new Error(`Gemini responded with status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const emotion = text.match(/EMOTION:\s*(\w+)/)?.[1] || 'CALM';
    const type = text.match(/TYPE:\s*(\w+)/)?.[1] || 'general';
    const helpline = text.match(/HELPLINE:\s*([\d\-]+)/)?.[1] || '112';
    const confidence = text.match(/CONFIDENCE:\s*(\w+)/)?.[1] || 'LOW';
    const verified = text.match(/VERIFIED:\s*(\w+)/)?.[1]?.toLowerCase() === 'true';
    const stepsRaw = text.match(/STEPS:\s*(.+)/)?.[1];
    const steps = stepsRaw?.split('|').map(s => s.trim()) || ['Call 112 for any emergency'];
    const aiResponse = text.match(/RESPONSE:\s*([\s\S]+)/)?.[1] || 'AI temporarily unavailable. Please call helpline directly.';

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        emotion,
        type,
        helpline,
        confidence,
        verified,
        steps,
        response: aiResponse.trim()
      })
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    }
  }
}
