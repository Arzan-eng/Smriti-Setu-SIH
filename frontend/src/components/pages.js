// src/components/Pages.js
import React from 'react';

// 1. The Home Page
export function HomePage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🏠 Home</h1>
      <p>Welcome! Say "Open Medicines" or "Where is the game?"</p>
    </div>
  );
}

// 2. The Medicine Page (Notice the ID we added for Step 6)
export function MedicinePage() {
  return (
    <div id="medicine-pill-card" style={{ padding: '20px', background: '#f0f8ff', borderRadius: '12px', margin: '10px' }}>
      <h1>💊 Medicines</h1>
      <p>1. Aspirin (Pending)</p>
      <p>2. Paracetamol (Taken)</p>
    </div>
  );
}

// 3. The Games Page (Notice the ID we added for Step 6)
export function GamesPage() {
  return (
    <div id="game-memory-card" style={{ padding: '20px', background: '#f5f5dc', borderRadius: '12px', margin: '10px' }}>
      <h1>🎮 Games</h1>
      <p>🧠 Memory Match (Popular)</p>
      <p>🃏 Card Flip</p>
    </div>
  );
}

// 4. The Support Page (For SOS)
export function SupportPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>🆘 Support</h1>
      <div id="emergency-box" style={{ background: '#ffcccc', padding: '20px', borderRadius: '12px', border: '2px solid red' }}>
        🚨 EMERGENCY CONTACT: +91 98765 43210
      </div>
    </div>
  );
}