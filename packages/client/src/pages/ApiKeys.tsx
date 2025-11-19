import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';
import '../styles/ApiKeys.css';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
}

export const ApiKeys: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('0');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await api.getApiKeys();
      setApiKeys(keys);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    try {
      const response = await api.createApiKey(newKeyName, parseInt(newKeyExpiry));
      setNewlyCreatedKey(response.apiKey);
      setNewKeyName('');
      setNewKeyExpiry('0');
      loadApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create API key');
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete API key "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteApiKey(id);
      loadApiKeys();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API key copied to clipboard!');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Layout>
    <div className="api-keys-container">
      <div className="api-keys-header">
        <h1>🔑 API Keys</h1>
        <button className="btn-primary" onClick={() => setShowNewKeyDialog(true)}>
          + Create New API Key
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {newlyCreatedKey && (
        <div className="new-key-display">
          <h3>⚠️ Save Your API Key</h3>
          <p>This is the only time you'll see this key. Store it securely!</p>
          <div className="key-display">
            <code>{newlyCreatedKey}</code>
            <button onClick={() => copyToClipboard(newlyCreatedKey)}>📋 Copy</button>
          </div>
          <button onClick={() => setNewlyCreatedKey(null)} className="btn-secondary">
            I've saved it
          </button>
        </div>
      )}

      {showNewKeyDialog && (
        <div className="modal-overlay" onClick={() => setShowNewKeyDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New API Key</h2>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Server, AWS Lambda"
              />
            </div>
            <div className="form-group">
              <label>Expiry</label>
              <select value={newKeyExpiry} onChange={(e) => setNewKeyExpiry(e.target.value)}>
                <option value="0">Never expires</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowNewKeyDialog(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleCreateKey} className="btn-primary">
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading API keys...</div>
      ) : (
        <div className="api-keys-list">
          {apiKeys.length === 0 ? (
            <div className="empty-state">
              <p>No API keys yet. Create one to get started with the API.</p>
            </div>
          ) : (
            <table className="api-keys-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Last Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td>{key.name}</td>
                    <td>{formatDate(key.createdAt)}</td>
                    <td>{key.expiresAt ? formatDate(key.expiresAt) : 'Never'}</td>
                    <td>{formatDate(key.lastUsedAt)}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteKey(key.id, key.name)}
                        className="btn-danger btn-small"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="api-info">
        <h3>📚 Using API Keys</h3>
        <p>Include your API key in the <code>X-API-Key</code> header:</p>
        <pre>
{`curl -X GET https://growingsoft.net/api/printers \\
  -H "X-API-Key: your-api-key-here"`}
        </pre>
        <p>
          <a href="/apidoc" target="_blank" rel="noopener noreferrer">
            View API Documentation →
          </a>
        </p>
      </div>
    </div>
    </Layout>
  );
};
