function PrivacyPolicy({ setActiveTab }) {
  return (
    <div className="privacy-policy-container">
      <div className="privacy-header">
        <button className="back-btn" onClick={() => setActiveTab('settings')} aria-label="Go back to settings">
          <i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to Settings
        </button>
        <h2 className="screen-title" style={{ marginTop: '12px', justifyContent: 'flex-start' }}>
          <i className="fa-solid fa-user-shield" aria-hidden="true" style={{ color: 'var(--blue)' }}></i> Privacy Policy
        </h2>
      </div>

      <div className="privacy-content-scroll">
        <section className="privacy-section">
          <h3>What We Collect</h3>
          <p>
            NOVI collects minimal user location data to perform critical safety searches:
          </p>
          <ul>
            <li>Temporary GPS coordinates (only when active and permitted) to find nearby hospitals, police, and fire stations.</li>
            <li>Voice inputs when you use dynamic Speech-to-Text emergency search.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h3>What We Do Not Store</h3>
          <p>
            Your safety is our top priority. We do not store:
          </p>
          <ul>
            <li>Any continuous GPS coordinate tracking history on servers.</li>
            <li>Your AI chat conversations or historical logs in remote databases.</li>
            <li>In <strong>Anonymous Mode</strong>, all browser storage writing is bypassed, chat memory is flushed, and GPS coordinates are strictly disabled.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h3>Third Party Services</h3>
          <p>
            External API calls are kept to a minimum:
          </p>
          <ul>
            <li><strong>Overpass API:</strong> OpenStreetMap data querying to fetch public utility pins near you.</li>
            <li><strong>AI models:</strong> Used solely to assist triage analysis in the chatbot.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h3>Contact Us</h3>
          <p>
            Developed with citizen safety in mind by:
          </p>
          <div className="contact-info-card">
            <strong>Team Drishti</strong>
            <p>RV College of Engineering, Bengaluru</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
