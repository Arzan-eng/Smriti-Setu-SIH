import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  // ── Greeting ──
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // ── Dates ──
  const getDateStr = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  // ── Medicine state ──
  const [meds, setMeds] = useState([
    { id: 1, name: 'Donepezil 10mg', dose: '1 tablet', time: 'Morning', taken: true, streak: '12d' },
    { id: 2, name: 'Vitamin B12', dose: '500mcg', time: 'Morning', taken: true },
    { id: 3, name: 'Memantine 5mg', dose: '1 tablet', time: 'Afternoon', taken: false },
    { id: 4, name: 'Melatonin 3mg', dose: '1 tablet', time: 'Evening', taken: false },
    { id: 5, name: 'Omega-3', dose: '1000mg', time: 'Evening', taken: false },
  ]);

  const toggleMed = (id) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  const getTakenCount = () => meds.filter(m => m.taken).length;
  const getTotalCount = () => meds.length;

  // ── Ring animation ──
  useEffect(() => {
    const rings = document.querySelectorAll('.ring-fill');
    rings.forEach(ring => {
      const target = parseFloat(ring.dataset.target);
      ring.style.strokeDashoffset = target;
    });
  }, [activeTab]);

  // ── Render page ──
  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="page-container">
            <header className="page-header animate-in">
              <div className="greeting-text">{getGreeting()}</div>
              <h1>NER Memory Companion</h1>
            </header>

            <div className="home-grid">
              {/* Left column */}
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
                          <circle className="ring-bg" cx="18" cy="18" r="15.5" />
                          <circle className="ring-fill accent" cx="18" cy="18" r="15.5"
                            strokeDasharray="97.4" strokeDashoffset="97.4" data-target="14.6" />
                        </svg>
                        <span className="score-value">85%</span>
                      </div>
                      <div className="score-percent">+3% from last week</div>
                    </div>
                    <div className="score-item coral-bg">
                      <div className="score-label">Puzzle Skills</div>
                      <div className="score-ring">
                        <svg viewBox="0 0 36 36">
                          <circle className="ring-bg" cx="18" cy="18" r="15.5" />
                          <circle className="ring-fill coral" cx="18" cy="18" r="15.5"
                            strokeDasharray="97.4" strokeDashoffset="97.4" data-target="21.4" />
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
                  <div className="action-card" onClick={() => setActiveTab('game')}>
                    <div className="action-icon purple"><i className="fas fa-puzzle-piece"></i></div>
                    <div className="action-title">Play Games</div>
                    <div className="action-sub">Sharpen memory</div>
                  </div>
                  <div className="action-card" onClick={() => setActiveTab('medicine')}>
                    <div className="action-icon coral"><i className="fas fa-pills"></i></div>
                    <div className="action-title">Log Medicine</div>
                    <div className="action-sub">{getTotalCount() - getTakenCount()} remaining</div>
                  </div>
                  <div className="action-card" onClick={() => alert('Weekly report generated')}>
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
              </div>

              {/* Right column – Medicine check */}
              <div className="col-right">
                <div className="section-label animate-in delay-1">Daily Medicine Check</div>
                <div className="medicine-card animate-in delay-1">
                  <div className="card-head">
                    <span className="card-title">Today's Medications</span>
                    <span className="card-date">{getDateStr(0)}</span>
                  </div>

                  {['Morning', 'Afternoon', 'Evening'].map(time => {
                    const items = meds.filter(m => m.time === time);
                    if (items.length === 0) return null;
                    const icon = time === 'Morning' ? 'fa-sun' : time === 'Afternoon' ? 'fa-cloud-sun' : 'fa-moon';
                    const color = time === 'Morning' ? '#D4A017' : time === 'Afternoon' ? '#E8734A' : '#7C3AED';
                    return (
                      <div className="med-time-group" key={time}>
                        <div className="med-time-label"><i className={`fas ${icon}`} style={{ color }}></i> {time}</div>
                        {items.map(med => (
                          <div
                            key={med.id}
                            className={`med-item ${med.taken ? 'completed' : ''}`}
                            onClick={() => toggleMed(med.id)}
                          >
                            <div className="med-check"><i className="fas fa-check"></i></div>
                            <span className="med-name">{med.name}</span>
                            {med.streak ? <span className="med-streak"><i className="fas fa-fire"></i> {med.streak}</span> :
                              <span className="med-dose">{med.dose}</span>}
                          </div>
                        ))}
                      </div>
                    );
                  })}
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
                  <div className="list-card-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><i className="fas fa-brain"></i></div>
                  <div className="list-card-info"><div className="list-card-name">{name}</div><div className="list-card-desc">Practice your {name.toLowerCase()}</div></div>
                  <span className="list-card-arrow"><i className="fas fa-chevron-right"></i></span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'medicine':
        return (
          <div className="page-container">
            <header className="page-header animate-in">
              <div className="greeting-text">Stay On Track</div>
              <h1>Medicine</h1>
            </header>
            <div className="hero-banner coral animate-in delay-1">
              <h2>Today's Progress</h2>
              <p>{getTakenCount()} of {getTotalCount()} medications taken</p>
              <div className="hero-progress-bar">
                <div className="hero-progress-fill" style={{ width: `${(getTakenCount() / getTotalCount()) * 100}%` }}></div>
              </div>
            </div>
            <div className="section-label animate-in delay-2">Schedule</div>
            <div className="med-page-grid">
              {['Morning', 'Afternoon', 'Evening'].map(time => {
                const items = meds.filter(m => m.time === time);
                if (items.length === 0) return null;
                const allTaken = items.every(m => m.taken);
                const icon = time === 'Morning' ? 'fa-sun' : time === 'Afternoon' ? 'fa-cloud-sun' : 'fa-moon';
                const color = time === 'Morning' ? '#D4A017' : time === 'Afternoon' ? '#E8734A' : '#7C3AED';
                const statusClass = allTaken ? 'done' : 'pending';
                const statusText = allTaken ? 'Completed' : 'Pending';
                return (
                  <div key={time} className="med-card-full animate-in delay-2">
                    <div className="time-header">
                      <i className={`fas ${icon}`} style={{ color }}></i>
                      <span>{time}</span>
                      <span className={`time-status ${statusClass}`}>{statusText}</span>
                    </div>
                    {items.map(med => (
                      <div key={med.id} className={`pill-item ${med.taken ? 'taken' : ''}`} onClick={() => toggleMed(med.id)}>
                        <div className="pill-check"><i className="fas fa-check"></i></div>
                        <span className="pill-name">{med.name}</span>
                        <span className="pill-dosage">{med.dose}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'game':
        return (
          <div className="page-container">
            <header className="page-header animate-in">
              <div className="greeting-text">Fun &amp; Challenge</div>
              <h1>Games</h1>
            </header>
            <div className="hero-banner purple animate-in delay-1">
              <h2>Brain Training Games</h2>
              <p>Improve cognitive skills through play</p>
            </div>
            <div className="section-label animate-in delay-2">All Games</div>
            <div className="list-card-grid">
              {['Memory Match', 'Sudoku Light', 'Word Search', 'Color Match', 'Jigsaw Puzzle', 'Simon Says'].map((name, i) => (
                <div key={i} className="list-card animate-in delay-2" onClick={() => alert(`Launching ${name}...`)}>
                  <div className="list-card-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><i className="fas fa-puzzle-piece"></i></div>
                  <div className="list-card-info"><div className="list-card-name">{name}</div><div className="list-card-desc">Play and improve</div></div>
                  {i === 0 && <span className="list-card-badge">Popular</span>}
                  {i === 1 && <span className="list-card-badge orange">New</span>}
                </div>
              ))}
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="page-container">
            <header className="page-header animate-in">
              <div className="greeting-text">We're Here For You</div>
              <h1>Support</h1>
            </header>
            <div className="hero-banner amber animate-in delay-1">
              <h2>24/7 Assistance</h2>
              <p>Help is always just a click away</p>
            </div>
            <div className="section-label animate-in delay-2">Contact &amp; Resources</div>
            <div className="support-grid">
              {['Helpline', 'Live Chat', 'FAQ & Guides', 'Schedule Callback', 'Community Forum', 'Educational Resources'].map((name, i) => (
                <div key={i} className="support-option animate-in delay-2" onClick={() => alert(`Opening ${name}...`)}>
                  <div className="support-opt-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><i className="fas fa-phone"></i></div>
                  <div className="support-opt-info"><div className="support-opt-name">{name}</div><div className="support-opt-desc">Click to access</div></div>
                  <span style={{ color: 'var(--muted)' }}><i className="fas fa-chevron-right"></i></span>
                </div>
              ))}
            </div>
            <div className="emergency-box animate-in delay-5">
              <div className="em-title">🚨 Emergency?</div>
              <div className="em-desc">Call 911 or your local emergency number</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App">
      {/* Background */}
      <div className="bg-atmosphere">
        <div className="bg-blob"></div>
        <div className="bg-blob"></div>
        <div className="bg-blob"></div>
      </div>
      <canvas id="particleCanvas"></canvas>

      {/* Navigation */}
      <nav className="top-nav" id="topNav">
        <div className="nav-brand" onClick={() => setActiveTab('home')}>
          <div className="nav-brand-icon"><i className="fas fa-house"></i></div>
          <span>NER Memory</span>
        </div>
        <ul className="nav-links">
          {['home', 'exercise', 'medicine', 'game', 'support'].map(tab => (
            <li key={tab} className={`nav-link ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              <i className={`fas fa-${tab === 'home' ? 'house' : tab === 'exercise' ? 'brain' : tab === 'medicine' ? 'pills' : tab === 'game' ? 'puzzle-piece' : 'headset'}`}></i>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </li>
          ))}
        </ul>
        <div className="nav-right">
          <div className="icon-btn" onClick={() => alert('Profile settings')}><i className="fas fa-user"></i></div>
          <div className="icon-btn ai-btn" onClick={() => alert('AI Assistant ready')}>
            <i className="fas fa-robot"></i>
            <span className="ai-pulse"></span>
          </div>
          <div className="hamburger" id="hamburger" onClick={() => {
            const menu = document.getElementById('mobileMenu');
            const overlay = document.getElementById('mobileOverlay');
            const hamburger = document.getElementById('hamburger');
            menu.classList.toggle('open');
            overlay.classList.toggle('show');
            hamburger.classList.toggle('open');
          }}>
            <span></span><span></span><span></span>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className="mobile-menu-overlay" id="mobileOverlay" onClick={() => {
        document.getElementById('mobileMenu').classList.remove('open');
        document.getElementById('mobileOverlay').classList.remove('show');
        document.getElementById('hamburger').classList.remove('open');
      }}></div>
      <div className="mobile-menu" id="mobileMenu">
        {['home', 'exercise', 'medicine', 'game', 'support'].map(tab => (
          <div key={tab} className={`mobile-link ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); document.getElementById('mobileMenu').classList.remove('open'); document.getElementById('mobileOverlay').classList.remove('show'); document.getElementById('hamburger').classList.remove('open'); }}>
            <i className={`fas fa-${tab === 'home' ? 'house' : tab === 'exercise' ? 'brain' : tab === 'medicine' ? 'pills' : tab === 'game' ? 'puzzle-piece' : 'headset'}`}></i>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      {/* Main content */}
      <main className="main-content">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        NER Memory Companion &mdash; Supporting cognitive wellness every day.
        <a href="#" onClick={(e) => { e.preventDefault(); alert('Privacy policy'); }}>Privacy</a> &middot;
        <a href="#" onClick={(e) => { e.preventDefault(); alert('Terms of service'); }}>Terms</a>
      </footer>
    </div>
  );
}

export default App;