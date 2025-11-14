import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

export class DownloadController {
  // Download Windows service package
  static async downloadWindowsService(req: Request, res: Response) {
    try {
      const servicePath = path.join(__dirname, '../../../windows-service');

      if (!fs.existsSync(servicePath)) {
        return res.status(404).json({ error: 'Windows service files not found' });
      }

      // Check if this is a configured download (with credentials)
      const { workerId, apiKey, workerName, serverUrl } = req.query;

      // Set headers for download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="rprint-windows-service.zip"');

      // Create archive
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create archive' });
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add files to archive, excluding node_modules and build artifacts
      archive.glob('**/*', {
        cwd: servicePath,
        ignore: [
          'node_modules/**',
          'dist/**',
          'logs/**',
          '.env',
          '*.log',
          '.git/**'
        ]
      });

      // If credentials provided, add pre-configured .env file
      if (apiKey && workerName && serverUrl) {
        const envContent = `SERVER_URL=${serverUrl}
API_KEY=${apiKey}
WORKER_NAME=${workerName}
POLL_INTERVAL=5000
LOG_LEVEL=info
`;
        archive.append(envContent, { name: '.env' });
        console.log(`Created .env for worker: ${workerName}`);
      }

      await archive.finalize();
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Download Electron client package
  static async downloadElectronClient(req: Request, res: Response) {
    try {
      const clientPath = path.join(__dirname, '../../../client');

      if (!fs.existsSync(clientPath)) {
        return res.status(404).json({ error: 'Client files not found' });
      }

      // Set headers for download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="rprint-electron-client.zip"');

      // Create archive
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create archive' });
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add files to archive, excluding node_modules and build artifacts
      archive.glob('**/*', {
        cwd: clientPath,
        ignore: [
          'node_modules/**',
          'dist/**',
          '.env',
          '*.log',
          '.git/**'
        ]
      });

      await archive.finalize();
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Download Client Installer
  static async downloadClientInstaller(req: Request, res: Response) {
    try {
      const { platform } = req.params; // 'windows' or 'mac'
      const installerPath = path.join(__dirname, '../../../client-installer');

      if (!fs.existsSync(installerPath)) {
        return res.status(404).json({ error: 'Installer files not found' });
      }

      const filename = platform === 'mac' ? 'rprint-installer-mac.zip' : 'rprint-installer-windows.zip';

      // Set headers for download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Create archive
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create archive' });
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add installer files
      archive.file(path.join(installerPath, 'README.txt'), { name: 'README.txt' });

      if (platform === 'mac') {
        archive.file(path.join(installerPath, 'install-mac.sh'), { name: 'install-mac.sh' });
      } else {
        archive.file(path.join(installerPath, 'install-windows.bat'), { name: 'install-windows.bat' });
      }

      await archive.finalize();
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Download Virtual Printer Installer
  static async downloadVirtualPrinter(req: Request, res: Response) {
    try {
      const { platform } = req.params; // 'windows' or 'mac'
      const installerPath = path.join(__dirname, '../../../virtual-printer/installer');

      const filename = platform === 'mac'
        ? 'rprint-virtual-printer-mac.zip'
        : 'rprint-virtual-printer-windows.zip';

      const filePath = path.join(installerPath, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Virtual printer installer not found' });
      }

      // Send the pre-built installer file
      res.download(filePath, filename);
    } catch (error: any) {
      console.error('Download error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get download information
  static async getDownloadInfo(req: Request, res: Response) {
    try {
      // Detect the actual server URL (handle proxy)
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('x-forwarded-host') || req.get('host');
      const serverUrl = `${protocol}://${host}`;

      // Use relative URLs to work properly with proxy
      res.json({
        webClient: {
          name: 'Web Client (Recommended)',
          description: 'Use RPrint directly in your browser - no installation required!',
          url: serverUrl,
          features: [
            'Access from any device with a web browser',
            'No installation or updates needed',
            'Works on Windows, Mac, Linux, iOS, Android',
            'Full feature set including file selection and test page printing'
          ]
        },
        downloads: [
          {
            id: 'windows-service',
            name: 'Windows Print Service',
            description: 'Install on your Windows 11 machine to enable remote printing',
            platform: 'Windows 11',
            size: 'Dynamic (excludes node_modules)',
            downloadUrl: '/api/downloads/windows-service',
            instructions: 'Extract the ZIP file, then run INSTALL.bat as Administrator'
          },
          {
            id: 'electron-client',
            name: 'Desktop Client (Source Code)',
            description: 'Build the Electron desktop application yourself from source',
            platform: 'Windows, macOS, Linux',
            size: 'Dynamic (excludes node_modules)',
            downloadUrl: '/api/downloads/electron-client',
            instructions: 'Extract, run npm install, npm run build:win (or build:mac/build:linux)'
          }
        ],
        instructions: {
          webClient: [
            `1. Simply visit ${serverUrl} in your web browser`,
            '2. Register a new account or log in',
            '3. Select a printer and upload a document',
            '4. Click Print or Print Test Page',
            '5. Optional: Add to home screen on mobile devices for app-like experience'
          ],
          windowsService: [
            '1. Download the Windows Print Service ZIP file',
            '2. Extract to a folder on your Windows 11 machine',
            '3. Right-click INSTALL.bat and select "Run as Administrator"',
            '4. Follow the prompts to configure and install the service',
            '5. Your printers will now appear on the web interface'
          ],
          electronClient: [
            '1. Download the Desktop Client ZIP file',
            '2. Extract to a folder on your computer',
            '3. Open terminal/command prompt in the extracted folder',
            '4. Run: npm install',
            '5. Build for your platform:',
            '   - Windows: npm run build:win',
            '   - macOS: npm run build:mac',
            '   - Linux: npm run build:linux',
            '6. Find the installer in the release/ folder'
          ]
        }
      });
    } catch (error: any) {
      console.error('Error getting download info:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Register a new worker and provide download link
  static async registerAndDownload(req: Request, res: Response) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Worker name is required' });
      }

      // Import WorkerModel here to avoid circular dependency
      const { WorkerModel } = await import('../models/WorkerModel');
      const worker = await WorkerModel.create(name);

      // Detect the actual server URL (handle proxy)
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('x-forwarded-host') || req.get('host');
      const serverUrl = `${protocol}://${host}`;

      // Create download URL with pre-configured credentials
      const downloadUrl = `/api/downloads/windows-service?workerId=${encodeURIComponent(worker.id)}&apiKey=${encodeURIComponent(worker.apiKey)}&workerName=${encodeURIComponent(worker.name)}&serverUrl=${encodeURIComponent(serverUrl)}`;

      res.json({
        worker: {
          id: worker.id,
          name: worker.name,
          apiKey: worker.apiKey
        },
        downloadUrl: downloadUrl,
        setupInstructions: [
          '1. Download the Windows service using the link above (pre-configured with your credentials)',
          '2. Extract the ZIP file to your Windows 11 machine',
          '3. The .env file is already included with your API key and server URL',
          '4. Run INSTALL.bat as Administrator',
          '5. The installer will skip configuration (already done!)',
          '6. Your printers will sync automatically'
        ]
      });
    } catch (error: any) {
      console.error('Error in registerAndDownload:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
