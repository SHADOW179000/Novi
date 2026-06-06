import { useState } from 'react';
import { encryptedStore } from '../utils/encryption';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [userDetails, setUserDetails] = useState({ name: '', phone: '', city: '' });
  const [contacts, setContacts] = useState([{ name: '', phone: '' }, { name: '', phone: '' }]);
  const [medicalProfile, setMedicalProfile] = useState({
    bloodGroup: '', allergies: '', conditions: '', medications: '', docName: '', docPhone: ''
  });

  const handleNext = () => setStep(step + 1);

  const handleDetailsChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name') {
      value = value.replace(/[^a-zA-Z\s.]/g, '');
    } else if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setUserDetails({ ...userDetails, [name]: value });
  };

  const handleMedicalChange = (e) => {
    let { name, value } = e.target;
    if (name === 'docName') {
      value = value.replace(/[^a-zA-Z\s.]/g, '');
    } else if (name === 'docPhone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setMedicalProfile({ ...medicalProfile, [name]: value });
  };

  const handleContactChange = (index, field, value) => {
    let cleanValue = value;
    if (field === 'name') {
      cleanValue = value.replace(/[^a-zA-Z\s.]/g, '');
    } else if (field === 'phone') {
      cleanValue = value.replace(/\D/g, '').slice(0, 10);
    }
    const newContacts = [...contacts];
    newContacts[index][field] = cleanValue;
    setContacts(newContacts);
  };

  const addContact = () => {
    setContacts([...contacts, { name: '', phone: '' }]);
  };

  const saveAndComplete = async () => {
    // Filter out empty contacts
    const validContacts = contacts.filter(c => c.name.trim() !== '' && c.phone.trim() !== '');
    
    // Encrypt all sensitive PII data
    await encryptedStore('user', userDetails);
    await encryptedStore('contacts', validContacts);
    await encryptedStore('medical_profile', medicalProfile);
    localStorage.setItem('novi_registered', 'true');
    
    onComplete();
  };

  const isDetailsValid = userDetails.name.trim().length >= 2 && userDetails.phone.length === 10 && userDetails.city.trim().length >= 2;

  const validateContacts = () => {
    const c1 = contacts[0];
    if (!c1 || c1.name.trim().length < 2 || c1.phone.length !== 10) return false;
    
    for (let i = 1; i < contacts.length; i++) {
      const c = contacts[i];
      if (c.name.trim() || c.phone) {
        if (c.name.trim().length < 2 || c.phone.length !== 10) return false;
      }
    }
    return true;
  };

  const validateMedical = () => {
    if (medicalProfile.docName && medicalProfile.docName.trim().length > 0 && medicalProfile.docName.trim().length < 2) return false;
    if (medicalProfile.docPhone && medicalProfile.docPhone.length > 0 && medicalProfile.docPhone.length !== 10) return false;
    return true;
  };

  return (
    <div className="onboarding-container">
      {step === 1 && (
        <div className="onboarding-step text-center">
          <i className="fa-solid fa-shield-halved onboarding-logo animate-shield" aria-hidden="true" style={{ color: 'var(--red)' }}></i>
          <h1 className="onboarding-title">Welcome to NOVI</h1>
          <h2 className="onboarding-subtitle">India's AI Emergency Navigator</h2>
          <p className="onboarding-text">When Every Second Counts We're There</p>
          <button className="onboarding-btn primary-btn mt-auto" onClick={handleNext} aria-label="Get started with onboarding">
            Get Started <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-step">
          <h2 className="onboarding-title text-left">Tell us about yourself</h2>
          <p className="onboarding-text text-left mb-4">This info helps us personalize your emergency responses.</p>
          
          <div className="form-group">
            <label htmlFor="onboard-name">Your Name *</label>
            <input 
              id="onboard-name"
              type="text" 
              name="name" 
              placeholder="e.g. Rahul Sharma" 
              value={userDetails.name} 
              onChange={handleDetailsChange}
              required 
            />
            {userDetails.name && userDetails.name.trim().length < 2 && (
              <span className="error-text" style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Name must be at least 2 characters.</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="onboard-phone">Your Phone Number *</label>
            <input 
              id="onboard-phone"
              type="tel" 
              name="phone" 
              placeholder="10 digit number" 
              value={userDetails.phone} 
              onChange={handleDetailsChange}
              required 
            />
            {userDetails.phone && userDetails.phone.length !== 10 && (
              <span className="error-text" style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Phone number must be exactly 10 digits.</span>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="onboard-city">Your City/State *</label>
            <input 
              id="onboard-city"
              type="text" 
              name="city" 
              placeholder="e.g. Mumbai, MH" 
              value={userDetails.city} 
              onChange={handleDetailsChange}
              required 
            />
          </div>

          <button 
            className="onboarding-btn primary-btn mt-auto" 
            onClick={handleNext}
            disabled={!isDetailsValid}
            aria-label="Continue to next step"
          >
            Next <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="onboarding-step">
          <h2 className="onboarding-title text-left">Who should we contact in emergency?</h2>
          <p className="onboarding-text text-left mb-4">NOVI sends your live location to these people when you press SOS.</p>
          
          <div className="contacts-list">
            {contacts.map((contact, index) => (
              <div key={index} className="contact-card">
                <h4 className="contact-heading">Contact {index + 1} {index === 0 ? '(Required)' : '(Optional)'}</h4>
                <div className="form-group">
                  <label htmlFor={`onboard-contact-name-${index}`}>Name</label>
                  <input 
                    id={`onboard-contact-name-${index}`}
                    type="text" 
                    placeholder="e.g. Mom" 
                    value={contact.name} 
                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                  />
                  {contact.name && contact.name.trim().length < 2 && (
                    <span className="error-text" style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Name must be at least 2 characters.</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor={`onboard-contact-phone-${index}`}>WhatsApp Number</label>
                  <input 
                    id={`onboard-contact-phone-${index}`}
                    type="tel" 
                    placeholder="10 digit number" 
                    value={contact.phone} 
                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                  />
                  {contact.phone && contact.phone.length !== 10 && (
                    <span className="error-text" style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Phone number must be exactly 10 digits.</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="onboarding-btn secondary-btn mb-4" onClick={addContact} aria-label="Add new emergency contact">
            <i className="fa-solid fa-plus" aria-hidden="true"></i> Add Contact
          </button>

          <div className="button-row mt-auto">
            <button className="onboarding-btn skip-btn" onClick={() => {
              if(window.confirm('Warning: Without emergency contacts, NOVI cannot send SOS alerts. Continue anyway?')) {
                handleNext();
              }
            }} aria-label="Skip emergency contact setup">
              Skip
            </button>
            <button 
              className="onboarding-btn primary-btn flex-1" 
              onClick={handleNext}
              disabled={!validateContacts()}
              aria-label="Save contacts and continue"
            >
              Save & Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="onboarding-step">
          <h2 className="onboarding-title text-left">Medical Details</h2>
          <p className="onboarding-text text-left mb-4">Your medical details help responders save your life faster.</p>
          
          <div className="contacts-list">
            <div className="form-group">
              <label htmlFor="onboard-blood-group">Blood Group</label>
              <select 
                id="onboard-blood-group"
                name="bloodGroup" 
                value={medicalProfile.bloodGroup} 
                onChange={handleMedicalChange}
                className="form-select"
                style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: 'var(--white)' }}
              >
                <option value="">Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="onboard-allergies">Known Allergies</label>
              <input 
                id="onboard-allergies"
                type="text" 
                name="allergies" 
                placeholder="e.g. Penicillin, Peanuts" 
                value={medicalProfile.allergies} 
                onChange={handleMedicalChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="onboard-conditions">Medical Conditions</label>
              <input 
                id="onboard-conditions"
                type="text" 
                name="conditions" 
                placeholder="e.g. Diabetes, Hypertension" 
                value={medicalProfile.conditions} 
                onChange={handleMedicalChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="onboard-medications">Current Medications</label>
              <input 
                id="onboard-medications"
                type="text" 
                name="medications" 
                placeholder="e.g. Insulin, Aspirin" 
                value={medicalProfile.medications} 
                onChange={handleMedicalChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="onboard-doc-name">Emergency Doctor Name</label>
              <input 
                id="onboard-doc-name"
                type="text" 
                name="docName" 
                placeholder="e.g. Dr. Ramesh" 
                value={medicalProfile.docName} 
                onChange={handleMedicalChange}
              />
              {medicalProfile.docName && medicalProfile.docName.trim().length < 2 && (
                <span className="error-text" style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Doctor name must be at least 2 characters.</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="onboard-doc-phone">Emergency Doctor Phone</label>
              <input 
                id="onboard-doc-phone"
                type="tel" 
                name="docPhone" 
                placeholder="10 digit number" 
                value={medicalProfile.docPhone} 
                onChange={handleMedicalChange}
              />
              {medicalProfile.docPhone && medicalProfile.docPhone.length !== 10 && (
                <span className="error-text" style={{ color: 'var(--red)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Phone number must be exactly 10 digits.</span>
              )}
            </div>
          </div>

          <div className="button-row mt-auto">
            <button className="onboarding-btn skip-btn" onClick={handleNext} aria-label="Skip medical details">
              Skip
            </button>
            <button 
              className="onboarding-btn primary-btn flex-1" 
              onClick={handleNext}
              disabled={!validateMedical()}
              aria-label="Save medical details and continue"
            >
              Save & Continue
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="onboarding-step text-center justify-center">
          <div className="success-animation mb-4">
            <i className="fa-solid fa-circle-check" aria-hidden="true" style={{ color: 'var(--success)', fontSize: '5rem' }}></i>
          </div>
          <h2 className="onboarding-title">All Set!</h2>
          <p className="onboarding-text mb-5">You are protected by NOVI</p>
          <button className="onboarding-btn primary-btn w-full" onClick={saveAndComplete} aria-label="Start using NOVI app">
            Start Using NOVI
          </button>
        </div>
      )}
    </div>
  );
}
