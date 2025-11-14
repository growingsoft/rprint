import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface DownloadItem {
  id: string;
  name: string;
  description: string;
  platform: string;
  size: string;
  downloadUrl: string;
  instructions: string;
}

interface DownloadInfo {
  downloads: DownloadItem[];
}

export const Downloads: React.FC = () => {
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [registeringWorker, setRegisteringWorker] = useState(false);
  const [workerInfo, setWorkerInfo] = useState<any>(null);

  useEffect(() => {
    loadDownloadInfo();
  }, []);

  const loadDownloadInfo = async () => {
    try {
      setLoading(true);
      const data = await api.getDownloadInfo();
      setDownloadInfo(data);
    } catch (err: any) {
      setError('Failed to load download information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) return;

    try {
      setRegisteringWorker(true);
      setError('');
      const data = await api.registerWorkerAndDownload(workerName);
      setWorkerInfo(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register worker');
    } finally {
      setRegisteringWorker(false);
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="downloads-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="downloads-container">
      <h1>Downloads</h1>

      {error && <div className="error">{error}</div>}

      {/* Windows Service Setup */}
      <div className="section">
        <h2>Windows Print Service</h2>

        {!workerInfo ? (
          <form onSubmit={handleRegisterWorker}>
            <input
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="Machine name (e.g., Office-Printer)"
              required
            />
            <button type="submit" className="btn btn-primary" disabled={registeringWorker}>
              {registeringWorker ? 'Registering...' : 'Register & Download'}
            </button>
          </form>
        ) : (
          <div className="worker-info">
            <div className="success">Worker registered successfully</div>
            <div className="credentials">
              <p><strong>Name:</strong> {workerInfo.worker.name}</p>
              <p><strong>API Key:</strong> <code>{workerInfo.worker.apiKey}</code></p>
            </div>
            <button onClick={() => handleDownload(workerInfo.downloadUrl)} className="btn btn-primary">
              Download Windows Service
            </button>
            <button onClick={() => setWorkerInfo(null)} className="btn btn-secondary">
              Register Another
            </button>
          </div>
        )}
      </div>

      {/* Individual Downloads */}
      {downloadInfo && downloadInfo.downloads.length > 0 && (
        <div className="section">
          <h2>Other Downloads</h2>
          {downloadInfo.downloads.map((download) => (
            <div key={download.id} className="download-item">
              <div className="download-header">
                <h3>{download.name}</h3>
                <span className="badge">{download.platform}</span>
              </div>
              <p>{download.description}</p>
              <button onClick={() => handleDownload(download.downloadUrl)} className="btn">
                Download
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .downloads-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        h1 {
          margin-bottom: 2rem;
        }

        .section {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .section h2 {
          margin-top: 0;
        }

        form {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        input[type="text"] {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .worker-info {
          margin-top: 1rem;
        }

        .success {
          color: #28a745;
          margin-bottom: 1rem;
        }

        .credentials {
          background: #fff;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
        }

        .credentials p {
          margin: 0.5rem 0;
        }

        .credentials code {
          background: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .download-item {
          background: #fff;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .download-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .download-header h3 {
          margin: 0;
        }

        .badge {
          background: #007bff;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 0.5rem;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
