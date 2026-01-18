import React, { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { api } from '../services/api';
import './Layout.css';

// --- Icon Components ---
const PrintIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const ServerIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);
const UsersIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const KeyIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const DocsIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const LogoutIcon = () => (
  <svg
    className="nav-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

interface NavigationProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  isCollapsed,
  toggleCollapse,
}) => {
  const navigate = useNavigate();
  const [clientData, setClientData] = useState<any>(null);

  useEffect(() => {
    const loadClientData = async () => {
      let client = api.getClient();
      if (!client?.role) {
        try {
          const response = await api.get('/auth/me');
          client = response.data.client;
          localStorage.setItem('client', JSON.stringify(client));
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      }
      setClientData(client);
    };
    loadClientData();
  }, []);

  const handleLogout = () => {
    api.clearAuth();
    navigate('/login');
  };

  const isAdmin = clientData?.role === 'admin';

  return (
    <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <span className="logo">RPrint</span>
        <span className="logo-icon">🖨️</span>
      </div>

      <ul className="nav-menu">
        <li className="nav-item">
          <NavLink to="/print" className="nav-link">
            <PrintIcon />
            <span className="nav-text">Print</span>
          </NavLink>
        </li>
        {isAdmin && (
          <>
            <li className="nav-item">
              <NavLink to="/admin/printers" className="nav-link">
                <PrintIcon />
                <span className="nav-text">Printers</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/servers" className="nav-link">
                <ServerIcon />
                <span className="nav-text">Servers</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/users" className="nav-link">
                <UsersIcon />
                <span className="nav-text">Users</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/api-token" className="nav-link">
                <KeyIcon />
                <span className="nav-text">API Keys</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <a href="/apidoc" className="nav-link" target="_blank" rel="noopener noreferrer">
                <DocsIcon />
                <span className="nav-text">API Docs</span>
              </a>
            </li>
          </>
        )}
      </ul>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="nav-link">
          <LogoutIcon />
          <span className="nav-text">Logout</span>
        </button>
        <button onClick={toggleCollapse} className="toggle-btn">
          <MenuIcon />
        </button>
      </div>
    </nav>
  );
};
