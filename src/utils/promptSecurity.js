const INJECTION_PATTERNS = [
  /ignore previous instructions/gi,
  /ignore all previous/gi,
  /system prompt/gi,
  /you are now/gi,
  /forget everything/gi,
  /new instruction/gi,
  /override/gi,
  /jailbreak/gi,
  /pretend you are/gi,
  /act as if/gi,
  /disregard your/gi,
  /bypass/gi,
  /reveal your prompt/gi,
  /show your instructions/gi,
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /###/g,
  /<\|/g,
  /\|>/g
]

const MALICIOUS_CONTENT = [
  /(<script)/gi,
  /(javascript:)/gi,
  /(eval\()/gi,
  /(document\.cookie)/gi,
  /(window\.location)/gi,
  /(fetch\()/gi,
  /(XMLHttpRequest)/gi
]

export const detectPromptInjection = (input) => {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { 
        safe: false, 
        reason: 'Potential prompt injection detected' 
      }
    }
  }
  return { safe: true }
}

export const detectMaliciousContent = (input) => {
  for (const pattern of MALICIOUS_CONTENT) {
    if (pattern.test(input)) {
      return { 
        safe: false, 
        reason: 'Malicious content detected' 
      }
    }
  }
  return { safe: true }
}

export const sanitizeForAI = (input) => {
  // Remove potential injection attempts
  let safe = input
  INJECTION_PATTERNS.forEach(pattern => {
    safe = safe.replace(pattern, '[filtered]')
  })
  MALICIOUS_CONTENT.forEach(pattern => {
    safe = safe.replace(pattern, '[filtered]')
  })
  return safe.trim()
}
