// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import VoiceAssistant from './components/VoiceAssistant';
import MemoryMatchGame from './MemoryMatchGame';
import KichuKichuGame from './KichuKichuGame';
import Login from './components/Login';
import Register from './components/Register';

function App() {
  // ── Authentication state ──
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  // ── App state ──
  const [activeTab, setActiveTab] = useState('home');
  const [activeGame, setActiveGame] = useState(null);
  const [meds, setMeds] = useState([]);
  const [voiceReply, setVoiceReply] = useState('');

  // ── Check authentication on mount ──
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('https://smriti-setu-sih-1.onrender.com/api/auth/me', {
          credentials: 'include'
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.log('Not authenticated');
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // ── Fetch medicines (depends on currentUser) ──
  const fetchMedicines = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`https://smriti-setu-sih-1.onrender.com/api/medication/${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const mapped = data.map(med => {
        let timeLabel = 'Morning';
        let displayTime = '';
        if (med.schedule_time) {
          const hour = parseInt(med.schedule_time.split(':')[0]);
          const mins = med.schedule_time.split(':')[1];
          if (hour >= 12 && hour < 17) timeLabel = 'Afternoon';
          else if (hour >= 17) timeLabel = 'Evening';
          const h = hour > 12 ? hour - 12 : hour;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          displayTime = `${h}:${mins} ${ampm}`;
        }
        return {
          id: med.id,
          name: med.medicine_name,
          dose: med.dosage || '1 tablet',
          time: timeLabel,
          displayTime: displayTime,
          taken: med.is_taken,
          streak: null,
        };
      });
      setMeds(mapped);
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
    if (currentUser) {
      fetchMedicines();
    }
  }, [currentUser]);

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
    switch (action.type) {
      case 'NAVIGATE':
        if (action.target) {
          setActiveTab(action.target);
          if (action.target === 'game' && action.game) setActiveGame(action.game);
          else if (action.target === 'game') setActiveGame(null);
        }
        if (action.highlight) flashElement(action.highlight);
        break;
      case 'UPDATE_MEDICINE':
        fetchMedicines();
        flashElement('medicine-section');
        break;
      case 'ASK_CONFIRMATION':
        if (window.confirm(action.message || 'Mark this medicine as taken?')) {
          const pending = meds.find(m => !m.taken);
          if (pending) toggleMed(pending.id);
          else alert('All medicines taken!');
        }
        break;
      case 'OPEN_SOS':
        setActiveTab('support');
        if (action.highlight) setTimeout(() => flashElement(action.highlight), 300);
        break;
      default: break;
    }
  };

  const flashElement = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('flash-highlight');
    void el.offsetWidth;
    el.classList.add('flash-highlight');
    setTimeout(() => el.classList.remove('flash-highlight'), 3000);
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

  const generateWeeklyReport = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`https://smriti-setu-sih-1.onrender.com/api/progress/${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.length === 0) { alert('📊 No game data yet. Play some games!'); return; }
      const avg = data.reduce((sum, d) => sum + d.avg_score, 0) / data.length;
      alert(`📊 Weekly Avg: ${Math.round(avg)}% across ${data.length} days`);
    } catch (error) {
      alert('📊 Weekly Report: 82% average (sample data)');
    }
  };

  // ── Auth handlers ──
  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleRegister = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('https://smriti-setu-sih-1.onrender.com/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveTab('home');
    setActiveGame(null);
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

              <div className="col-right">
                <div className="section-label animate-in delay-1">Daily Medicine Check</div>
                <div className="medicine-card animate-in delay-1" id="medicine-section">
                  <div className="card-head">
                    <span className="card-title">Today's Medications</span>
                    <span className="card-date">{getDateStr(0)}</span>
                  </div>
                  {meds.length === 0 ? (
                    <p style={{ color: '#8E8A82', textAlign: 'center', padding: '20px' }}>No medications scheduled</p>
                  ) : (
                    ['Morning', 'Afternoon', 'Evening'].map(slot => {
                      const items = meds.filter(m => m.time === slot);
                      if (items.length === 0) return null;
                      const icons = {
                        Morning: <i className="fas fa-sun" style={{ color: '#D4A017' }}></i>,
                        Afternoon: <i className="fas fa-cloud-sun" style={{ color: '#E8734A' }}></i>,
                        Evening: <i className="fas fa-moon" style={{ color: '#7C3AED' }}></i>
                      };
                      return (
                        <div className="med-time-group" key={slot}>
                          <div className="med-time-label">{icons[slot]} {slot}</div>
                          {items.map(med => (
                            <div key={med.id} className={`med-item ${med.taken ? 'completed' : ''}`} onClick={() => toggleMed(med.id)}>
                              <div className="med-check"><i className="fas fa-check"></i></div>
                              <span className="med-name">{med.name}</span>
                              <span className="med-dose">{med.dose}</span>
                              {med.displayTime && <span className="med-time">{med.displayTime}</span>}
                              {med.streak && <span className="med-streak"><i className="fas fa-fire"></i> {med.streak}</span>}
                            </div>
                          ))}
                        </div>
                      );
                    })
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
              {activeGame && <button className="back-btn" onClick={() => setActiveGame(null)}>← Back</button>}
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
              <MemoryMatchGame userId={currentUser.id} onGameEnd={() => { setActiveGame(null); fetchMedicines(); }} />
            ) : (
              <KichuKichuGame userId={currentUser.id} onGameEnd={() => { setActiveGame(null); fetchMedicines(); }} />
            )}
          </div>
        );

      case 'medicine':
        return (
          <div className="medicine-tab-content" id="medicine-section">
            <header className="page-header animate-in">
              <div className="greeting-text">Stay On Track</div>
              <h1>💊 Medications</h1>
            </header>

            <div className="hero-banner coral animate-in delay-1">
              <h2>Today's Progress</h2>
              <p>{getTakenCount()} of {getTotalCount()} medications taken</p>
              <div className="hero-progress-bar">
                <div className="hero-progress-fill" style={{ width: `${getTotalCount() > 0 ? (getTakenCount() / getTotalCount()) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="section-label animate-in delay-2">Schedule</div>

            {meds.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-pills" style={{ fontSize: '48px', color: '#8E8A82', marginBottom: '16px' }}></i>
                <p style={{ color: '#8E8A82', textAlign: 'center' }}>No medications scheduled. Add one below!</p>
              </div>
            ) : (
              ['Morning', 'Afternoon', 'Evening'].map(slot => {
                const items = meds.filter(m => m.time === slot);
                if (items.length === 0) return null;
                const icons = {
                  Morning: { icon: 'fa-sun', color: '#D4A017', bg: '#FFF7E6' },
                  Afternoon: { icon: 'fa-cloud-sun', color: '#E8734A', bg: '#FFF0EB' },
                  Evening: { icon: 'fa-moon', color: '#7C3AED', bg: '#F3EEFF' }
                };
                const allTaken = items.every(m => m.taken);
                return (
                  <div className="med-card-full animate-in delay-2" key={slot}>
                    <div className="time-header">
                      <i className={`fas ${icons[slot].icon}`} style={{ color: icons[slot].color }}></i>
                      <span>{slot}</span>
                      <span className={`time-status ${allTaken ? 'done' : 'pending'}`}>
                        {allTaken ? '✅ Completed' : '⏳ Pending'}
                      </span>
                    </div>
                    {items.map(med => (
                      <div key={med.id} className={`pill-item ${med.taken ? 'taken' : ''}`} onClick={() => toggleMed(med.id)}>
                        <div className="pill-check"><i className="fas fa-check"></i></div>
                        <span className="pill-name">{med.name}</span>
                        <span className="pill-dosage">{med.dose}</span>
                        {med.displayTime && <span className="pill-time">{med.displayTime}</span>}
                      </div>
                    ))}
                  </div>
                );
              })
            )}

            <div className="add-medicine-form animate-in delay-3">
              <h4>➕ Add New Medicine</h4>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const payload = {
                  user_id: currentUser.id,
                  medicine_name: fd.get('name'),
                  dosage: fd.get('dose'),
                  schedule_time: fd.get('time')
                };
                try {
                  await fetch('https://smriti-setu-sih-1.onrender.com/api/medication/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  fetchMedicines();
                  e.target.reset();
                } catch (err) { console.error(err); }
              }}>
                <input name="name" placeholder="Medicine name" required />
                <input name="dose" placeholder="Dosage (e.g. 1 tablet)" required />
                <input name="time" type="time" required />
                <button type="submit"><i className="fas fa-plus"></i> Add</button>
              </form>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="support-tab-content">
            <header className="page-header animate-in">
              <div className="greeting-text">We're Here For You</div>
              <h1>🆘 Support</h1>
            </header>

            <div className="hero-banner amber animate-in delay-1">
              <h2>24/7 Assistance</h2>
              <p>Help is always just a click away</p>
              <div className="hero-stats">
                <div className="hero-stat-item">
                  <div className="hero-stat-val">24/7</div>
                  <div className="hero-stat-lbl">Available</div>
                </div>
                <div className="hero-stat-item">
                  <div className="hero-stat-val">100%</div>
                  <div className="hero-stat-lbl">Confidential</div>
                </div>
                <div className="hero-stat-item">
                  <div className="hero-stat-val">Free</div>
                  <div className="hero-stat-lbl">Support</div>
                </div>
              </div>
            </div>

            <div className="section-label animate-in delay-2">Contact & Resources</div>

            <div className="support-grid">
              <div className="support-option animate-in delay-2" onClick={() => alert('Calling helpline...')}>
                <div className="support-opt-icon" style={{ background: '#E6F5F0', color: '#0D9B76' }}>
                  <i className="fas fa-phone"></i>
                </div>
                <div className="support-opt-info">
                  <div className="support-opt-name">📞 Helpline</div>
                  <div className="support-opt-desc">1800-XXX-XXXX — Available 24/7</div>
                </div>
                <span className="support-opt-arrow"><i className="fas fa-chevron-right"></i></span>
              </div>

              <div className="support-option animate-in delay-2" onClick={() => alert('Opening live chat...')}>
                <div className="support-opt-icon" style={{ background: '#FFF0EB', color: '#E8734A' }}>
                  <i className="fas fa-comments"></i>
                </div>
                <div className="support-opt-info">
                  <div className="support-opt-name">💬 Live Chat</div>
                  <div className="support-opt-desc">Chat with a care specialist</div>
                </div>
                <span className="support-opt-arrow"><i className="fas fa-chevron-right"></i></span>
              </div>

              <div className="support-option animate-in delay-3" onClick={() => alert('Opening FAQ...')}>
                <div className="support-opt-icon" style={{ background: '#FFF7E6', color: '#D4A017' }}>
                  <i className="fas fa-circle-question"></i>
                </div>
                <div className="support-opt-info">
                  <div className="support-opt-name">❓ FAQ & Guides</div>
                  <div className="support-opt-desc">Common questions answered</div>
                </div>
                <span className="support-opt-arrow"><i className="fas fa-chevron-right"></i></span>
              </div>

              <div className="support-option animate-in delay-3" onClick={() => alert('Scheduling callback...')}>
                <div className="support-opt-icon" style={{ background: '#F3EEFF', color: '#7C3AED' }}>
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="support-opt-info">
                  <div className="support-opt-name">📅 Schedule Callback</div>
                  <div className="support-opt-desc">Request a call at your convenience</div>
                </div>
                <span className="support-opt-arrow"><i className="fas fa-chevron-right"></i></span>
              </div>

              <div className="support-option animate-in delay-4" onClick={() => alert('Opening community...')}>
                <div className="support-opt-icon" style={{ background: '#E6F0FF', color: '#2563EB' }}>
                  <i className="fas fa-users"></i>
                </div>
                <div className="support-opt-info">
                  <div className="support-opt-name">👥 Community Forum</div>
                  <div className="support-opt-desc">Connect with others on the same journey</div>
                </div>
                <span className="support-opt-arrow"><i className="fas fa-chevron-right"></i></span>
              </div>

              <div className="support-option animate-in delay-4" onClick={() => alert('Opening resources...')}>
                <div className="support-opt-icon" style={{ background: '#E6F5F0', color: '#0D9B76' }}>
                  <i className="fas fa-book-medical"></i>
                </div>
                <div className="support-opt-info">
                  <div className="support-opt-name">📚 Educational Resources</div>
                  <div className="support-opt-desc">Articles and videos about memory care</div>
                </div>
                <span className="support-opt-arrow"><i className="fas fa-chevron-right"></i></span>
              </div>
            </div>

            <div className="emergency-box animate-in delay-5" id="emergency-box">
              <div className="emergency-icon"><i className="fas fa-triangle-exclamation"></i></div>
              <div className="em-title">🚨 Emergency?</div>
              <div className="em-desc">Call 911 or your local emergency number immediately</div>
              <button className="emergency-call-btn" onClick={() => alert('Calling emergency...')}>
                <i className="fas fa-phone"></i> Call Emergency
              </button>
            </div>
          </div>
        );

      default: return <div>Unknown tab</div>;
    }
  };

  // ── Show loading while checking auth ──
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // ── Show Login/Register if not authenticated ──
  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper">
        {showLogin ? (
          <Login onLogin={handleLogin} onSwitchToRegister={() => setShowLogin(false)} />
        ) : (
          <Register onRegister={handleRegister} onSwitchToLogin={() => setShowLogin(true)} />
        )}
      </div>
    );
  }

  // ── Main App (authenticated) ──
  return (
    <div className="App">
      <div className="bg-atmosphere">
        <div className="bg-blob"></div>
        <div className="bg-blob"></div>
        <div className="bg-blob"></div>
      </div>

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
          <span className="user-name">{currentUser?.name || 'User'}</span>
          <button className="icon-btn" onClick={() => alert(`Profile: ${currentUser?.name || 'User'}`)}>
            <i className="fas fa-user"></i>
          </button>
          <button className="icon-btn" onClick={handleLogout} style={{ color: '#DC2626' }}>
            <i className="fas fa-sign-out-alt"></i>
          </button>
          <VoiceAssistant userId={currentUser?.id} onAction={executeAction} onReply={setVoiceReply} />
        </div>
      </nav>

      <div className="main-content">{renderContent()}</div>
    </div>
  );
}

export default App;
