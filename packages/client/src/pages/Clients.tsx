import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/Clients.css';

interface ClientPackage {
  id: string;
  name: string;
  operating_system: 'windows' | 'mac' | 'linux';
  auth_token: string;
  default_printer_id: string | null;
  version: string;
  auto_update_enabled: boolean;
  created_at: string;
  last_download_at: string | null;
}

interface Printer {
  id: string;
  name: string;
  display_name: string;
}

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<ClientPackage[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [selectedOS, setSelectedOS] = useState<'windows' | 'mac' | 'linux'>('mac');
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClients();
    loadPrinters();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/packages/client');
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to load clients:', err);
      setError('Failed to load client packages');
      setClients([]);
    }
  };

  const loadPrinters = async () => {
    try {
      const response = await api.get('/printers');
      setPrinters(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to load printers:', err);
      setPrinters([]);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      setError('Please enter a client name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Creating client package:', newClientName.trim(), selectedOS);
      const response = await api.post('/packages/client', {
        name: newClientName.trim(),
        operating_system: selectedOS,
        default_printer_id: selectedPrinter || undefined
      });
      console.log('Client package created:', response.data);

      setNewClientName('');
      setSelectedOS('mac');
      setSelectedPrinter('');
      setShowCreateForm(false);
      await loadClients();
    } catch (err: any) {
      console.error('Failed to create client package:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to create client package');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string, name: string, os: string) => {
    try {
      const response = await api.get(`/packages/client/${id}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rprint-client-${name}-${os}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Refresh to update last_download_at
      loadClients();
    } catch (err: any) {
      setError('Failed to download client package');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client package?')) {
      return;
    }

    try {
      await api.delete(`/packages/client/${id}`);
      loadClients();
    } catch (err: any) {
      setError('Failed to delete client package');
    }
  };

  const handleRegenerateToken = async (id: string) => {
    if (!confirm('This will invalidate the current auth token. Continue?')) {
      return;
    }

    try {
      await api.post(`/packages/client/${id}/regenerate-token`);
      alert('Auth token regenerated. Please download the package again.');
      loadClients();
    } catch (err: any) {
      setError('Failed to regenerate token');
    }
  };

  const getOSIcon = (os: string) => {
    const icons: Record<string, string> = {
      windows: '🪟',
      mac: '🍎',
      linux: '🐧'
    };
    return icons[os] || '💻';
  };

  return (
    <div className="clients-page">
      <div className="clients-header">
        <h1>Print Clients</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          + Add Client
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreateForm && (
        <div className="create-form-card">
          <h2>Create New Client Package</h2>
          <p className="form-description">
            Create a complete virtual printer package for any operating system.
            The package will include all credentials and configuration - just download and install!
          </p>

          <div className="form-group">
            <label htmlFor="clientName">Client Name</label>
            <input
              type="text"
              id="clientName"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="e.g., John's MacBook, Sales Dept PC"
              className="form-input"
            />
            <small>This name will help you identify who is printing</small>
          </div>

          <div className="form-group">
            <label>Operating System</label>
            <div className="os-selector">
              <button
                type="button"
                className={`os-option ${selectedOS === 'mac' ? 'selected' : ''}`}
                onClick={() => setSelectedOS('mac')}
              >
                <span className="os-icon">🍎</span>
                <span className="os-name">macOS</span>
              </button>
              <button
                type="button"
                className={`os-option ${selectedOS === 'windows' ? 'selected' : ''}`}
                onClick={() => setSelectedOS('windows')}
              >
                <span className="os-icon">🪟</span>
                <span className="os-name">Windows</span>
              </button>
              <button
                type="button"
                className={`os-option ${selectedOS === 'linux' ? 'selected' : ''}`}
                onClick={() => setSelectedOS('linux')}
              >
                <span className="os-icon">🐧</span>
                <span className="os-name">Linux</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="defaultPrinter">Default Printer (Optional)</label>
            <select
              id="defaultPrinter"
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="form-select"
            >
              <option value="">-- None --</option>
              {printers.map((printer) => (
                <option key={printer.id} value={printer.id}>
                  {printer.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button onClick={handleCreateClient} disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Package'}
            </button>
            <button onClick={() => {setShowCreateForm(false); setError('');}} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="clients-grid">
        {clients.length === 0 ? (
          <div className="no-clients">
            <p>No client packages created yet.</p>
            <p>Click "Add Client" to create your first virtual printer package.</p>
          </div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="client-card">
              <div className="client-header">
                <div className="client-title">
                  <span className="os-icon-large">{getOSIcon(client.operating_system)}</span>
                  <div>
                    <h3>{client.name}</h3>
                    <span className="client-os">{client.operating_system}</span>
                  </div>
                </div>
                <span className="client-version">v{client.version}</span>
              </div>

              <div className="client-info">
                <div className="info-row">
                  <span className="info-label">Package ID:</span>
                  <span className="info-value">{client.id.substring(0, 8)}...</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Created:</span>
                  <span className="info-value">
                    {new Date(client.created_at).toLocaleDateString()}
                  </span>
                </div>
                {client.last_download_at && (
                  <div className="info-row">
                    <span className="info-label">Last Downloaded:</span>
                    <span className="info-value">
                      {new Date(client.last_download_at).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Auto-Update:</span>
                  <span className="info-value">
                    {client.auto_update_enabled ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
              </div>

              <div className="client-actions">
                <button
                  onClick={() => handleDownload(client.id, client.name, client.operating_system)}
                  className="btn-download"
                >
                  📦 Download Package
                </button>
                <button
                  onClick={() => handleRegenerateToken(client.id)}
                  className="btn-secondary"
                >
                  🔑 Regenerate Token
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="btn-danger"
                >
                  🗑️ Delete
                </button>
              </div>

              <div className="client-features">
                <h4>Package Features:</h4>
                <ul>
                  <li>✓ Zero-configuration installation</li>
                  <li>✓ Pre-configured with auth token</li>
                  <li>✓ Auto-update with uninstall/reinstall</li>
                  <li>✓ Test and diagnostic scripts included</li>
                  <li>✓ Tracks print jobs by client name</li>
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
