import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Layout } from '../components/Layout';
import '../styles/Workers.css';

interface Worker {
  id: string;
  name: string;
  status: 'online' | 'offline';
  lastHeartbeat: string;
  createdAt: string;
  printerCount?: number;
}

interface Printer {
  id: string;
  name: string;
  displayName: string;
  status: string;
  virtual_printer_enabled: boolean;
}

export const Workers: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [printers, setPrinters] = useState<Record<string, Printer[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewWorkerDialog, setShowNewWorkerDialog] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newlyCreatedWorker, setNewlyCreatedWorker] = useState<any>(null);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const workersData = await api.getWorkers();
      setWorkers(workersData);

      // Load printers for each worker
      const printersData: Record<string, Printer[]> = {};
      for (const worker of workersData) {
        const workerPrinters = await api.getAllPrinters(worker.id);
        printersData[worker.id] = workerPrinters;
      }
      setPrinters(printersData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorker = async () => {
    if (!newWorkerName.trim()) {
      setError('Please enter a name for the print server');
      return;
    }

    try {
      const response = await api.registerWorker(newWorkerName);
      setNewlyCreatedWorker(response);
      setNewWorkerName('');
      loadWorkers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create print server');
    }
  };

  const handleDeleteWorker = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete print server "${name}"? This will also remove all associated printers.`)) {
      return;
    }

    try {
      await api.deleteWorker(id);
      loadWorkers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete print server');
    }
  };

  const togglePrinterEnabled = async (printerId: string, currentStatus: boolean) => {
    try {
      await api.updatePrinterSettings(printerId, {
        virtual_printer_enabled: !currentStatus
      });
      loadWorkers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update printer');
    }
  };

  const handleDownloadEnv = async (workerId: string, workerName: string) => {
    try {
      await api.downloadWorkerEnv(workerId, workerName);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download .env file');
    }
  };

  const handleDownloadService = () => {
    // Direct download link
    window.location.href = '/api/downloads/windows-service';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API key copied to clipboard!');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleString();
  };

  const toggleWorkerExpand = (workerId: string) => {
    setExpandedWorker(expandedWorker === workerId ? null : workerId);
  };

  return (
    <Layout>
    <div className="workers-container">
      <div className="workers-header">
        <h1>🖥️ Print Servers</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={handleDownloadService}>
            📦 Download Windows Service
          </button>
          <button className="btn-primary" onClick={() => setShowNewWorkerDialog(true)}>
            + Add Print Server
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {newlyCreatedWorker && (
        <div className="new-worker-display">
          <h3>✅ Print Server Created</h3>
          <p><strong>Server Name:</strong> {newlyCreatedWorker.worker.name}</p>
          <p><strong>API Key:</strong> Save this securely - you won't see it again!</p>
          <div className="key-display">
            <code>{newlyCreatedWorker.apiKey}</code>
            <button onClick={() => copyToClipboard(newlyCreatedWorker.apiKey)}>📋 Copy</button>
          </div>
          <div className="installation-instructions">
            <h4>Quick Setup (3 Steps):</h4>
            <ol>
              <li>
                <strong>Download the Windows Service:</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <button onClick={handleDownloadService} className="btn-secondary btn-small">
                    📦 Download Windows Service (8.4 MB)
                  </button>
                </div>
              </li>
              <li>
                <strong>Download your .env configuration:</strong>
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    onClick={() => handleDownloadEnv(newlyCreatedWorker.worker.id, newlyCreatedWorker.worker.name)}
                    className="btn-secondary btn-small"
                  >
                    📥 Download .env File
                  </button>
                </div>
              </li>
              <li>
                Extract both files to the same folder, right-click <code>INSTALL.bat</code> and select "Run as Administrator"
              </li>
            </ol>
            <h4>Manual Configuration (Optional):</h4>
            <p>If you prefer to configure manually, create a <code>.env</code> file with:</p>
            <pre>SERVER_URL=https://growingsoft.net{'\n'}API_KEY={newlyCreatedWorker.apiKey}{'\n'}WORKER_NAME={newlyCreatedWorker.worker.name}{'\n'}ALLOWED_PRINTERS=all</pre>
            <small>💡 Tip: Set <code>ALLOWED_PRINTERS</code> to specific printer names (comma-separated) to limit which printers are synced.</small>
          </div>
          <button onClick={() => setNewlyCreatedWorker(null)} className="btn-secondary">
            Done
          </button>
        </div>
      )}

      {showNewWorkerDialog && (
        <div className="modal-overlay" onClick={() => setShowNewWorkerDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Print Server</h2>
            <div className="form-group">
              <label>Server Name</label>
              <input
                type="text"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                placeholder="e.g., Office-PC, Main-Printer-Server"
              />
              <small>Give this print server a descriptive name</small>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowNewWorkerDialog(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleCreateWorker} className="btn-primary">
                Create Server
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading print servers...</div>
      ) : (
        <div className="workers-list">
          {workers.length === 0 ? (
            <div className="empty-state">
              <p>No print servers yet. Add one to start managing printers.</p>
            </div>
          ) : (
            workers.map((worker) => (
              <div key={worker.id} className="worker-card">
                <div className="worker-header" onClick={() => toggleWorkerExpand(worker.id)}>
                  <div className="worker-info">
                    <h3>
                      <span className={`status-indicator ${worker.status}`}></span>
                      {worker.name}
                    </h3>
                    <div className="worker-meta">
                      <span className={`status-badge ${worker.status}`}>
                        {worker.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                      </span>
                      <span>Last seen: {formatDate(worker.lastHeartbeat)}</span>
                      <span>{printers[worker.id]?.length || 0} printers</span>
                    </div>
                  </div>
                  <div className="worker-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadEnv(worker.id, worker.name);
                      }}
                      className="btn-secondary btn-small"
                      title="Download .env configuration file"
                    >
                      📥 Download .env
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorker(worker.id, worker.name);
                      }}
                      className="btn-danger btn-small"
                    >
                      Delete
                    </button>
                    <span className="expand-icon">
                      {expandedWorker === worker.id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {expandedWorker === worker.id && (
                  <div className="worker-details">
                    <h4>📄 Printers ({printers[worker.id]?.length || 0})</h4>
                    {printers[worker.id]?.length === 0 ? (
                      <p className="no-printers">No printers detected. Make sure the service is running.</p>
                    ) : (
                      <table className="printers-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th>API Enabled</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {printers[worker.id]?.map((printer) => (
                            <tr key={printer.id}>
                              <td>
                                <strong>{printer.displayName}</strong>
                                <br />
                                <small>{printer.name}</small>
                              </td>
                              <td>
                                <span className={`status-badge ${printer.status}`}>
                                  {printer.status}
                                </span>
                              </td>
                              <td>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={printer.virtual_printer_enabled}
                                    onChange={() => togglePrinterEnabled(printer.id, printer.virtual_printer_enabled)}
                                  />
                                  <span className="toggle-slider"></span>
                                </label>
                              </td>
                              <td>
                                {printer.virtual_printer_enabled ? (
                                  <span className="enabled-badge">✓ Available to API</span>
                                ) : (
                                  <span className="disabled-badge">✕ Hidden from API</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="workers-info">
        <h3>ℹ️ About Print Servers</h3>
        <p>
          Print servers are Windows machines running the RPrint service that manage printers.
          Each server can have multiple printers attached.
        </p>
        <p>
          <strong>Two ways to filter printers:</strong>
        </p>
        <ul>
          <li>
            <strong>Server-side filtering:</strong> Edit the <code>ALLOWED_PRINTERS</code> setting in your .env file
            to control which printers are synced from Windows. This reduces network traffic.
          </li>
          <li>
            <strong>API filtering:</strong> Use the "API Enabled" toggle below to control which synced printers
            are visible to external applications via the API.
          </li>
        </ul>
      </div>
    </div>
    </Layout>
  );
};
