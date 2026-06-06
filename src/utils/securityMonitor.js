import { getSession } from './session'

class SecurityMonitor {
  constructor() {
    this.events = []
    this.alerts = []
    this.suspiciousIPs = new Set()
  }

  log(eventType, details) {
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      details: details,
      sessionId: getSession()?.id || 'unknown'
    }
    this.events.push(event)
    this.analyze(event)
    
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift()
    }
  }

  analyze(event) {
    // Detect rapid fire requests
    const recentEvents = this.events.filter(e => 
      Date.now() - new Date(e.timestamp).getTime() < 60000
    )
    
    if (recentEvents.length > 20) {
      this.alert('HIGH_REQUEST_RATE', {
        count: recentEvents.length,
        window: '1 minute'
      })
    }

    // Detect injection attempts
    if (event.type === 'INJECTION_ATTEMPT') {
      this.alert('INJECTION_DETECTED', event.details)
    }

    // Detect repeated failures
    const failures = recentEvents.filter(
      e => e.type === 'API_FAILURE'
    )
    if (failures.length > 5) {
      this.alert('REPEATED_API_FAILURES', {
        count: failures.length
      })
    }
  }

  alert(alertType, details) {
    const alert = {
      type: alertType,
      timestamp: new Date().toISOString(),
      details
    }
    this.alerts.push(alert)
    console.warn('SECURITY ALERT:', alertType)
    
    // In production send to monitoring service
    // sendToMonitoring(alert)
  }

  getReport() {
    return {
      totalEvents: this.events.length,
      alerts: this.alerts,
      recentEvents: this.events.slice(-10)
    }
  }
}

export const monitor = new SecurityMonitor()
