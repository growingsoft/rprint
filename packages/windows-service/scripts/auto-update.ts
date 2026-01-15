const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '../.env');
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');
const UPDATE_CHECK_INTERVAL = 3600000; // 1 hour
const TEMP_DIR = path.join(__dirname, '../temp-update');

class AutoUpdater {
  constructor() {
    this.currentVersion = this.getCurrentVersion();
    this.config = this.loadConfig();
    this.updateCheckTimer = null;
  }

  getCurrentVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
      return packageJson.version;
    } catch (error) {
      console.error('Failed to read current version:', error);
      return '0.0.0';
    }
  }

  loadConfig() {
    try {
      const envContent = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = {};
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          config[match[1].trim()] = match[2].trim();
        }
      });
      return config;
    } catch (error) {
      console.error('Failed to load config:', error);
      return {};
    }
  }

  async checkForUpdates() {
    try {
      const serverUrl = this.config.SERVER_URL || 'http://localhost:3000';
      const apiKey = this.config.API_KEY;

      if (!apiKey) {
        console.log('No API key configured, skipping update check');
        return;
      }

      // Get worker ID from server
      const workerInfoUrl = `${serverUrl}/api/workers/me`;
      const workerInfo = await this.makeRequest(workerInfoUrl, {
        headers: { 'X-API-Key': apiKey }
      });

      // Get package info from server
      const packageUrl = `${serverUrl}/api/packages/server/${workerInfo.id}`;
      const packageInfo = await this.makeRequest(packageUrl, {
        headers: { 'X-API-Key': apiKey }
      });

      if (!packageInfo.auto_update_enabled) {
        console.log('Auto-update is disabled for this package');
        return;
      }

      const latestVersion = packageInfo.version || '1.0.0';

      if (this.compareVersions(latestVersion, this.currentVersion) > 0) {
        console.log(`New version available: ${latestVersion} (current: ${this.currentVersion})`);
        await this.performUpdate(serverUrl, apiKey);
      } else {
        console.log(`Already on latest version: ${this.currentVersion}`);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error.message);
    }
  }

  async performUpdate(serverUrl, apiKey) {
    try {
      console.log('Starting auto-update process...');

      // Create temp directory
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
      }

      // Download the latest package
      const downloadUrl = `${serverUrl}/api/downloads/windows-service`;
      const zipPath = path.join(TEMP_DIR, 'update.zip');

      await this.downloadFile(downloadUrl, zipPath, {
        headers: { 'X-API-Key': apiKey }
      });

      console.log('Downloaded update package');

      // Stop the service
      console.log('Stopping service for update...');
      try {
        execSync('sc stop RPrintService', { stdio: 'ignore' });
      } catch (err) {
        // Service might not be running
      }

      // Extract and replace files (excluding .env and data)
      const rootDir = path.join(__dirname, '..');

      // Backup current .env
      const envBackup = path.join(TEMP_DIR, '.env.backup');
      if (fs.existsSync(CONFIG_PATH)) {
        fs.copyFileSync(CONFIG_PATH, envBackup);
      }

      // Run the update install script
      const installScript = path.join(rootDir, 'INSTALL.bat');
      if (fs.existsSync(installScript)) {
        execSync(`"${installScript}"`, { cwd: rootDir, stdio: 'inherit' });
      }

      // Restore .env
      if (fs.existsSync(envBackup)) {
        fs.copyFileSync(envBackup, CONFIG_PATH);
      }

      console.log('Update completed successfully');

      // Clean up temp directory
      this.cleanupTempDir();

      // Restart service
      console.log('Restarting service...');
      execSync('sc start RPrintService', { stdio: 'ignore' });

      console.log('Service restarted successfully');
    } catch (error) {
      console.error('Failed to perform update:', error);
      this.cleanupTempDir();

      // Try to restart service anyway
      try {
        execSync('sc start RPrintService', { stdio: 'ignore' });
      } catch (err) {
        // Ignore
      }
    }
  }

  cleanupTempDir() {
    try {
      if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    return 0;
  }

  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const protocol = urlObj.protocol === 'https:' ? https : require('http');

      const req = protocol.request(requestOptions, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  downloadFile(url, destPath, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: options.headers || {}
      };

      const protocol = urlObj.protocol === 'https:' ? https : require('http');
      const file = fs.createWriteStream(destPath);

      const req = protocol.request(requestOptions, (res) => {
        res.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      });

      req.on('error', (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });

      file.on('error', (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });

      req.end();
    });
  }

  start() {
    console.log('Auto-updater started');

    // Check immediately on start
    this.checkForUpdates();

    // Then check periodically
    this.updateCheckTimer = setInterval(() => {
      this.checkForUpdates();
    }, UPDATE_CHECK_INTERVAL);
  }

  stop() {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
      this.updateCheckTimer = null;
    }
    this.cleanupTempDir();
    console.log('Auto-updater stopped');
  }
}

module.exports = { AutoUpdater };

// If run directly
if (require.main === module) {
  const updater = new AutoUpdater();
  updater.checkForUpdates();
}
