// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import VoiceAssistant from './components/VoiceAssistant';
import MemoryMatchGame from './MemoryMatchGame';
import KichuKichuGame from './KichuKichuGame';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeGame, setActiveGame] = useState(null);
  const [meds, setMeds] = useState([]);
  const [userId] = useState(1);
  const [voiceReply, setVoiceReply] = useState('');

  // ── Fetch medicines ──
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
        let displayTime = '';
        if (med.time) {
          const hour = parseInt(med.time.split(':')[0]);
          const mins = med.time.split(':')[1];
          if (hour >= 12 && hour < 17) timeLabel = 'Afternoon';
          else if (hour >= 17) timeLabel = 'Evening';
          // Format time for display (e.g., "2:00 PM")
          const h = hour > 12 ? hour - 12 : hour;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          displayTime = `${h}:${mins} ${ampm}`;
        }
        return { ...med, time: timeLabel, displayTime };
      });
      setMeds(withTimeLabel);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      setMeds([
        { id: 1, name: 'Donepezil 10mg', dose: '1 tablet', time: 'Morning', displayTime: '8:00 AM', taken: true, streak: '12d' },
        { id: 2, name: 'Vitamin B12 500mcg', dose: '1 capsule', time: 'Morning', displayTime: '8:00 AM', taken: true },
        { id: 3, name: 'Memantine 5mg', dose: '1 tablet', time: 'Afternoon', displayTime: '2:00 PM', taken: false },
        { id: 4, name: 'Melatonin 3mg', dose: '1 tablet', time: 'Evening', displayTime: '9:00 PM', taken: false },
        { id: 5, name: 'Omega-3 1000mg', dose: '1 softgel', time: 'Evening', displayTime: '9:00 PM', taken: false },
      ]);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  // ── Toggle medication ──
  const toggleMed = async (id) => {
    const med = meds.find(m => m.id === id);
    if (!med) return;
    const updated = meds.map(m => m.id === id ? { ...m, taken: !m.taken } : m);
    setMeds(updated);
    if (!med.taken) {
      try {
        await fetch('https://smriti-setu-sih-1.onrender.com/api/medication/take', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medication_id: id })
        });
        fetchMedicines();
      } catch (error) {
        console.error('Failed to mark medicine as taken:', error);
        fetchMedicines();
      }
    } else {
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
          if (action.target === 'game' && action.game) {
            setActiveGame(action.game);
          } else if (action.target === 'game') {
            setActiveGame(null);
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
        const confirmed = window.confirm(action.message || 'Do you want to mark this medicine as taken?');
        if (confirmed && action.medicationId) {
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
      default:
        break;
    }
  };

  // ── Flash Highlight ──
  const flashElement = (id) => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`Element with id "${id}" not found`);
      return;
    }
    el.classList.remove('flash-highlight');
    void el.offsetWidth;
    el.classList.add('flash-highlight');
    setTimeout(() => {
      el.classList.remove('flash-highlight');
    }, 3000);
  };

  // ── Helpers ──
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

  // ── Weekly Report ──
  const generateWeeklyReport = async () => {
    try {
      const res = await fetch('https://smriti-setu-sih-1.onrender.com/api/progress/1');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.length === 0) {
        alert('📊 No game data yet. Play some games!');
        return;
      }
      const avg = data.reduce((sum, d) => sum + d.avg_score, 0) / data.length;
      alert(`📊 Weekly Avg: ${Math.round(avg)}% across ${data.length} days`);
    } catch (error) {
      alert('📊 Weekly Report: 82% average (sample data)');
    }
  };

  // ── Render Content ──
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="page-container">
            <header className="page-header animate-in">
              <div className="greeting-text">{getGreeting()}</div>
              <h1>NER Memory Companion</h1>
            </header>

            <div className="home-grid">
              {/* LEFT COLUMN */}
              <div className="col-left">
                <div className="section-label animate-in delay-1">Daily Exercise Scores</div>
                <div className="exercise-card animate-in delay-1">
                  <div className="card-head">
                    <span className="card-title">Yesterday's Summary</span>
                    <span className="card-date">{getDateStr(-1)}</span>
                  </div>
                  <div className="score-row">
                    <div className="score-item accent-bg">
                      <div className="score-label">Memory</div>
                      <div className="score-ring">
                        <svg viewBox="0 0 36 36">
                          <circle className="ring-bg" cx="18" cy="18" r="15.5"></circle>
                          <circle className="ring-fill accent" cx="18" cy="18" r="15.5"
                            stroke-dasharray="97.4" stroke-dashoffset="14.6"></circle>
                        </svg>
                        <span className="score-value">85%</span>
                      </div>
                      <div className="score-percent">+3% from last week</div>
                    </div>
                    <div className="score-item coral-bg">
                      <div className="score-label">Puzzle Skills</div>
                      <div className="score-ring">
                        <svg viewBox="0 0 36 36">
                          <circle className="ring-bg" cx="18" cy="18" r="15.5"></circle>
                          <circle className="ring-fill coral" cx="18" cy="18" r="15.5"
                            stroke-dasharray="97.4" stroke-dashoffset="21.4"></circle>
                        </svg>
                        <span className="score-value">78%</span>
                      </div>
                      <div className="score-percent">+5% from last week</div>
                    </div>
                  </div>
                </div>

                <div className="section-label animate-in delay-2">Quick Actions</div>
                <div className="quick-actions animate-in delay-2">
                  <div className="action-card" onClick={() => setActiveTab('exercise')}>
                    <div className="action-icon teal"><i className="fas fa-brain"></i></div>
                    <div className="action-title">Start Exercise</div>
                    <div className="action-sub">3 new sessions</div>
                  </div>
                  <div className="action-card" onClick={() => { setActiveTab('game'); setActiveGame(null); }}>
                    <div className="action-icon purple"><i className="fas fa-puzzle-piece"></i></div>
                    <div className="action-title">Play Games</div>
                    <div className="action-sub">Sharpen memory</div>
                  </div>
                  <div className="action-card" onClick={() => setActiveTab('medicine')}>
                    <div className="action-icon coral"><i className="fas fa-pills"></i></div>
                    <div className="action-title">Log Medicine</div>
                    <div className="action-sub">{getTotalCount() - getTakenCount()} remaining</div>
                  </div>
                  <div className="action-card" onClick={generateWeeklyReport}>
                    <div className="action-icon amber"><i className="fas fa-chart-line"></i></div>
                    <div className="action-title">Weekly Report</div>
                    <div className="action-sub">View progress</div>
                  </div>
                </div>

                <div className="support-banner animate-in delay-3" onClick={() => setActiveTab('support')}>
                  <div className="support-icon"><i className="fas fa-headset"></i></div>
                  <div className="support-text">
                    <div className="support-title">Support 24/7 Helpline</div>
                    <div className="support-num">1800-XXX-XXXX</div>
                  </div>
                  <span className="support-arrow"><i className="fas fa-chevron-right"></i></span>
                </div>

                <div className="voice-reply-box animate-in delay-3">
                  <p><span className="reply-label">🗣️ AI:</span> {voiceReply || 'Say "Game", "Medicine", or "Help" to navigate'}</p>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="col-right">
                <div className="section-label animate-in delay-1">Daily Medicine Check</div>
                <div className="medicine-card animate-in delay-1" id="medicine-section">
                  <div className="card-head">
                    <span className="card-title">Today's Medications</span>
                    <span className="card-date">{getDateStr(0)}</span>
                  </div>

                  {meds.length === 0 ? (
                    <p style={{ color: '#8E8A82', textAlign: 'center', padding: '20px' }}>
                      No medications scheduled
                    </p>
                  ) : (
                    <>
                      {['Morning', 'Afternoon', 'Evening'].map(timeSlot => {
                        const items = meds.filter(m => m.time === timeSlot);
                        if (items.length === 0) return null;
                        const icons = {
                          Morning: <i className="fas fa-sun" style={{ color: '#D4A017' }}></i>,
                          Afternoon: <i className="fas fa-cloud-sun" style={{ color: '#E8734A' }}></i>,
                          Evening: <i className="fas fa-moon" style={{ color: '#7C3AED' }}></i>
                        };
                        return (
                          <div className="med-time-group" key={timeSlot}>
                            <div className="med-time-label">
                              {icons[timeSlot]} {timeSlot}
                            </div>
                            {items.map(med => (
                              <div 
                                key={med.id} 
                                className={`med-item ${med.taken ? 'completed' : ''}`}
                                onClick={() => toggleMed(med.id)}
                              >
                                <div className="med-check"><i className="fas fa-check"></i></div>
                                <span className="med-name">{med.name}</span>
                                <span className="med-dose">{med.dose}</span>
                                {med.displayTime && <span className="med-time">{med.displayTime}</span>}
                                {med.streak && <span className="med-streak"><i className="fas fa-fire"></i> {med.streak}</span>}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'exercise':
        return (
          <div className="page-container">
            <header className="page-header animate-in">
              <div className="greeting-text">Train Your Mind</div>
              <h1>Exercises</h1>
            </header>
            <div className="hero-banner teal animate-in delay-1">
              <h2>Weekly Streak</h2>
              <p>Keep going — consistency is key!</p>
              <div className="hero-stats">
                <div className="hero-stat-item"><div className="hero-stat-val">7</div><div className="hero-stat-lbl">Day Streak</div></div>
                <div className="hero-stat-item"><div className="hero-stat-val">42</div><div className="hero-stat-lbl">Sessions</div></div>
                <div className="hero-stat-item"><div className="hero-stat-val">82%</div><div className="hero-stat-lbl">Avg Score</div></div>
              </div>
            </div>
            <div className="section-label animate-in delay-2">Available Exercises</div>
            <div className="list-card-grid">
              {['Memory Recall', 'Word Association', 'Face Recognition', 'Pattern Sequence', 'Story Recall', 'Number Sequences'].map((name, i) => (
                <div key={i} className="list-card animate-in delay-2" onClick={() => alert(`Starting ${name}...`)}>
                  <div className="list-card-icon" style={{ background: '#E6F5F0', color: '#0D9B76' }}><i className="fas fa-brain"></i></div>
                  <div className="list-card-info"><div className="list-card-name">{name}</div><div className="list-card-desc">Cognitive exercise</div></div>
                  <span className="list-card-arrow"><i className="fas fa-chevron-right"></i></span>
                </div>
              ))}
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
              <MemoryMatchGame userId={userId} onGameEnd={() => { setActiveGame(null); fetchMedicines(); }} />
            ) : (
              <KichuKichuGame userId={userId} onGameEnd={() => { setActiveGame(null); fetchMedicines(); }} />
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
                      <span className="med-time">{med.displayTime || med.time}</span>
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
      {/* Background Atmosphere */}
      <div className="bg-atmosphere">
        <div className="bg-blob"></div>
        <div className="bg-blob"></div>
        <div className="bg-blob"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="nav-bar">
        <div className="nav-logo">
          <span className="logo-icon"><i className="fas fa-house"></i></span>
          Smriti-Setu
        </div>
        <div className="nav-tabs">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={() => { setActiveTab('home'); setActiveGame(null); }}>🏠 Home</button>
          <button className={activeTab === 'exercise' ? 'active' : ''} onClick={() => setActiveTab('exercise')}>🧠 Exercise</button>
          <button className={activeTab === 'game' ? 'active' : ''} onClick={() => { setActiveTab('game'); setActiveGame(null); }}>🎮 Game</button>
          <button className={activeTab === 'medicine' ? 'active' : ''} onClick={() => setActiveTab('medicine')}>💊 Medicine</button>
          <button className={activeTab === 'support' ? 'active' : ''} onClick={() => setActiveTab('support')}>🆘 Support</button>
        </div>
        <div className="nav-right">
          <button className="icon-btn" onClick={() => alert('Profile settings')}>
            <i className="fas fa-user"></i>
          </button>
          <VoiceAssistant
            userId={userId}
            onAction={executeAction}
            onReply={setVoiceReply}
          />
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
