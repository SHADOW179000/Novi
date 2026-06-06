const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const Fuse = require('fuse.js');
const helplinesData = require('../data/stateHelplines.json');

// Rate Limiter: 20 requests per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    emotion: 'CALM',
    type: 'general',
    helpline: '112',
    confidence: 'LOW',
    verified: false,
    steps: ['Slow down', 'Wait a moment before retrying'],
    response: 'Too many requests. Please wait a minute before writing again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedLanguages = ['hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN', 'en-IN'];

// Validation middleware
const validateChat = [
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters.'),
  body('language')
    .isIn(allowedLanguages)
    .withMessage(`Language must be one of: ${allowedLanguages.join(', ')}`)
];

const systemPrompt = `You are NOVI, AI Emergency Navigator for Indian citizens.
Respond in EXACTLY this format, no markdown, no extra text:
EMOTION: PANIC
TYPE: medical
HELPLINE: 108
CONFIDENCE: HIGH
VERIFIED: true
STEPS: 1. First step | 2. Second step | 3. Third step
RESPONSE: Your response in user language here

Rules:
- Detect type: medical/cyber/women/fire/police/disaster/mental/child/document/road/gas/drowning/missing/food/animal/riot/railway/terror
- Respond in EXACT same language as user
- CONFIDENCE: HIGH if sure, LOW if unsure
- VERIFIED: true only for known Indian government helplines
- STEPS separated by pipe character
- RESPONSE under 150 words`;

// Helper to find the relevant helplines using Fuse.js
function getRelevantHelplines(query) {
  if (!query) return helplinesData.national.slice(0, 5);

  const cleanQuery = query.toLowerCase();

  // 1. Search for matching state in the user query
  const stateOptions = {
    keys: ['state', 'code'],
    threshold: 0.3
  };
  const stateFuse = new Fuse(helplinesData.states, stateOptions);
  
  // Find if any word in the query matches a state
  let matchedState = null;
  const words = cleanQuery.split(/[\s,.\-\/]+/);
  for (const word of words) {
    if (word.length < 2) continue;
    const stateResults = stateFuse.search(word);
    if (stateResults.length > 0) {
      matchedState = stateResults[0].item;
      break;
    }
  }
  
  // Also try searching the full query on states
  if (!matchedState) {
    const fullStateResults = stateFuse.search(cleanQuery);
    if (fullStateResults.length > 0) {
      matchedState = fullStateResults[0].item;
    }
  }

  // Combine national and (if matched) state-specific helplines
  let pool = [...helplinesData.national];
  if (matchedState) {
    const stateSpecific = matchedState.specific.map(h => ({
      ...h,
      state: matchedState.state,
      available: h.available || '24/7'
    }));
    pool = [...stateSpecific, ...pool];
  }

  // Now search the combined pool using Fuse.js for matches against the query
  const poolOptions = {
    keys: ['name', 'category'],
    threshold: 0.5
  };
  const poolFuse = new Fuse(pool, poolOptions);
  const searchResults = poolFuse.search(cleanQuery);
  
  // Take top 5 matches
  let topMatches = searchResults.slice(0, 5).map(res => res.item);
  
  // If no results, just return a default subset of relevant national helplines
  if (topMatches.length === 0) {
    topMatches = pool.slice(0, 5);
  }
  return topMatches;
}

async function callGemini(message, language) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('Gemini API key is not configured.');
  }

  // Retrieve relevant helplines from our RAG database using Fuse.js
  const relevantHelplines = getRelevantHelplines(message);
  const ragContext = relevantHelplines.map(h => 
    `- Name: ${h.name}${h.state ? ` (${h.state})` : ''}, Number: ${h.number}, Category: ${h.category}`
  ).join('\n');

  const promptText = `${systemPrompt}

[RAG DATABASE CONTEXT - VERIFIED EMERGENCY HELPLINES IN INDIA]
${ragContext}

Instructions: Use the above RAG context to select the most specific HELPLINE for the user's emergency. If the user mentions a specific state (e.g., Delhi, Maharashtra, Karnataka) and a specific type (e.g., fire, police, women, disaster), prioritize the state-specific number from the context over national numbers. Always respond in the requested format.

User Message (Language: ${language}): ${message}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API responded with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Invalid response structure from Gemini API');
  }

  return text;
}

router.post('/chat', chatLimiter, validateChat, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // CSRF validation
  const csrfToken = req.headers['x-csrf-token'];
  if (!csrfToken || csrfToken.length !== 64) {
    return res.status(403).json({ error: 'Invalid request' });
  }

  const { message, language, turnstileToken } = req.body;

  // Turnstile verification
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
      );
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return res.status(403).json({ error: 'Bot detected' });
      }
    } catch (err) {
      console.error('Turnstile verification failed:', err.message);
    }
  }

  // Prompt injection check
  const injectionPatterns = [
    /ignore previous/gi,
    /system prompt/gi,
    /jailbreak/gi,
    /override/gi,
    /forget everything/gi
  ];
  const isInjectionAttempt = injectionPatterns.some(p => p.test(message));
  if (isInjectionAttempt) {
    return res.status(400).json({ error: 'Invalid message content' });
  }

  try {
    const text = await callGemini(message, language);
    
    // Parse Gemini response on backend with regex
    const emotion = text.match(/EMOTION:\s*(\w+)/)?.[1];
    const type = text.match(/TYPE:\s*(\w+)/)?.[1];
    const helpline = text.match(/HELPLINE:\s*([\d\-]+)/)?.[1];
    const confidence = text.match(/CONFIDENCE:\s*(\w+)/)?.[1];
    const verified = text.match(/VERIFIED:\s*(\w+)/)?.[1];
    const stepsRaw = text.match(/STEPS:\s*(.+)/)?.[1];
    const steps = stepsRaw?.split('|').map(s => s.trim());
    const response = text.match(/RESPONSE:\s*([\s\S]+)/)?.[1];

    res.json({
      emotion: emotion || 'CALM',
      type: type || 'general',
      helpline: helpline || '112',
      confidence: confidence || 'LOW',
      verified: verified ? verified.toLowerCase() === 'true' : false,
      steps: steps && steps.length > 0 ? steps : ['Call 112 for any emergency'],
      response: response ? response.trim() : 'AI temporarily unavailable. Please call helpline directly.'
    });
  } catch (error) {
    console.error('Gemini error:', error.message);
    res.json({
      emotion: 'CALM',
      type: 'general',
      helpline: '112',
      confidence: 'LOW',
      verified: false,
      steps: ['Call 112 for any emergency'],
      response: 'AI temporarily unavailable. Please call helpline directly.'
    });
  }
});

module.exports = router;
