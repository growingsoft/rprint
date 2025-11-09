import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useStore } from '../store/useStore';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Auto-detect if running in production (through proxy) or development
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const defaultServerUrl = isProduction ? window.location.origin : 'http://localhost:3001';

  const [serverUrl, setServerUrl] = useState(
    localStorage.getItem('serverUrl') || defaultServerUrl
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { setClient } = useStore();

  // Clean up old localStorage values in production
  useEffect(() => {
    if (isProduction) {
      const storedUrl = localStorage.getItem('serverUrl');
      // Remove localhost URLs from localStorage when in production
      if (storedUrl && (storedUrl.includes('localhost') || storedUrl.includes('127.0.0.1'))) {
        localStorage.removeItem('serverUrl');
        setServerUrl(defaultServerUrl);
      }
    }
  }, [isProduction, defaultServerUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Only set server URL in development mode
      // In production, we use the auto-detected URL from the API service
      if (!isProduction) {
        api.setServerUrl(serverUrl);
      }

      let response;
      if (isLogin) {
        response = await api.login(username, password);
      } else {
        response = await api.register(username, password, displayName, email);
      }

      setClient(response.client);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? 'Login to RPrint' : 'Register for RPrint'}</h2>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isProduction && (
            <div className="form-group">
              <label>Server URL</label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label>Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{ color: '#3498db', textDecoration: 'none' }}
          >
            {isLogin ? 'Register' : 'Login'}
          </a>
        </p>

        <p style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          Need to install the Windows service or desktop client?{' '}
          <a
            href="/downloads"
            style={{ color: '#27ae60', textDecoration: 'none', fontWeight: '500' }}
          >
            Download Installers
          </a>
        </p>
      </div>
    </div>
  );
};
