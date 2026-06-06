import { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import helplinesData from '../data/stateHelplines.json';
import { showToast } from './Toast';
import LoadingSpinner from './LoadingSpinner';

const categories = [
  { id: 'all', label: 'All Services', icon: 'fa-layer-group' },
  { id: 'emergency', label: 'Emergency', icon: 'fa-bolt' },
  { id: 'medical', label: 'Medical', icon: 'fa-house-medical' },
  { id: 'police', label: 'Police', icon: 'fa-shield-halved' },
  { id: 'fire', label: 'Fire', icon: 'fa-fire' },
  { id: 'women', label: 'Women', icon: 'fa-venus' },
  { id: 'cyber', label: 'Cyber', icon: 'fa-user-shield' },
  { id: 'child', label: 'Child', icon: 'fa-child' },
  { id: 'disaster', label: 'Disaster', icon: 'fa-cloud-showers-water' },
  { id: 'general', label: 'General / Others', icon: 'fa-circle-info' }
];

function HelplineSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState(''); // Empty string means "National / All"
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedNumber, setCopiedNumber] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, [selectedState, selectedCategory]);

  // 1. Compile the list of helplines based on selected state
  const helplinePool = useMemo(() => {
    let pool = [...helplinesData.national.map(h => ({ ...h, isNational: true }))];

    if (selectedState) {
      const stateObj = helplinesData.states.find(s => s.code === selectedState);
      if (stateObj) {
        const stateHelplines = stateObj.specific.map(h => ({
          ...h,
          isNational: false,
          stateName: stateObj.state,
          available: '24/7'
        }));
        // Prioritize state-specific helplines at the top
        pool = [...stateHelplines, ...pool];
      }
    } else {
      // Add all state specific helplines to pool if no state selected
      const allStateHelplines = helplinesData.states.flatMap(stateObj =>
        stateObj.specific.map(h => ({
          ...h,
          isNational: false,
          stateName: stateObj.state,
          available: '24/7'
        }))
      );
      pool = [...pool, ...allStateHelplines];
    }
    return pool;
  }, [selectedState]);

  // 2. Perform search and categorization filtering
  const filteredHelplines = useMemo(() => {
    let results = helplinePool;

    // Filter by category
    if (selectedCategory !== 'all') {
      results = results.filter(h => h.category === selectedCategory);
    }

    // Fuzzy search using Fuse.js if query exists
    if (searchQuery.trim()) {
      const fuse = new Fuse(results, {
        keys: ['name', 'number', 'category', 'stateName'],
        threshold: 0.35,
        ignoreLocation: true
      });
      results = fuse.search(searchQuery).map(res => res.item);
    }

    return results;
  }, [helplinePool, selectedCategory, searchQuery]);

  const handleCopy = (num) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    showToast('Number copied', 'info');
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : 'fa-phone';
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'emergency': return 'var(--red)';
      case 'medical': return 'var(--success)';
      case 'fire': return '#E67E22';
      case 'police': return 'var(--blue)';
      case 'women': return '#9B59B6';
      case 'cyber': return '#1ABC9C';
      case 'child': return '#F1C40F';
      case 'disaster': return '#34495E';
      default: return 'var(--gray)';
    }
  };

  return (
    <div className="helpline-section-wrapper">
      {/* Search Header Area */}
      <div className="search-header-container">
        <h2 className="screen-title">
          <i className="fa-solid fa-phone-volume icon-glow" aria-hidden="true"></i> Emergency Directory
        </h2>
        <p className="section-subtitle">
          Search and dial verified helpline numbers across India.
        </p>

        <div className="search-filter-controls">
          {/* Text Search Bar */}
          <div className="search-bar-wrapper">
            <i className="fa-solid fa-magnifying-glass search-input-icon" aria-hidden="true"></i>
            <label htmlFor="helpline-search-input" className="sr-only">Search helplines</label>
            <input
              id="helpline-search-input"
              type="text"
              placeholder="Search by name, service, or location..."
              className="helpline-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            )}
          </div>

          {/* State Select Dropdown */}
          <div className="state-select-wrapper">
            <i className="fa-solid fa-map-pin state-select-icon" aria-hidden="true"></i>
            <label htmlFor="helpline-state-select" className="sr-only">Filter by state</label>
            <select
              id="helpline-state-select"
              className="helpline-state-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="">All India (National)</option>
              {helplinesData.states.map(stateObj => (
                <option key={stateObj.code} value={stateObj.code}>
                  {stateObj.state}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="category-pills-scroll" role="group" aria-label="Filter by category">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              aria-label={`Filter by ${cat.label}`}
              aria-pressed={selectedCategory === cat.id}
            >
              <i className={`fa-solid ${cat.icon}`} aria-hidden="true"></i>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Directory Results List */}
      <div className="helpline-results-container">
        {loading ? (
          <LoadingSpinner message="Loading helplines..." />
        ) : (
          <>
            <div className="results-meta">
              Showing {filteredHelplines.length} verified contact{filteredHelplines.length !== 1 ? 's' : ''}
            </div>

            {filteredHelplines.length > 0 ? (
              <div className="helpline-cards-grid">
                {filteredHelplines.map((item, idx) => (
                  <div
                    key={`${item.number}-${idx}`}
                    className={`helpline-card ${item.isNational ? 'national-card' : 'state-card'}`}
                  >
                    <div className="card-top-row">
                      <div
                        className="category-badge"
                        style={{
                          backgroundColor: `${getCategoryColor(item.category)}20`,
                          color: getCategoryColor(item.category),
                          border: `1px solid ${getCategoryColor(item.category)}40`
                        }}
                      >
                        <i className={`fa-solid ${getCategoryIcon(item.category)}`} aria-hidden="true"></i>
                        <span>{item.category.toUpperCase()}</span>
                      </div>

                      <span className="scope-badge">
                        {item.isNational ? 'National' : item.stateName || 'State'}
                      </span>
                    </div>

                    <h3 className="helpline-card-title">{item.name}</h3>

                    <div className="helpline-number-display">
                      <span className="number-label">Emergency Line</span>
                      <span className="number-value">{item.number}</span>
                    </div>

                    <div className="card-actions-row">
                      <button
                        className={`card-btn copy-btn ${copiedNumber === item.number ? 'copied' : ''}`}
                        onClick={() => handleCopy(item.number)}
                        aria-label={`Copy number ${item.number}`}
                      >
                        {copiedNumber === item.number ? (
                          <>
                            <i className="fa-solid fa-circle-check" aria-hidden="true"></i> Copied
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-copy" aria-hidden="true"></i> Copy
                          </>
                        )}
                      </button>

                      <a
                        href={`tel:${item.number}`}
                        className="card-btn dial-btn"
                        aria-label={`Call ${item.number}`}
                      >
                        <i className="fa-solid fa-phone" aria-hidden="true"></i> Call Now
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-results-view">
                <i className="fa-solid fa-phone-slash empty-icon" aria-hidden="true"></i>
                <h3>No Helplines Found</h3>
                <p>Try resetting the category filter, search text, or selecting "All India (National)".</p>
                <button
                  className="reset-filters-btn"
                  aria-label="Reset all filters"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedState('');
                    setSelectedCategory('all');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default HelplineSearch;
