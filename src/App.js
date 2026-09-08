// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import VoiceAssistant from './components/VoiceAssistant';
import MemoryMatchGame from './MemoryMatchGame';
import KichuKichuGame from './KichuKichuGame';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeGame, setActiveGame] = useState(null); // null, 'memory', or 'kichu'
  const [meds, setMeds] = useState([]);
  const [userId] = useState(1); // Hardcoded for now
  const [voiceReply, setVoiceReply] = useState('');

  // ── Fetch medicines from backend ──
  const fetchMedicines = async () => {
    try {
      const res = await fetch('https://smriti-setu-sih-1.onrender.com/api/medication/1');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const mapped = data.map(med => ({
        id: med.id,
        name: med.medicine_name,
        dose: med.dosage || '1 tablet',
        time: med.schedule_time,
        taken: med.is_taken,
        streak: null,
      }));
      const withTimeLabel = mapped.map(med => {
        let timeLabel = 'Morning';
        if (med.time) {
          const hour = parseInt(med.time.split(':')[0]);
          if (hour >= 12 && hour < 17) timeLabel = 'Afternoon';
          else if (hour >= 17) timeLabel = 'Evening';
        }
        return { ...med, time: timeLabel };
      });
      setMeds(withTimeLabel);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      // Fallback hardcoded data
      setMeds([
        { id: 1, name: 'Donepezil 10mg', dose: '1 tablet', time: 'Morning', taken: true, streak: '12d' },
        { id: 2, name: 'Vitamin B12', dose: '500mcg', time: 'Morning', taken: true },
        { id: 3, name: 'Memantine 5mg', dose: '1 tablet', time: 'Afternoon', taken: false },
        { id: 4, name: 'Melatonin 3mg', dose: '1 tablet', time: 'Evening', taken: false },
        { id: 5, name: 'Omega-3', dose: '1000mg', time: 'Evening', taken: false },
      ]);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  // ── Toggle medication taken status ──
  const toggleMed = async (id) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;

    // Optimistic update
    const updated = meds.map(m => m.id === id ? { ...m, taken: !m.taken } : m);
    setMeds(updated);

    // Only call backend if marking as taken (not untaken)
    if (!med.taken) {
      try {
        await fetch('https://smriti-setu-sih-1.onrender.com/api/medication/take', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medication_id: id })
        });
        fetchMedicines(); // refresh from backend
      } catch (error) {
        console.error('Failed to mark medicine as taken:', error);
        fetchMedicines();
      }
    } else {
      // If already taken, just revert (backend doesn't support untake)
      fetchMedicines();
    }
  };

  // ── Voice Assistant Action Handler ──
  const executeAction = (action) => {
    if (!action) return;

    console.log('Executing action:', action);

    switch (action.type) {
      case 'NAVIGATE':
        if (action.target) {
          setActiveTab(action.target);
          // If navigating to game and specific game is requested
          if (action.target === 'game' && action.game) {
            setActiveGame(action.game);
          } else if (action.target === 'game') {
            setActiveGame(null); // show game selector
          }
        }
        if (action.highlight) {
          flashElement(action.highlight);
        }
        break;

      case 'UPDATE_MEDICINE':
        fetchMedicines();
        flashElement('medicine-section');
        break;

      case 'ASK_CONFIRMATION':
        // Show a confirm dialog
        const confirmed = window.confirm(action.message || 'Do you want to mark this medicine as taken?');
        if (confirmed && action.medicationId) {
          // Call the take endpoint
          fetch('https://smriti-setu-sih-1.onrender.com/api/medication/take', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medication_id: action.medicationId })
          })
            .then(() => fetchMedicines())
            .catch(err => console.error(err));
        }
        break;

      case 'OPEN_SOS':
        setActiveTab('support');
        if (action.highlight) {
          setTimeout(() => flashElement(action.highlight), 300);
        }
        break;

      case 'IDLE':
      default:
        // Do nothing, just show the reply
        break;
    }
  };

  // ── Flash Highlight Helper ──
  const flashElement = (id) => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`Element with id "${id}" not found`);
      return;
    }
    el.classList.remove('flash-highlight');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('flash-highlight');
    setTimeout(() => {
      el.classList.remove('flash-highlight');
    }, 3000);
  };

  // ── Helpers for Home tab ──
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDateStr = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const getTakenCount = () => meds.filter(m => m.taken).length;
  const getTotalCount = () => meds.length;

  // ── Render Tab Content ──
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="home-content">
            <div className="greeting-section">
              <h2>{getGreeting()}! 🌤️</h2>
              <p className="date-display">{getDateStr(0)}</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card" id="medicine-section">
                <h3>💊 Today's Medications</h3>
                <p className="stat-number">{getTakenCount()}/{getTotalCount()} taken</p>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${getTotalCount() > 0 ? (getTakenCount() / getTotalCount()) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div className="stat-card" id="memory-card">
                <h3>🧠 Memory Match</h3>
                <p className="stat-number">85%</p>
                <p>Last score</p>
              </div>
              <div className="stat-card">
                <h3>🎮 Games Played</h3>
                <p className="stat-number">12</p>
                <p>This week</p>
              </div>
            </div>

            <div className="quick-actions">
              <button onClick={() => { setActiveTab('game'); setActiveGame(null); }}>🎮 Play Games</button>
              <button onClick={() => { setActiveTab('medicine'); }}>💊 Log Medicine</button>
              <button onClick={() => { setActiveTab('support'); }}>🆘 Emergency</button>
            </div>

            <div className="voice-reply-box">
              <p>🗣️ {voiceReply || 'Say "Game", "Medicine", or "Help" to navigate'}</p>
            </div>
          </div>
        );

      case 'game':
        return (
          <div className="game-tab-content">
            <div className="game-header-bar">
              <h2>🎮 Games</h2>
              {activeGame && (
                <button className="back-btn" onClick={() => setActiveGame(null)}>
                  ← Back to Games
                </button>
              )}
            </div>

            {!activeGame ? (
              <div className="game-selector-grid">
                <div className="game-card" id="memory-card" onClick={() => setActiveGame('memory')}>
                  <h3>🧠 Memory Match</h3>
                  <p>Flip cards and find matching pairs.</p>
                  <span className="game-badge">Easy • Medium • Hard</span>
                </div>
                <div className="game-card" onClick={() => setActiveGame('kichu')}>
                  <h3>🎭 Kichu Kichu Tambulam</h3>
                  <p>NER Theme – Match the words!</p>
                  <span className="game-badge">Cultural • Fun</span>
                </div>
              </div>
            ) : activeGame === 'memory' ? (
              <MemoryMatchGame
                userId={userId}
                onGameEnd={() => {
                  setActiveGame(null);
                  fetchMedicines(); // refresh progress if needed
                }}
              />
            ) : (
              <KichuKichuGame
                userId={userId}
                onGameEnd={() => {
                  setActiveGame(null);
                  fetchMedicines();
                }}
              />
            )}
          </div>
        );

      case 'medicine':
        return (
          <div className="medicine-tab-content" id="medicine-section">
            <h2>💊 Today's Medications</h2>
            <div className="medicine-summary">
              <p>✅ {getTakenCount()} taken of {getTotalCount()} total</p>
              <button className="refresh-btn" onClick={fetchMedicines}>⟳ Refresh</button>
            </div>
            <div className="medicine-list">
              {meds.length === 0 ? (
                <p>No medications found. Add some!</p>
              ) : (
                meds.map(med => (
                  <div key={med.id} className={`medicine-item ${med.taken ? 'taken' : 'pending'}`}>
                    <div className="med-info">
                      <span className="med-name">{med.name}</span>
                      <span className="med-dose">{med.dose}</span>
                      <span className="med-time">{med.time}</span>
                    </div>
                    <button
                      className={`med-toggle-btn ${med.taken ? 'taken-btn' : 'take-btn'}`}
                      onClick={() => toggleMed(med.id)}
                      disabled={med.taken}
                    >
                      {med.taken ? '✓ Taken' : 'Take Now'}
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="add-medicine-form">
              <h4>➕ Add New Medicine (Caregiver)</h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const payload = {
                  user_id: userId,
                  medicine_name: formData.get('name'),
                  dosage: formData.get('dose'),
                  schedule_time: formData.get('time')
                };
                try {
                  await fetch('https://smriti-setu-sih-1.onrender.com/api/medication/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  fetchMedicines();
                  e.target.reset();
                } catch (err) {
                  console.error('Failed to add medicine:', err);
                }
              }}>
                <input name="name" placeholder="Medicine name" required />
                <input name="dose" placeholder="Dosage (e.g. 1 tablet)" required />
                <input name="time" type="time" required />
                <button type="submit">Add Medicine</button>
              </form>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="support-tab-content">
            <h2>🆘 Emergency & Support</h2>
            <div className="emergency-box" id="emergency-box">
              <h3>📞 Helpline Numbers</h3>
              <p><strong>National Helpline:</strong> 1800-XXX-XXXX</p>
              <p><strong>Local Support:</strong> 123-456-7890</p>
              <p><strong>Caregiver Hotline:</strong> 987-654-3210</p>
            </div>
            <div className="support-options">
              <button className="sos-btn">🚨 Call Emergency</button>
              <button className="support-btn">💬 Chat with Caregiver</button>
            </div>
          </div>
        );

      default:
        return <div>Unknown tab</div>;
    }
  };

  // ── Main Render ──
  return (
    <div className="App">
      {/* Navigation Bar */}
      <nav className="nav-bar">
        <div className="nav-logo">🧠 Smriti-Setu</div>
        <div className="nav-tabs">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => { setActiveTab('home'); setActiveGame(null); }}>🏠 Home</button>
          <button className={activeTab === 'game' ? 'active' : ''} onClick={() => { setActiveTab('game'); setActiveGame(null); }}>🎮 Game</button>
          <button className={activeTab === 'medicine' ? 'active' : ''} onClick={() => setActiveTab('medicine')}>💊 Medicine</button>
          <button className={activeTab === 'support' ? 'active' : ''} onClick={() => setActiveTab('support')}>🆘 Support</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {renderContent()}
      </div>

      {/* Voice Assistant Footer */}
      <div className="voice-assistant-footer">
        <VoiceAssistant
          userId={userId}
          onAction={executeAction}
          onReply={setVoiceReply}
        />
      </div>
    </div>
  );
}

export default App;
