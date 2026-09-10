// src/components/CaregiverDashboard.js
import React, { useState, useEffect } from 'react';

const API_BASE = 'https://smriti-setu-sih-1.onrender.com';

const CaregiverDashboard = ({ currentUser }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linkEmail, setLinkEmail] = useState('');
  const [showAddMed, setShowAddMed] = useState(false);

  // ── Fetch summary and patients ──
  useEffect(() => {
    fetchSummary();
    fetchPatients();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/caregiver/summary`, { credentials: 'include' });
      if (res.ok) setSummary(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/caregiver/patients`, { credentials: 'include' });
      if (res.ok) setPatients(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchPatientDetails = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/caregiver/patient/${id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPatientDetails(data);
        setSelectedPatient(id);
      }
    } catch (e) { console.error(e); }
  };

  const linkPatient = async () => {
    if (!linkEmail) return;
    try {
      const res = await fetch(`${API_BASE}/api/caregiver/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ patient_email: linkEmail })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setLinkEmail('');
        fetchPatients();
        fetchSummary();
      } else {
        alert(data.error);
      }
    } catch (e) { alert('Failed to link patient'); }
  };

  const addMedication = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      patient_id: selectedPatient,
      medicine_name: fd.get('name'),
      dosage: fd.get('dose'),
      schedule_time: fd.get('time')
    };
    try {
      const res = await fetch(`${API_BASE}/api/caregiver/medication/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        e.target.reset();
        setShowAddMed(false);
        fetchPatientDetails(selectedPatient);
        alert('✅ Medication added!');
      }
    } catch (e) { console.error(e); }
  };

  const deleteMedication = async (medId) => {
    if (!window.confirm('Delete this medication?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/caregiver/medication/${medId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchPatientDetails(selectedPatient);
      }
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="auth-loading"><div className="spinner"></div><p>Loading dashboard...</p></div>;
  }

  return (
    <div className="page-container">
      <header className="page-header animate-in">
        <div className="greeting-text">Caregiver Portal</div>
        <h1>👨‍⚕️ Caregiver Dashboard</h1>
      </header>

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="quick-actions animate-in delay-1" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="action-card">
            <div className="action-icon teal"><i className="fas fa-users"></i></div>
            <div className="action-title">{summary.total_patients}</div>
            <div className="action-sub">Patients</div>
          </div>
          <div className="action-card">
            <div className="action-icon coral"><i className="fas fa-pills"></i></div>
            <div className="action-title">{summary.adherence_rate}%</div>
            <div className="action-sub">Adherence</div>
          </div>
          <div className="action-card">
            <div className="action-icon purple"><i className="fas fa-gamepad"></i></div>
            <div className="action-title">{summary.total_games_played}</div>
            <div className="action-sub">Games Played</div>
          </div>
          <div className="action-card">
            <div className="action-icon amber"><i className="fas fa-check-circle"></i></div>
            <div className="action-title">{summary.taken_medications}/{summary.total_medications}</div>
            <div className="action-sub">Meds Taken</div>
          </div>
        </div>
      )}

      {/* ── Link Patient ── */}
      <div className="section-label animate-in delay-2">Link a Patient</div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="email"
          placeholder="Patient's email address"
          value={linkEmail}
          onChange={(e) => setLinkEmail(e.target.value)}
          style={{ flex: 1, padding: '12px 14px', border: '1px solid #E8E4DF', borderRadius: '10px', fontSize: '14px' }}
        />
        <button onClick={linkPatient} style={{ padding: '12px 24px', background: '#0D9B76', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
          <i className="fas fa-link"></i> Link
        </button>
      </div>

      {/* ── Patients List ── */}
      <div className="section-label animate-in delay-2">Your Patients</div>
      {patients.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-users" style={{ fontSize: '48px', color: '#8E8A82', marginBottom: '16px' }}></i>
          <p style={{ color: '#8E8A82', textAlign: 'center' }}>No patients linked yet. Use the form above to link a patient by their email.</p>
        </div>
      ) : (
        <div className="support-grid">
          {patients.map(p => (
            <div key={p.id} className="support-option" onClick={() => fetchPatientDetails(p.id)}>
              <div className="support-opt-icon" style={{ background: '#E6F5F0', color: '#0D9B76' }}>
                <i className="fas fa-user"></i>
              </div>
              <div className="support-opt-info">
                <div className="support-opt-name">{p.name}</div>
                <div className="support-opt-desc">
                  💊 {p.taken_medications}/{p.total_medications} taken
                  {p.last_score !== null && ` • 🎮 Last score: ${p.last_score}%`}
                </div>
              </div>
              <span className="support-opt-arrow"><i className="fas fa-chevron-right"></i></span>
            </div>
          ))}
        </div>
      )}

      {/* ── Patient Details ── */}
      {patientDetails && (
        <div style={{ marginTop: '32px' }}>
          <div className="section-label">Patient: {patientDetails.patient.name}</div>

          {/* Medications */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '18px' }}>💊 Medications</h3>
            <button
              onClick={() => setShowAddMed(!showAddMed)}
              style={{ padding: '8px 16px', background: '#0D9B76', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
            >
              <i className="fas fa-plus"></i> Add Medication
            </button>
          </div>

          {showAddMed && (
            <form onSubmit={addMedication} style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', padding: '16px', background: '#F7F5F2', borderRadius: '12px' }}>
              <input name="name" placeholder="Medicine name" required style={{ flex: 1, padding: '10px', border: '1px solid #E8E4DF', borderRadius: '8px' }} />
              <input name="dose" placeholder="Dosage" required style={{ flex: 1, padding: '10px', border: '1px solid #E8E4DF', borderRadius: '8px' }} />
              <input name="time" type="time" required style={{ padding: '10px', border: '1px solid #E8E4DF', borderRadius: '8px' }} />
              <button type="submit" style={{ padding: '10px 20px', background: '#0D9B76', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Save
              </button>
            </form>
          )}

          {patientDetails.medications.length === 0 ? (
            <p style={{ color: '#8E8A82' }}>No medications assigned yet.</p>
          ) : (
            patientDetails.medications.map(med => (
              <div key={med.id} className="medicine-item" style={{ marginBottom: '8px' }}>
                <div className="med-info">
                  <span className="med-name">{med.medicine_name}</span>
                  <span className="med-dose">{med.dosage} — {med.schedule_time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={med.is_taken ? 'time-status done' : 'time-status pending'}>
                    {med.is_taken ? '✅ Taken' : '⏳ Pending'}
                  </span>
                  <button
                    onClick={() => deleteMedication(med.id)}
                    style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '16px' }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Game Progress */}
          <div className="section-label" style={{ marginTop: '24px' }}>🎮 Recent Games</div>
          {patientDetails.games.length === 0 ? (
            <p style={{ color: '#8E8A82' }}>No games played in the last 7 days.</p>
          ) : (
            patientDetails.games.map((g, i) => (
              <div key={i} className="medicine-item" style={{ marginBottom: '8px' }}>
                <div className="med-info">
                  <span className="med-name">{g.game_id === 'memory_match' ? '🧠 Memory Match' : '🎭 Kichu Kichu'}</span>
                  <span className="med-dose">{new Date(g.played_at).toLocaleDateString()}</span>
                </div>
                <span style={{ fontWeight: '700', color: '#0D9B76' }}>{g.score}%</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CaregiverDashboard;
