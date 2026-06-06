import { useState, useEffect } from 'react';
import { encryptedStore, encryptedRetrieve } from '../utils/encryption';
import { showToast } from './Toast';

function Settings({ setShowFakeCall, anonymousMode, setAnonymousMode, setActiveTab, longPressFakeCall, setLongPressFakeCall, voiceOutputEnabled, setVoiceOutputEnabled }) {
  const [contacts, setContacts] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [isAdding, setIsAdding] = useState(false);

  const [medicalProfile, setMedicalProfile] = useState({
    bloodGroup: '', allergies: '', conditions: '', medications: '', docName: '', docPhone: ''
  });
  const [isEditingMedical, setIsEditingMedical] = useState(false);

  // Personal Details state
  const [personalDetails, setPersonalDetails] = useState({ name: '', phone: '', city: '' });
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({ name: '', phone: '', city: '' });

  useEffect(() => {
    const loadEncryptedData = async () => {
      const storedContacts = await encryptedRetrieve('contacts');
      if (storedContacts) {
        setContacts(storedContacts);
      }
      const storedMed = await encryptedRetrieve('medical_profile');
      if (storedMed) {
        setMedicalProfile(storedMed);
      }
      const storedUser = await encryptedRetrieve('user');
      if (storedUser) {
        setPersonalDetails({ name: '', phone: '', city: '', ...storedUser });
        setPersonalForm({ name: '', phone: '', city: '', ...storedUser });
      }
    };
    loadEncryptedData();
  }, []);

  const saveContacts = async (newContacts) => {
    setContacts(newContacts);
    await encryptedStore('contacts', newContacts);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setEditForm(contacts[index]);
    setIsAdding(false);
  };

  const handleDelete = (index) => {
    if (window.confirm('Delete this emergency contact?')) {
      const newContacts = contacts.filter((_, i) => i !== index);
      saveContacts(newContacts);
      if (editingIndex === index) {
        setEditingIndex(null);
      }
    }
  };

  const handleEditFormChange = (field, value) => {
    let cleanValue = value;
    if (field === 'name') {
      cleanValue = value.replace(/[^a-zA-Z\s.]/g, '');
    } else if (field === 'phone') {
      cleanValue = value.replace(/\D/g, '').slice(0, 10);
    }
    setEditForm(prev => ({ ...prev, [field]: cleanValue }));
  };

  const handleSaveEdit = () => {
    const cleanName = editForm.name.trim();
    const cleanPhone = editForm.phone.trim();
    if (!cleanName || !cleanPhone) {
      alert('Name and phone number are required.');
      return;
    }
    if (cleanName.length < 2) {
      alert('Name must be at least 2 characters.');
      return;
    }
    if (cleanPhone.length !== 10) {
      alert('Phone number must be exactly 10 digits.');
      return;
    }
    const newContacts = [...contacts];
    if (isAdding) {
      newContacts.push({ name: cleanName, phone: cleanPhone });
    } else {
      newContacts[editingIndex] = { name: cleanName, phone: cleanPhone };
    }
    saveContacts(newContacts);
    showToast('Contact saved', 'success');
    setEditingIndex(null);
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingIndex(null);
    setEditForm({ name: '', phone: '' });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setIsAdding(false);
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

  const saveMedicalProfile = async () => {
    const docName = medicalProfile.docName ? medicalProfile.docName.trim() : '';
    const docPhone = medicalProfile.docPhone ? medicalProfile.docPhone.trim() : '';
    
    if (docName && docName.length < 2) {
      alert('Emergency Doctor name must be at least 2 characters.');
      return;
    }
    if (docPhone && docPhone.length !== 10) {
      alert('Emergency Doctor phone number must be exactly 10 digits.');
      return;
    }
    
    const cleanProfile = {
      ...medicalProfile,
      docName,
      docPhone
    };
    
    await encryptedStore('medical_profile', cleanProfile);
    setMedicalProfile(cleanProfile);
    setIsEditingMedical(false);
    showToast('Profile saved', 'success');
  };

  return (
    <div className="placeholder-section settings-container" style={{ padding: '16px' }}>
      <h2 className="screen-title" style={{ justifyContent: 'flex-start', alignSelf: 'flex-start', width: '100%' }}>
        <i className="fa-solid fa-gears" aria-hidden="true" style={{ color: 'var(--blue)' }}></i> Settings
      </h2>
      
      <div className="custom-list" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Personal Details Section */}
        <div className="settings-section">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><i className="fa-solid fa-user" style={{ color: 'var(--blue)', marginRight: '8px' }} aria-hidden="true"></i>Personal Details</span>
            {isEditingPersonal ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <i 
                  className="fa-solid fa-check" 
                  onClick={async () => {
                    const cleanName = personalForm.name.trim();
                    const cleanPhone = personalForm.phone.trim();
                    const cleanCity = personalForm.city ? personalForm.city.trim() : '';
                    if (!cleanName || cleanName.length < 2) {
                      alert('Name must be at least 2 characters (alphabets only).');
                      return;
                    }
                    if (cleanPhone.length !== 10) {
                      alert('Phone number must be exactly 10 digits.');
                      return;
                    }
                    const updated = { ...personalDetails, name: cleanName, phone: cleanPhone, city: cleanCity };
                    await encryptedStore('user', updated);
                    setPersonalDetails(updated);
                    setIsEditingPersonal(false);
                    showToast('Profile saved', 'success');
                  }} 
                  style={{ cursor: 'pointer', color: 'var(--success)', fontSize: '1rem' }}
                  title="Save"
                ></i>
                <i 
                  className="fa-solid fa-xmark" 
                  onClick={() => {
                    setPersonalForm({ ...personalDetails });
                    setIsEditingPersonal(false);
                  }} 
                  style={{ cursor: 'pointer', color: 'var(--red)', fontSize: '1rem' }}
                  title="Cancel"
                ></i>
              </div>
            ) : (
              <i 
                className="fa-solid fa-pen" 
                onClick={() => {
                  setPersonalForm({ ...personalDetails });
                  setIsEditingPersonal(true);
                }} 
                style={{ cursor: 'pointer', color: 'var(--blue)' }}
                aria-hidden="true"
              ></i>
            )}
          </h3>
          
          <div className="settings-option" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label htmlFor="settings-name" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Name</label>
                {isEditingPersonal ? (
                  <input 
                    id="settings-name"
                    type="text" 
                    value={personalForm.name} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s.]/g, '');
                      setPersonalForm(prev => ({ ...prev, name: val }));
                    }} 
                    placeholder="Your name" 
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white', marginTop: '4px' }} 
                  />
                ) : (
                  <div style={{ padding: '4px 0' }}>{personalDetails.name || 'Not set'}</div>
                )}
              </div>
              <div>
                <label htmlFor="settings-phone" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Phone Number</label>
                {isEditingPersonal ? (
                  <>
                    <input 
                      id="settings-phone"
                      type="tel" 
                      value={personalForm.phone} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPersonalForm(prev => ({ ...prev, phone: val }));
                      }} 
                      placeholder="10-digit phone number" 
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white', marginTop: '4px' }} 
                    />
                    {personalForm.phone && personalForm.phone.length !== 10 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: '2px' }}>{personalForm.phone.length}/10 digits</span>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '4px 0' }}>{personalDetails.phone || 'Not set'}</div>
                )}
              </div>
              <div>
                <label htmlFor="settings-city" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>City</label>
                {isEditingPersonal ? (
                  <input 
                    id="settings-city"
                    type="text" 
                    value={personalForm.city || ''} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s.-]/g, '');
                      setPersonalForm(prev => ({ ...prev, city: val }));
                    }} 
                    placeholder="Your city" 
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white', marginTop: '4px' }} 
                  />
                ) : (
                  <div style={{ padding: '4px 0' }}>{personalDetails.city || 'Not set'}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0' }} />
        
        {/* Emergency Contacts Section */}
        <div className="settings-section">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><i className="fa-solid fa-users" style={{ color: 'var(--red)', marginRight: '8px' }} aria-hidden="true"></i>Emergency Contacts</span>
            {!isAdding && editingIndex === null && (
              <button className="add-contact-btn" onClick={startAdd} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '0.9rem', cursor: 'pointer' }} aria-label="Add new contact">
                + Add
              </button>
            )}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {contacts.map((contact, index) => (
              <div key={index} className="settings-option" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                {editingIndex === index && !isAdding ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor={`edit-contact-name-${index}`} className="sr-only">Contact Name</label>
                    <input id={`edit-contact-name-${index}`} type="text" value={editForm.name} onChange={(e) => handleEditFormChange('name', e.target.value)} placeholder="Name" style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white' }} />
                    <label htmlFor={`edit-contact-phone-${index}`} className="sr-only">Contact Phone</label>
                    <input id={`edit-contact-phone-${index}`} type="tel" value={editForm.phone} onChange={(e) => handleEditFormChange('phone', e.target.value)} placeholder="Phone" style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white' }} />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button onClick={handleSaveEdit} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }} aria-label="Save contact details">Save</button>
                      <button onClick={cancelEdit} style={{ background: 'transparent', color: 'var(--gray)', border: '1px solid var(--gray)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }} aria-label="Cancel editing contact">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{contact.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{contact.phone}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <i className="fa-solid fa-pen" onClick={() => handleEdit(index)} style={{ cursor: 'pointer', color: 'var(--blue)' }} aria-hidden="true" title="Edit contact"></i>
                      <i className="fa-solid fa-trash" onClick={() => handleDelete(index)} style={{ cursor: 'pointer', color: 'var(--red)' }} aria-hidden="true" title="Delete contact"></i>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {contacts.length === 0 && !isAdding && (
              <p style={{ color: 'var(--gray)', fontSize: '0.9rem', textAlign: 'center', padding: '10px' }}>No emergency contacts added yet.</p>
            )}

            {isAdding && (
              <div className="settings-option" style={{ flexDirection: 'column', alignItems: 'flex-start', border: '1px solid var(--blue)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>New Contact</h4>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="new-contact-name" className="sr-only">New Contact Name</label>
                  <input id="new-contact-name" type="text" value={editForm.name} onChange={(e) => handleEditFormChange('name', e.target.value)} placeholder="Name" style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white' }} />
                  <label htmlFor="new-contact-phone" className="sr-only">New Contact Phone</label>
                  <input id="new-contact-phone" type="tel" value={editForm.phone} onChange={(e) => handleEditFormChange('phone', e.target.value)} placeholder="Phone" style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white' }} />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button onClick={handleSaveEdit} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }} aria-label="Save contact details">Save</button>
                    <button onClick={cancelEdit} style={{ background: 'transparent', color: 'var(--gray)', border: '1px solid var(--gray)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }} aria-label="Cancel adding contact">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0' }} />

        {/* Medical Profile Section */}
        <div className="settings-section">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><i className="fa-solid fa-notes-medical" style={{ color: 'var(--red)', marginRight: '8px' }} aria-hidden="true"></i>Medical Profile</span>
            <i 
              className={isEditingMedical ? "fa-solid fa-check" : "fa-solid fa-pen"} 
              onClick={isEditingMedical ? saveMedicalProfile : () => setIsEditingMedical(true)} 
              style={{ cursor: 'pointer', color: isEditingMedical ? 'var(--success)' : 'var(--blue)' }}
              aria-label={isEditingMedical ? "Save medical profile" : "Edit medical profile"}
            ></i>
          </h3>
          
          <div className="settings-option" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label htmlFor="settings-blood-group" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Blood Group</label>
                {isEditingMedical ? (
                  <select 
                    id="settings-blood-group"
                    name="bloodGroup" 
                    value={medicalProfile.bloodGroup} 
                    onChange={handleMedicalChange}
                    style={{ width: '100%', backgroundColor: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '4px', color: 'var(--white)', marginTop: '4px' }}
                  >
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '4px 0' }}>{medicalProfile.bloodGroup || 'Not set'}</div>
                )}
              </div>
              
              <div>
                <label htmlFor="settings-allergies" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Known Allergies</label>
                {isEditingMedical ? (
                  <input id="settings-allergies" type="text" name="allergies" value={medicalProfile.allergies} onChange={handleMedicalChange} placeholder="None" style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white', marginTop: '4px' }} />
                ) : (
                  <div style={{ padding: '4px 0' }}>{medicalProfile.allergies || 'None'}</div>
                )}
              </div>
              
              <div>
                <label htmlFor="settings-conditions" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Medical Conditions</label>
                {isEditingMedical ? (
                  <input id="settings-conditions" type="text" name="conditions" value={medicalProfile.conditions} onChange={handleMedicalChange} placeholder="None" style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white', marginTop: '4px' }} />
                ) : (
                  <div style={{ padding: '4px 0' }}>{medicalProfile.conditions || 'None'}</div>
                )}
              </div>
              
              <div>
                <label htmlFor="settings-medications" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Current Medications</label>
                {isEditingMedical ? (
                  <input id="settings-medications" type="text" name="medications" value={medicalProfile.medications} onChange={handleMedicalChange} placeholder="None" style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white', marginTop: '4px' }} />
                ) : (
                  <div style={{ padding: '4px 0' }}>{medicalProfile.medications || 'None'}</div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="settings-doc-name" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Emergency Doctor</label>
                  {isEditingMedical ? (
                    <input id="settings-doc-name" type="text" name="docName" value={medicalProfile.docName} onChange={handleMedicalChange} placeholder="Name" style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white', marginTop: '4px' }} />
                  ) : (
                    <div style={{ padding: '4px 0' }}>{medicalProfile.docName || 'Not set'}</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="settings-doc-phone" style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>Doctor Phone</label>
                  {isEditingMedical ? (
                    <input id="settings-doc-phone" type="tel" name="docPhone" value={medicalProfile.docPhone} onChange={handleMedicalChange} placeholder="Phone" style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--gray)', background: 'var(--navy)', color: 'white', marginTop: '4px' }} />
                  ) : (
                    <div style={{ padding: '4px 0' }}>{medicalProfile.docPhone || 'Not set'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0' }} />

        {/* View Chat History Button */}
        <div 
          className="settings-option" 
          onClick={() => setActiveTab('history')}
          style={{ cursor: 'pointer', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
        >
          <div className="settings-option-left">
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--blue)' }} aria-hidden="true"></i>
            <span style={{ color: 'var(--blue)', fontWeight: 'bold' }}>View Chat History</span>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ color: 'var(--gray)' }}></i>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0' }} />

        {/* Push Alerts Toggle */}
        <div className="settings-option">
          <div className="settings-option-left">
            <i className="fa-solid fa-bell" aria-hidden="true"></i>
            <span>Push Alerts</span>
          </div>
          <label className="toggle-switch" aria-label="Toggle push alerts">
            <input type="checkbox" defaultChecked aria-label="Push alerts toggle" />
            <span className="slider"></span>
          </label>
        </div>

        {/* GPS Tracking Toggle (Disabled if Anonymous Mode is Active) */}
        <div className="settings-option" style={{ opacity: anonymousMode ? 0.6 : 1 }}>
          <div className="settings-option-left">
            <i className="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
            <span>GPS Tracking</span>
          </div>
          <label className="toggle-switch" aria-label="Toggle GPS tracking">
            <input type="checkbox" checked={!anonymousMode} disabled={anonymousMode} readOnly aria-label="GPS tracking toggle" />
            <span className="slider"></span>
          </label>
        </div>

        {/* Anonymous Mode Toggle */}
        <div className="settings-option">
          <div className="settings-option-left">
            <i className="fa-solid fa-user-secret" aria-hidden="true" style={{ color: anonymousMode ? 'var(--success)' : 'var(--blue)' }}></i>
            <span>Anonymous Mode</span>
          </div>
          <label className="toggle-switch" aria-label="Toggle anonymous mode">
            <input 
              type="checkbox" 
              checked={anonymousMode} 
              onChange={(e) => setAnonymousMode(e.target.checked)}
              aria-label="Anonymous mode toggle"
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Privacy Policy Link */}
        <button className="settings-option settings-option-clickable" onClick={() => setActiveTab('privacy')} aria-label="View privacy policy">
          <div className="settings-option-left">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" style={{ color: 'var(--blue)' }}></i>
            <span>Privacy Policy</span>
          </div>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" style={{ color: 'var(--gray)', fontSize: '0.9rem' }}></i>
        </button>

        {/* Long Press Fake Call Toggle */}
        <div className="settings-option">
          <div className="settings-option-left">
            <i className="fa-solid fa-hand-pointer" aria-hidden="true" style={{ color: 'var(--blue)' }}></i>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Long Press Fake Call</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: '2px' }}>Hold screen 5s to trigger</span>
            </div>
          </div>
          <label className="toggle-switch" aria-label="Toggle long press fake call trigger">
            <input 
              type="checkbox" 
              checked={longPressFakeCall} 
              onChange={(e) => setLongPressFakeCall(e.target.checked)}
              aria-label="Long press fake call toggle"
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Voice Output Toggle */}
        <div className="settings-option">
          <div className="settings-option-left">
            <i className="fa-solid fa-volume-high" aria-hidden="true" style={{ color: 'var(--blue)' }}></i>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>Voice Output</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--gray)', marginTop: '2px' }}>Auto-read responses</span>
            </div>
          </div>
          <label className="toggle-switch" aria-label="Toggle auto voice output">
            <input 
              type="checkbox" 
              checked={voiceOutputEnabled} 
              onChange={(e) => setVoiceOutputEnabled(e.target.checked)}
              aria-label="Voice output toggle"
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Safety Call Trigger */}
        <div className="settings-option safety-call-row">
          <div className="settings-option-left">
            <i className="fa-solid fa-phone-flip" aria-hidden="true" style={{ color: 'var(--red)' }}></i>
            <span>Safety Call Trigger</span>
          </div>
          <button 
            className="safety-call-btn" 
            onClick={() => setShowFakeCall(true)}
            aria-label="Simulate incoming safety call"
          >
            <i className="fa-solid fa-phone" aria-hidden="true"></i>
            <span>Call Me</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
