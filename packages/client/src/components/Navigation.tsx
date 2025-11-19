import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/Navigation.css';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clientData, setClientData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadClientData = async () => {
      // First check localStorage
      let client = api.getClient();

      // If no client data in localStorage, fetch from server
      if (!client || !client.role) {
        try {
          const response = await api.get('/auth/me');
          client = response.data.client;
          // Store it for future use
          localStorage.setItem('client', JSON.stringify(client));
        } catch (error) {
          console.error('[Navigation] Failed to fetch user data:', error);
        }
      }

      setClientData(client);
      setIsLoading(false);

      // Debug logging
      console.log('[Navigation] Client data:', client);
      console.log('[Navigation] Is Admin?', client?.role === 'admin');
    };

    loadClientData();
  }, []);

  const handleLogout = () => {
    api.clearAuth();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isAdmin = clientData?.role === 'admin';

  if (isLoading) {
    return (
      <nav className="main-navigation">
        <div className="nav-container">
          <div className="nav-brand">
            <h1>RPrint</h1>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="main-navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>RPrint</h1>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab ${isActive('/print') || location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/print')}
          >
            Print
          </button>
          {isAdmin && (
            <>
              <button
                className={`nav-tab ${isActive('/admin/printers') ? 'active' : ''}`}
                onClick={() => navigate('/admin/printers')}
              >
                Printers
              </button>
              <button
                className={`nav-tab ${isActive('/servers') ? 'active' : ''}`}
                onClick={() => navigate('/servers')}
              >
                Servers
              </button>
              <button
                className={`nav-tab ${isActive('/clients') ? 'active' : ''}`}
                onClick={() => navigate('/clients')}
              >
                Clients
              </button>
              <button
                className={`nav-tab ${isActive('/users') ? 'active' : ''}`}
                onClick={() => navigate('/users')}
              >
                Users
              </button>
              <button
                className={`nav-tab ${isActive('/api-token') ? 'active' : ''}`}
                onClick={() => navigate('/api-token')}
              >
                API Keys
              </button>
            </>
          )}
        </div>

        <div className="nav-actions">
          <button className="nav-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};
