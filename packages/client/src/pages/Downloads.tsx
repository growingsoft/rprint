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

interface WebClient {
  name: string;
  description: string;
  url: string;
  features: string[];
}

interface DownloadInfo {
  webClient?: WebClient;
  downloads: DownloadItem[];
  instructions: {
    webClient?: string[];
    windowsService: string[];
    electronClient: string[];
  };
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

  const handleDownload = (url: string, _filename: string) => {
    // Open the download URL in a new window/tab
    // The browser will automatically handle the file download
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="downloads-container">
        <p>Loading download information...</p>
      </div>
    );
  }

  return (
    <div className="downloads-container">
      <div className="downloads-header">
        <h1>Download RPrint Components</h1>
        <p>Get the necessary components to set up your remote printing system</p>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Web Client Section - Recommended */}
      {downloadInfo?.webClient && (
        <div className="web-client-section">
          <div className="web-client-card">
            <div className="recommended-badge">⭐ RECOMMENDED</div>
            <h2>{downloadInfo.webClient.name}</h2>
            <p className="web-client-description">{downloadInfo.webClient.description}</p>

            <div className="web-client-features">
              <h3>Features:</h3>
              <ul>
                {downloadInfo.webClient.features.map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => window.location.href = '/'}
              className="btn btn-primary btn-large"
              style={{ width: '100%', marginTop: '1.5rem', fontSize: '1.1rem', padding: '1rem' }}
            >
              🚀 Use Web Client Now
            </button>

            {downloadInfo.instructions.webClient && (
              <div className="web-client-instructions">
                <h4>How to use:</h4>
                <ol>
                  {downloadInfo.instructions.webClient.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Setup Section */}
      <div className="setup-section">
        <h2>🚀 Quick Setup for Windows Printing</h2>
        <div className="register-worker-card">
          <p>Register a new Windows print server and download the installer in one step:</p>

          {!workerInfo ? (
            <form onSubmit={handleRegisterWorker} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Windows Machine Name</label>
                <input
                  type="text"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="e.g., Office-Printer, Lab-PC"
                  required
                />
                <small>Choose a name to identify this Windows machine</small>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={registeringWorker}
                style={{ width: '100%' }}
              >
                {registeringWorker ? 'Registering...' : 'Register & Download Windows Service'}
              </button>
            </form>
          ) : (
            <div className="worker-registered">
              <div className="success" style={{ marginBottom: '1rem' }}>
                ✅ Worker registered successfully!
              </div>

              <div className="worker-credentials">
                <h3>Your Worker Credentials</h3>
                <p><strong>Worker Name:</strong> {workerInfo.worker.name}</p>
                <p><strong>Worker ID:</strong> <code>{workerInfo.worker.id}</code></p>
                <p><strong>API Key:</strong> <code>{workerInfo.worker.apiKey}</code></p>
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                  <strong style={{ color: '#155724' }}>✓ Pre-configured!</strong>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#155724', fontSize: '0.9rem' }}>
                    The download below includes a .env file with these credentials already set up.
                    Just extract and run INSTALL.bat!
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(workerInfo.downloadUrl, 'rprint-windows-service.zip')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
              >
                📥 Download Windows Service
              </button>

              <div className="setup-instructions" style={{ marginTop: '1.5rem' }}>
                <h4>Setup Instructions:</h4>
                <ol>
                  {workerInfo.setupInstructions.map((instruction: string, index: number) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>

              <button
                onClick={() => setWorkerInfo(null)}
                className="btn"
                style={{ width: '100%', marginTop: '1rem' }}
              >
                Register Another Worker
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Individual Downloads Section */}
      {downloadInfo && (
        <div className="downloads-list">
          <h2>📦 Individual Downloads</h2>
          <p>Already have worker credentials? Download components individually:</p>

          {downloadInfo.downloads.map((download) => (
            <div key={download.id} className="download-card">
              <div className="download-header">
                <h3>{download.name}</h3>
                <span className="platform-badge">{download.platform}</span>
              </div>
              <p className="download-description">{download.description}</p>
              <div className="download-meta">
                <span>Size: {download.size}</span>
              </div>
              <button
                onClick={() => handleDownload(
                  download.downloadUrl,
                  `rprint-${download.id}.zip`
                )}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
              >
                📥 Download {download.name}
              </button>
              <div className="download-instructions">
                <small><strong>Instructions:</strong> {download.instructions}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Instructions */}
      {downloadInfo && (
        <div className="detailed-instructions">
          <h2>📖 Detailed Setup Instructions</h2>

          <div className="instruction-section">
            <h3>Windows Print Service Setup</h3>
            <ol>
              {downloadInfo.instructions.windowsService.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="instruction-section">
            <h3>Desktop Client Setup</h3>
            <ol>
              {downloadInfo.instructions.electronClient.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <style>{`
        .downloads-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }

        .downloads-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .downloads-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: #2c3e50;
        }

        .downloads-header p {
          color: #7f8c8d;
          font-size: 1.1rem;
        }

        .setup-section {
          margin-bottom: 3rem;
        }

        .setup-section h2 {
          font-size: 1.8rem;
          margin-bottom: 1rem;
          color: #2c3e50;
        }

        .register-worker-card {
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 2rem;
        }

        .worker-registered {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .worker-credentials {
          background: #fff;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 1.5rem;
          margin: 1rem 0;
        }

        .worker-credentials h3 {
          margin-top: 0;
          color: #2c3e50;
          font-size: 1.2rem;
        }

        .worker-credentials p {
          margin: 0.5rem 0;
          word-break: break-all;
        }

        .worker-credentials code {
          background: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
        }

        .setup-instructions ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }

        .setup-instructions li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .downloads-list {
          margin-bottom: 3rem;
        }

        .downloads-list h2 {
          font-size: 1.8rem;
          margin-bottom: 1rem;
          color: #2c3e50;
        }

        .download-card {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 1.5rem;
          transition: box-shadow 0.3s ease;
        }

        .download-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .download-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .download-header h3 {
          margin: 0;
          color: #2c3e50;
          font-size: 1.5rem;
        }

        .platform-badge {
          background: #3498db;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .download-description {
          color: #7f8c8d;
          margin-bottom: 1rem;
        }

        .download-meta {
          color: #95a5a6;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .download-instructions {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e9ecef;
        }

        .detailed-instructions {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .detailed-instructions h2 {
          margin-top: 0;
          font-size: 1.8rem;
          color: #2c3e50;
        }

        .instruction-section {
          margin-bottom: 2rem;
        }

        .instruction-section:last-child {
          margin-bottom: 0;
        }

        .instruction-section h3 {
          color: #34495e;
          font-size: 1.3rem;
          margin-bottom: 1rem;
        }

        .instruction-section ol {
          padding-left: 1.5rem;
        }

        .instruction-section li {
          margin: 0.75rem 0;
          line-height: 1.6;
        }

        .web-client-section {
          margin-bottom: 3rem;
        }

        .web-client-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          padding: 2.5rem;
          position: relative;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }

        .recommended-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #ffd700;
          color: #2c3e50;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
        }

        .web-client-card h2 {
          color: white;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .web-client-description {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          opacity: 0.95;
        }

        .web-client-features {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }

        .web-client-features h3 {
          color: white;
          font-size: 1.2rem;
          margin-bottom: 1rem;
        }

        .web-client-features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .web-client-features li {
          padding: 0.5rem 0;
          font-size: 1rem;
        }

        .web-client-instructions {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }

        .web-client-instructions h4 {
          color: white;
          margin-top: 0;
        }

        .web-client-instructions ol {
          padding-left: 1.5rem;
        }

        .web-client-instructions li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .btn-large {
          background: white;
          color: #667eea;
          font-weight: bold;
          transition: transform 0.2s ease;
        }

        .btn-large:hover {
          background: white;
          color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
