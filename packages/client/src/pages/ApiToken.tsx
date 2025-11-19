import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import '../styles/ApiToken.css';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
}

export const ApiToken: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [printers, setPrinters] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedPrinterId, setCopiedPrinterId] = useState<string>('');
  const [copiedApiKey, setCopiedApiKey] = useState<string>('');
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string>('');

  useEffect(() => {
    // Load printers and API keys
    loadPrinters();
    loadApiKeys();

    // Get token from localStorage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    } else {
      // Fallback to old key name
      const fallbackToken = localStorage.getItem('token');
      if (fallbackToken) {
        setToken(fallbackToken);
      }
    }
  }, []);

  const loadPrinters = async () => {
    try {
      const response = await api.get('/printers/virtual-printer/list');
      setPrinters(response.data.printers || []);
    } catch (err: any) {
      console.error('Error loading printers:', err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPrinterId = (printerId: string) => {
    navigator.clipboard.writeText(printerId);
    setCopiedPrinterId(printerId);
    setTimeout(() => setCopiedPrinterId(''), 2000);
  };

  const loadApiKeys = async () => {
    try {
      const response = await api.get('/api-keys');
      setApiKeys(response.data || []);
    } catch (err: any) {
      console.error('Error loading API keys:', err);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    setCreatingKey(true);
    try {
      const response = await api.post('/api-keys', { name: newKeyName });
      setNewlyCreatedKey(response.data.apiKey);
      setNewKeyName('');
      await loadApiKeys();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api-keys/${keyId}`);
      await loadApiKeys();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete API key');
    }
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedApiKey(key);
    setTimeout(() => setCopiedApiKey(''), 2000);
  };

  return (
    <div className="api-token-page">
      <div className="api-token-header">
        <h1>API Key & Integration</h1>
      </div>

      <div className="api-token-container">
        <div className="api-token-card">
          <h1>🎫 Your API Token & Printer IDs</h1>
          <p className="subtitle">
            Use these credentials to configure the RPrint Virtual Printer on your Mac
          </p>

          <div className="info-box">
            <h3>✨ For Mac Virtual Printer (Zero-Config Install):</h3>
            <ol>
              <li>Download and run the installer: <code>sudo ./install.sh</code></li>
              <li>Installation completes with NO configuration needed!</li>
              <li>When you print for the FIRST time, a dialog will appear</li>
              <li>Copy and paste the credentials below into the dialog</li>
            </ol>
          </div>

          <div className="credential-section">
            <label>1️⃣ Server URL:</label>
            <div className="token-box">
              <input
                type="text"
                value="https://growingsoft.net"
                readOnly
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText('https://growingsoft.net');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                📋 Copy
              </button>
            </div>
          </div>

          <div className="credential-section">
            <label>2️⃣ Your JWT Authentication Token:</label>
            <div className="token-box">
              <input
                type="text"
                value={token}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className="btn btn-primary"
                onClick={handleCopy}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          <div className="credential-section">
            <label>3️⃣ Your Printer IDs (Optional - choose one):</label>
            {printers.length === 0 ? (
              <div className="no-printers">
                <p>No printers configured yet. Add a server package to sync printers.</p>
              </div>
            ) : (
              <div className="printers-list">
                {printers.map((printer: any) => (
                  <div key={printer.id} className="printer-item">
                    <div className="printer-info">
                      <strong>{printer.displayName || printer.name}</strong>
                      <span className="printer-id">{printer.id}</span>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => handleCopyPrinterId(printer.id)}
                    >
                      {copiedPrinterId === printer.id ? '✓ Copied!' : '📋 Copy ID'}
                    </button>
                  </div>
                ))}
                <p className="printer-note">
                  💡 Tip: You can leave this blank during setup and select the printer when you print.
                </p>
              </div>
            )}
          </div>

          <div className="warning-box">
            <h3>⚠️ Important Security Notice</h3>
            <p>
              This token provides full access to your RPrint account.
              Keep it secure and do not share it with anyone.
            </p>
            <ul>
              <li>This token is unique to your account</li>
              <li>It allows printing to any of your configured printers</li>
              <li>If compromised, log out and log back in to get a new token</li>
            </ul>
          </div>

          {/* API Keys Section */}
          <div className="credential-section">
            <label>🔑 Named API Keys (Alternative to JWT Token)</label>
            <p style={{fontSize: '14px', color: '#666', marginBottom: '15px'}}>
              Create named API keys to track which application is printing. These work exactly like your JWT token but with custom names for easy identification.
            </p>

            {newlyCreatedKey && (
              <div style={{background: '#d4edda', border: '2px solid #28a745', borderRadius: '8px', padding: '15px', marginBottom: '15px'}}>
                <p style={{margin: '0 0 10px 0', fontWeight: 'bold', color: '#155724'}}>✓ API Key Created Successfully!</p>
                <p style={{margin: '0 0 10px 0', fontSize: '13px', color: '#155724'}}>
                  Copy this key now - it will not be shown again:
                </p>
                <div className="token-box">
                  <input
                    type="text"
                    value={newlyCreatedKey}
                    readOnly
                    style={{fontFamily: 'monospace', fontSize: '12px'}}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => handleCopyApiKey(newlyCreatedKey)}
                  >
                    {copiedApiKey === newlyCreatedKey ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <button
                  onClick={() => setNewlyCreatedKey('')}
                  style={{marginTop: '10px', padding: '8px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
                >
                  Done - Hide Key
                </button>
              </div>
            )}

            <div style={{background: '#f9f9f9', borderRadius: '8px', padding: '15px', marginBottom: '15px'}}>
              <h4 style={{margin: '0 0 10px 0'}}>Create New API Key</h4>
              <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <input
                  type="text"
                  placeholder="e.g., PHP App, Python Script, AWS Lambda"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  style={{flex: 1, padding: '10px', border: '2px solid #e0e0e0', borderRadius: '8px'}}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateApiKey()}
                />
                <button
                  className="btn-primary"
                  onClick={handleCreateApiKey}
                  disabled={creatingKey || !newKeyName.trim()}
                >
                  {creatingKey ? 'Creating...' : '+ Create Key'}
                </button>
              </div>
            </div>

            {apiKeys.length > 0 && (
              <div style={{background: '#f9f9f9', borderRadius: '8px', padding: '15px'}}>
                <h4 style={{margin: '0 0 10px 0'}}>Your API Keys</h4>
                {apiKeys.map((key) => (
                  <div key={key.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e0e0e0'}}>
                    <div>
                      <div style={{fontWeight: 'bold', marginBottom: '5px'}}>{key.name}</div>
                      <div style={{fontSize: '12px', color: '#666'}}>
                        Created: {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt && ` • Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteApiKey(key.id)}
                      style={{padding: '8px 15px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px'}}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="info-box">
            <h3>📝 API Integration for External Apps</h3>
            <p>You can print from your PHP, Python, or other applications using our REST API.</p>

            <h4>Quick Example - PHP:</h4>
            <pre style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', overflow: 'auto', fontSize: '13px'}}>
{`// Submit print job with cURL
$ch = curl_init('https://growingsoft.net/api/jobs');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer ' . $yourToken
  ],
  CURLOPT_POSTFIELDS => [
    'file' => new CURLFile('/path/to/file.pdf'),
    'printerId' => $printerId,
    'copies' => 1
  ]
]);
$response = curl_exec($ch);
$job = json_decode($response, true);`}
            </pre>

            <div style={{marginTop: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px', borderLeft: '4px solid #2196f3'}}>
              <p style={{margin: '0 0 10px 0', fontWeight: 'bold'}}>📚 Full API Documentation</p>
              <p style={{margin: '0'}}>
                For complete API reference with all endpoints, request/response examples, and authentication methods:
              </p>
              <a
                href="https://growingsoft.net/apidoc"
                target="_blank"
                rel="noopener noreferrer"
                style={{display: 'inline-block', marginTop: '10px', padding: '10px 20px', background: '#2196f3', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold'}}
              >
                View Full API Documentation →
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

