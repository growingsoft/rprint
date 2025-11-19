import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/Servers.css';

interface ServerPackage {
  id: string;
  name: string;
  worker_id: string;
  api_key: string;
  selected_printers: string | null;
  version: string;
  auto_update_enabled: boolean;
  created_at: string;
  last_download_at: string | null;
}

interface Printer {
  id: string;
  name: string;
  displayName: string;
  status: string;
  workerId: string;
}

export const Servers: React.FC = () => {
  const [servers, setServers] = useState<ServerPackage[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinters, setSelectedPrinters] = useState<string[]>([]);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadServers();
    loadPrinters();
  }, []);

  const loadServers = async () => {
    try {
      const response = await api.get('/packages/server');
      setServers(response.data);
    } catch (err: any) {
      console.error('Failed to load servers:', err);
      setError('Failed to load server packages');
    }
  };

  const loadPrinters = async () => {
    try {
      const response = await api.get('/printers/virtual-printer/list');
      const printersData = response.data.printers || [];
      setPrinters(printersData);
    } catch (err: any) {
      console.error('Failed to load printers:', err);
    }
  };

  const handleCreateServer = async () => {
    console.log('[DEBUG] handleCreateServer called, newServerName:', newServerName);

    if (!newServerName.trim()) {
      console.log('[DEBUG] Name is empty, showing error');
      setError('Please enter a server name');
      return;
    }

    console.log('[DEBUG] Starting server package creation');
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        name: newServerName.trim()
      };

      // Only add selected_printers if at least one printer is selected
      if (selectedPrinters.length > 0) {
        payload.selected_printers = selectedPrinters.join(',');
      }

      console.log('[DEBUG] Calling API:', '/packages/server', payload);
      const response = await api.post('/packages/server', payload);
      console.log('[DEBUG] Server package created successfully:', response.data);

      setNewServerName('');
      setSelectedPrinters([]);
      setShowCreateForm(false);
      await loadServers();
      console.log('[DEBUG] Server list reloaded');
    } catch (err: any) {
      console.error('[ERROR] Failed to create server package:', err);
      console.error('[ERROR] Error response:', err.response);
      console.error('[ERROR] Error message:', err.message);
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to create server package';
      console.error('[ERROR] Setting error message:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
      console.log('[DEBUG] handleCreateServer finished');
    }
  };

  const togglePrinterSelection = (printerId: string) => {
    setSelectedPrinters(prev => {
      if (prev.includes(printerId)) {
        return prev.filter(id => id !== printerId);
      } else {
        return [...prev, printerId];
      }
    });
  };

  const handleEditPrinters = (server: ServerPackage) => {
    setEditingServerId(server.id);
    // Set currently selected printers
    if (server.selected_printers) {
      setSelectedPrinters(server.selected_printers.split(','));
    } else {
      setSelectedPrinters([]);
    }
  };

  const handleSaveEditedPrinters = async (serverId: string) => {
    setLoading(true);
    setError('');

    try {
      const payload: any = {};

      // If printers are selected, send them; otherwise send empty string to clear selection
      if (selectedPrinters.length > 0) {
        payload.selected_printers = selectedPrinters.join(',');
      } else {
        payload.selected_printers = null;
      }

      await api.put(`/packages/server/${serverId}`, payload);

      setEditingServerId(null);
      setSelectedPrinters([]);
      await loadServers();
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to update printer selection');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingServerId(null);
    setSelectedPrinters([]);
    setError('');
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await api.get(`/packages/server/${id}/download`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rprint-server-${name}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Refresh to update last_download_at
      loadServers();
    } catch (err: any) {
      setError('Failed to download server package');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this server package?')) {
      return;
    }

    try {
      await api.delete(`/packages/server/${id}`);
      loadServers();
    } catch (err: any) {
      setError('Failed to delete server package');
    }
  };

  const handleRegenerateKey = async (id: string) => {
    if (!confirm('This will invalidate the current API key. Continue?')) {
      return;
    }

    try {
      await api.post(`/packages/server/${id}/regenerate-api-key`);
      alert('API key regenerated. Please download the package again.');
      loadServers();
    } catch (err: any) {
      setError('Failed to regenerate API key');
    }
  };

  return (
    <div className="servers-page">
      <div className="servers-header">
        <h1>Print Servers</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          + Add Server
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreateForm && (
        <div className="create-form-card">
          <h2>Create New Server Package</h2>
          <p className="form-description">
            Create a complete Windows service package with auto-update support.
            No manual configuration required!
          </p>

          <div className="form-group">
            <label htmlFor="serverName">Server Name</label>
            <input
              type="text"
              id="serverName"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              placeholder="e.g., Office Main Printer Server"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Select Printers (Optional)</label>
            <p className="form-help-text">
              Choose which printers this server should manage. Leave unselected to allow all printers.
            </p>
            {printers.length === 0 ? (
              <div className="no-printers-message">
                No printers available yet. Install a server package first to register printers.
              </div>
            ) : (
              <div className="printer-checkboxes">
                {printers.map((printer) => (
                  <label key={printer.id} className="printer-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedPrinters.includes(printer.id)}
                      onChange={() => togglePrinterSelection(printer.id)}
                      className="printer-checkbox"
                    />
                    <span className="printer-name">{printer.displayName}</span>
                    <span className={`printer-status ${printer.status === 'online' ? 'online' : 'offline'}`}>
                      {printer.status}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button onClick={handleCreateServer} disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Package'}
            </button>
            <button onClick={() => {setShowCreateForm(false); setError(''); setSelectedPrinters([]);}} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="servers-grid">
        {servers.length === 0 ? (
          <div className="no-servers">
            <p>No server packages created yet.</p>
            <p>Click "Add Server" to create your first print server package.</p>
          </div>
        ) : (
          servers.map((server) => (
            <div key={server.id} className="server-card">
              <div className="server-header">
                <h3>{server.name}</h3>
                <span className="server-version">v{server.version}</span>
              </div>

              {editingServerId === server.id ? (
                // Edit Mode
                <div className="edit-printers-section">
                  <h4>Edit Printer Selection</h4>
                  <p className="form-help-text">
                    Select which printers this server should manage. Leave unselected to allow all printers.
                  </p>
                  {printers.length === 0 ? (
                    <div className="no-printers-message">
                      No printers available yet.
                    </div>
                  ) : (
                    <div className="printer-checkboxes">
                      {printers.map((printer) => (
                        <label key={printer.id} className="printer-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedPrinters.includes(printer.id)}
                            onChange={() => togglePrinterSelection(printer.id)}
                            className="printer-checkbox"
                          />
                          <span className="printer-name">{printer.displayName}</span>
                          <span className={`printer-status ${printer.status === 'online' ? 'online' : 'offline'}`}>
                            {printer.status}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="form-actions" style={{marginTop: '16px'}}>
                    <button
                      onClick={() => handleSaveEditedPrinters(server.id)}
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="server-info">
                    <div className="info-row">
                      <span className="info-label">Worker ID:</span>
                      <span className="info-value">{server.worker_id.substring(0, 8)}...</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Created:</span>
                      <span className="info-value">
                        {new Date(server.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {server.last_download_at && (
                      <div className="info-row">
                        <span className="info-label">Last Downloaded:</span>
                        <span className="info-value">
                          {new Date(server.last_download_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="info-row">
                      <span className="info-label">Auto-Update:</span>
                      <span className="info-value">
                        {server.auto_update_enabled ? '✓ Enabled' : '✗ Disabled'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Selected Printers:</span>
                      <span className="info-value">
                        {server.selected_printers
                          ? server.selected_printers.split(',').map(id => {
                              const printer = printers.find(p => p.id === id);
                              return printer ? printer.displayName : id;
                            }).join(', ')
                          : 'All printers'}
                      </span>
                    </div>
                  </div>

                  <div className="server-actions">
                    <button
                      onClick={() => handleDownload(server.id, server.name)}
                      className="btn-download"
                    >
                      📦 Download Package
                    </button>
                    <button
                      onClick={() => handleEditPrinters(server)}
                      className="btn-secondary"
                    >
                      🖨️ Edit Printers
                    </button>
                    <button
                      onClick={() => handleRegenerateKey(server.id)}
                      className="btn-secondary"
                    >
                      🔑 Regenerate Key
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="btn-danger"
                    >
                      🗑️ Delete
                    </button>
                  </div>

                  <div className="server-features">
                    <h4>Package Features:</h4>
                    <ul>
                      <li>✓ Complete zero-configuration setup</li>
                      <li>✓ Pre-configured with API key</li>
                      <li>✓ Auto-update with uninstall/reinstall</li>
                      <li>✓ Windows Service installer included</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
