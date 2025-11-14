import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ClientDownload: React.FC = () => {
  const navigate = useNavigate();
  const serverUrl = window.location.origin;

  return (
    <div className="client-download-container">
      <div className="client-header">
        <h1>Get RPrint Client</h1>
        <p>Choose how you want to use RPrint to send documents to your printers</p>
      </div>

      {/* Recommended Option - Web Client */}
      <div className="option-card recommended">
        <div className="recommended-badge">⭐ RECOMMENDED</div>
        <div className="option-icon">🌐</div>
        <h2>Web Client</h2>
        <p className="option-description">
          Use RPrint directly in your web browser - no installation required!
        </p>

        <div className="features-list">
          <h3>Why Web Client?</h3>
          <ul>
            <li>✓ <strong>No installation</strong> - works instantly</li>
            <li>✓ <strong>Always up-to-date</strong> - no updates needed</li>
            <li>✓ <strong>Works everywhere</strong> - Windows, Mac, Linux, iOS, Android</li>
            <li>✓ <strong>Full features</strong> - file selection, test page, print options</li>
            <li>✓ <strong>Secure</strong> - HTTPS encryption</li>
          </ul>
        </div>

        <button
          className="btn btn-primary btn-large"
          onClick={() => navigate('/')}
        >
          🚀 Start Using Web Client
        </button>

        <div className="install-options">
          <p style={{ textAlign: 'center', marginTop: '1.5rem', opacity: 0.9 }}>
            Or install a shortcut to your computer:
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => window.open('/api/downloads/client-installer/windows', '_blank')}
            >
              📥 Windows Installer
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.open('/api/downloads/client-installer/mac', '_blank')}
            >
              📥 Mac Installer
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
            Creates a desktop shortcut that opens RPrint in your browser
          </p>
        </div>

        <div className="quick-start">
          <h4>How to use (3 steps):</h4>
          <ol>
            <li>Go to <strong>{serverUrl}</strong></li>
            <li>Register or log in</li>
            <li>Select a printer and upload your document - that's it!</li>
          </ol>
        </div>
      </div>

      {/* Desktop App Option */}
      <div className="option-card">
        <div className="option-icon">💻</div>
        <h2>Desktop Application</h2>
        <p className="option-description">
          For advanced users who prefer a standalone desktop app
        </p>

        <div className="desktop-notice">
          <h4>⚠️ Important Notice</h4>
          <p>
            The desktop application requires technical knowledge to build from source code.
            <strong> We recommend using the Web Client above instead</strong> - it provides the same features
            without any installation.
          </p>
        </div>

        <details className="build-instructions">
          <summary><strong>Show instructions for building desktop app</strong></summary>

          <div className="instruction-content">
            <h4>Requirements:</h4>
            <ul>
              <li>Node.js 18 or higher</li>
              <li>npm or yarn</li>
              <li>Git (optional)</li>
            </ul>

            <h4>Steps:</h4>
            <ol>
              <li>
                <strong>Download source code:</strong>
                <pre><code>git clone https://github.com/yourusername/rprint.git
cd rprint/packages/client</code></pre>
                Or download ZIP from the <a href="/downloads">Downloads page</a>
              </li>
              <li>
                <strong>Install dependencies:</strong>
                <pre><code>npm install</code></pre>
              </li>
              <li>
                <strong>Build for your platform:</strong>
                <pre><code># For Windows:
npm run build:win

# For macOS:
npm run build:mac

