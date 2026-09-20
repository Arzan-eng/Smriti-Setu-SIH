// src/components/Login.js
import React, { useState } from 'react';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 State to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('https://smriti-setu-sih-1.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            
            {/* Wrapper for relative positioning */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', paddingRight: '50px' }} // Make room for the button
              />
              
              {/* The Eye Button - Styled to be clearly visible */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#FFFFFF', 
                  border: '1px solid #E8E4DF', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: '#0D9B76', 
                  fontSize: '12px',
                  fontWeight: 'bold',
                  zIndex: 10
                }}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
            
          </div>
          
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <span onClick={onSwitchToRegister}>Sign Up</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
