import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface Printer {
  id: string;
  name: string;
  displayName: string;
  status: string;
  description?: string;
  location?: string;
  virtual_printer_enabled?: boolean;
  tags?: string;
  workerId: string;
}

export const AdminPrinters: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    try {
      setLoading(true);
      const response = await api.get('/printers');
      setPrinters(response.data.printers || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load printers');
    } finally {
      setLoading(false);
    }
  };

  const updatePrinterSettings = async (printerId: string, settings: { virtual_printer_enabled?: boolean; tags?: string }) => {
    try {
      setSaving(printerId);
      await api.put(`/printers/${printerId}/settings`, settings);

      // Update local state
      setPrinters(printers.map(p =>
        p.id === printerId
          ? { ...p, ...settings }
          : p
      ));

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update printer');
    } finally {
      setSaving(null);
    }
  };

  const toggleVirtualPrinter = (printer: Printer) => {
    updatePrinterSettings(printer.id, {
      virtual_printer_enabled: !printer.virtual_printer_enabled
    });
  };

  const updateTags = (printer: Printer, tags: string) => {
    updatePrinterSettings(printer.id, { tags });
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Loading printers...</p>
      </div>
    );
  }

  return (
    <div className="admin-printers">
      <div className="page-header">
        <h1>🖨️ Printer Management</h1>
        <p>Control which printers are available for Virtual Printer users</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="printers-grid">
        {printers.length === 0 ? (
          <div className="empty-state">
            <p>No printers found</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
              Printers will appear here once a worker syncs them.
            </p>
          </div>
        ) : (
          printers.map(printer => (
            <div key={printer.id} className="printer-card">
              <div className="printer-header">
                <div>
                  <h3>{printer.displayName}</h3>
                  <p className="printer-name">{printer.name}</p>
                  {printer.location && (
                    <p className="printer-location">📍 {printer.location}</p>
                  )}
                </div>
                <div className={`status-badge status-${printer.status}`}>
                  {printer.status}
                </div>
              </div>

              <div className="printer-description">
                {printer.description || 'No description'}
              </div>

              <div className="printer-controls">
                <label className="toggle-control">
                  <input
                    type="checkbox"
                    checked={printer.virtual_printer_enabled !== false}
                    onChange={() => toggleVirtualPrinter(printer)}
                    disabled={saving === printer.id}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">
                    {printer.virtual_printer_enabled !== false ? 'Enabled' : 'Disabled'} for Virtual Printer
                  </span>
                </label>

                <div className="tags-input">
                  <label>Tags (comma-separated):</label>
                  <input
                    type="text"
                    value={printer.tags || ''}
                    onChange={(e) => updateTags(printer, e.target.value)}
                    onBlur={() => {}} // Auto-save on blur handled by onChange
                    placeholder="e.g., color, office, high-quality"
                    disabled={saving === printer.id}
                  />
                  <small>Use tags to organize printers (e.g., color, bw, office)</small>
                </div>
              </div>

              {saving === printer.id && (
                <div className="saving-indicator">Saving...</div>
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        .admin-printers {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
        }

        .page-header p {
          margin: 0;
          opacity: 0.8;
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .alert-error {
          background: #fee;
          color: #c00;
          border: 1px solid #fcc;
        }

        .printers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .printer-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: box-shadow 0.2s;
        }

        .printer-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .printer-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .printer-header h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.25rem;
        }

        .printer-name {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.6;
          font-family: monospace;
        }

        .printer-location {
          margin: 0.25rem 0 0 0;
          font-size: 0.85rem;
          opacity: 0.7;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-online {
          background: #d4edda;
          color: #155724;
        }

        .status-offline {
          background: #f8d7da;
          color: #721c24;
        }

        .status-busy {
          background: #fff3cd;
          color: #856404;
        }

        .printer-description {
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .printer-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .toggle-control {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          user-select: none;
        }

        .toggle-control input[type="checkbox"] {
          position: absolute;
          opacity: 0;
        }

        .toggle-slider {
          position: relative;
          width: 48px;
          height: 24px;
          background: #ccc;
          border-radius: 24px;
          transition: background 0.3s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          top: 2px;
          left: 2px;
          transition: transform 0.3s;
        }

        .toggle-control input:checked + .toggle-slider {
          background: #28a745;
        }

        .toggle-control input:checked + .toggle-slider::before {
          transform: translateX(24px);
        }

        .toggle-control input:disabled + .toggle-slider {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-label {
          font-weight: 500;
        }

        .tags-input {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .tags-input label {
          font-weight: 500;
          font-size: 0.9rem;
        }

        .tags-input input {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .tags-input input:focus {
          outline: none;
          border-color: #667eea;
        }

        .tags-input small {
          font-size: 0.8rem;
          opacity: 0.7;
        }

        .saving-indicator {
          margin-top: 0.5rem;
          text-align: center;
          font-size: 0.9rem;
          color: #667eea;
          font-weight: 500;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666;
        }

        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .printers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
