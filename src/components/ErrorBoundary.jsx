import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error) {
    console.error('Component error:', error.message)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <i className="fa fa-exclamation-triangle" aria-hidden="true" />
          <h3>This feature is temporarily unavailable</h3>
          <p>For immediate help call emergency services</p>
          <a href="tel:112" className="emergency-call-btn"
             aria-label="Call 112 National Emergency">
            Call 112 Now
          </a>
          <button 
            onClick={() => this.setState({ hasError: false })}
            aria-label="Try again">
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary;