# For Linux:
npm run build:linux</code></pre>
                <small>Note: Building for macOS requires a Mac computer. Building for Windows from Linux/Mac requires additional setup (Wine).</small>
              </li>
              <li>
                <strong>Find your installer:</strong>
                <p>The installer will be in the <code>release/</code> folder</p>
              </li>
            </ol>
          </div>
        </details>
      </div>

      {/* Comparison Table */}
      <div className="comparison-section">
        <h2>Quick Comparison</h2>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Web Client</th>
              <th>Desktop App</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Installation Required</td>
              <td className="good">❌ None</td>
              <td className="neutral">✓ Yes, must build</td>
            </tr>
            <tr>
              <td>Technical Knowledge</td>
              <td className="good">❌ None needed</td>
              <td className="bad">✓ Required</td>
            </tr>
            <tr>
              <td>Works on All Devices</td>
              <td className="good">✓ Yes</td>
              <td className="neutral">✓ If you build for each</td>
            </tr>
            <tr>
              <td>Updates</td>
              <td className="good">✓ Automatic</td>
              <td className="neutral">❌ Manual rebuild</td>
            </tr>
            <tr>
              <td>Print Features</td>
              <td className="good">✓ Full</td>
              <td className="good">✓ Full</td>
            </tr>
            <tr>
              <td>File Selection</td>
              <td className="good">✓ Yes</td>
              <td className="good">✓ Yes</td>
            </tr>
            <tr>
              <td>Works Offline</td>
              <td className="neutral">❌ Needs internet</td>
              <td className="neutral">❌ Needs internet</td>
            </tr>
          </tbody>
        </table>
      </div>

      <style>{`
        .client-download-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
        }

        .client-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .client-header h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          color: #2c3e50;
        }

        .client-header p {
          font-size: 1.1rem;
          color: #7f8c8d;
        }

        .option-card {
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 2.5rem;
          margin-bottom: 2rem;
          position: relative;
        }

        .option-card.recommended {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }

        .recommended-badge {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: #ffd700;
          color: #2c3e50;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.9rem;
        }

        .option-icon {
          font-size: 4rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        .option-card h2 {
          text-align: center;
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .option-card.recommended h2,
        .option-card.recommended h3,
        .option-card.recommended h4 {
          color: white;
        }

        .option-description {
          text-align: center;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }

        .option-card.recommended .option-description {
          opacity: 0.95;
        }

        .features-list {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          margin: 2rem 0;
        }

        .features-list h3 {
          margin-top: 0;
          font-size: 1.3rem;
        }

        .features-list ul {
          list-style: none;
          padding: 0;
          margin: 1rem 0 0 0;
        }

        .features-list li {
          padding: 0.5rem 0;
          font-size: 1.05rem;
        }

        .btn-large {
          width: 100%;
          font-size: 1.2rem;
          padding: 1rem 2rem;
          margin: 1.5rem 0;
        }

        .option-card.recommended .btn-large {
          background: white;
          color: #667eea;
          font-weight: bold;
        }

        .option-card.recommended .btn-large:hover {
          background: white;
          color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .option-card.recommended .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .option-card.recommended .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .install-options {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .quick-start {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 2rem;
        }

        .quick-start h4 {
          margin-top: 0;
        }

        .quick-start ol {
          margin: 1rem 0 0 0;
          padding-left: 1.5rem;
        }

        .quick-start li {
          padding: 0.5rem 0;
          line-height: 1.6;
        }

        .desktop-notice {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 1.5rem;
          margin: 1.5rem 0;
          color: #856404;
        }

        .desktop-notice h4 {
          margin-top: 0;
          color: #856404;
        }

        .build-instructions {
          margin-top: 2rem;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 1rem;
        }

        .build-instructions summary {
          cursor: pointer;
          padding: 0.5rem;
          user-select: none;
        }

        .build-instructions summary:hover {
          background: #f8f9fa;
        }

        .instruction-content {
          padding: 1.5rem 1rem 0.5rem;
        }

        .instruction-content h4 {
          margin: 1.5rem 0 0.5rem;
          color: #2c3e50;
        }

        .instruction-content pre {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 1rem;
          overflow-x: auto;
          margin: 0.5rem 0;
        }

        .instruction-content code {
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
        }

        .instruction-content ul,
        .instruction-content ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }

        .instruction-content li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }

        .instruction-content small {
          color: #6c757d;
          display: block;
          margin-top: 0.5rem;
        }

        .comparison-section {
          margin-top: 3rem;
        }

        .comparison-section h2 {
          text-align: center;
          margin-bottom: 2rem;
          color: #2c3e50;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .comparison-table th,
        .comparison-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .comparison-table th {
          background: #f8f9fa;
          font-weight: bold;
          color: #2c3e50;
        }

        .comparison-table tbody tr:last-child td {
          border-bottom: none;
        }

        .comparison-table .good {
          color: #28a745;
        }

        .comparison-table .bad {
          color: #dc3545;
        }

        .comparison-table .neutral {
          color: #6c757d;
        }

        @media (max-width: 768px) {
          .client-download-container {
            padding: 1rem;
          }

          .client-header h1 {
            font-size: 2rem;
          }

          .option-card {
            padding: 1.5rem;
          }

          .recommended-badge {
            top: 1rem;
            right: 1rem;
            font-size: 0.8rem;
          }

          .comparison-table {
            font-size: 0.9rem;
          }

          .comparison-table th,
          .comparison-table td {
            padding: 0.75rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};
