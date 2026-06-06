import { useState } from 'react';
import ServiceDetail from './ServiceDetail';

const SERVICES = [
  { id: 'police', label: 'POLICE', icon: 'fa-shield-halved' },
  { id: 'fire', label: 'FIRE', icon: 'fa-fire' },
  { id: 'medical', label: 'MEDICAL', icon: 'fa-kit-medical' },
  { id: 'disaster', label: 'DISASTER', icon: 'fa-house-flood-water' },
  { id: 'woman', label: 'WOMAN', icon: 'fa-person-dress' },
  { id: 'child', label: 'CHILD', icon: 'fa-child' },
  { id: 'elderly', label: 'ELDERLY', icon: 'fa-person-cane' },
  { id: 'railway', label: 'RAILWAY', icon: 'fa-train' },
  { id: 'cyber', label: 'CYBER', icon: 'fa-shield-virus' },
  { id: 'road', label: 'ROAD', icon: 'fa-car-burst' },
  { id: 'gas', label: 'GAS LEAK', icon: 'fa-gas-pump' },
  { id: 'mental', label: 'MENTAL', icon: 'fa-brain' },
];

export default function ServicesPanel({ onClose }) {
  const [selectedService, setSelectedService] = useState(null);

  if (selectedService) {
    return (
      <ServiceDetail
        service={selectedService}
        onBack={() => setSelectedService(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <div className="services-backdrop" onClick={onClose} aria-hidden="true"></div>
      <div className="services-panel" role="dialog" aria-label="Emergency Services">
        <div className="services-panel-handle" aria-hidden="true"></div>

        <div className="services-panel-header">
          <h3>
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" style={{ color: 'var(--red)', marginRight: '8px' }}></i>
            Contact Emergency Services
          </h3>
          <button className="services-close-btn" onClick={onClose} aria-label="Close services panel">
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="services-grid">
          {SERVICES.map((service) => (
            <button
              key={service.id}
              className="service-grid-btn"
              onClick={() => setSelectedService(service)}
              aria-label={`${service.label} emergency services`}
            >
              <div className="service-grid-icon">
                <i className={`fa-solid ${service.icon}`} aria-hidden="true"></i>
              </div>
              <span className="service-grid-label">{service.label}</span>
            </button>
          ))}
        </div>

        <p className="services-footer-text">
          <i className="fa-solid fa-location-dot" aria-hidden="true"></i> Tap any service to find nearest help with live GPS
        </p>
      </div>
    </>
  );
}
