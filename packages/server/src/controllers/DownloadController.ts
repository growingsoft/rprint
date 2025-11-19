import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

export class DownloadController {
  // Download Windows service package
  static async downloadWindowsService(req: Request, res: Response) {
    try {
      const zipPath = path.join(__dirname, '../../public/downloads/rprint-windows-service.zip');

      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: 'Windows service package not found' });
      }

      res.download(zipPath, 'rprint-windows-service.zip');
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

  // Download Diagnostics Tool
  static async downloadDiagnostics(req: Request, res: Response) {
    try {
      const diagnosticsPath = path.join(__dirname, '../../../windows-service/installer/rprint-diagnostics-windows.zip');

      if (!fs.existsSync(diagnosticsPath)) {
        return res.status(404).json({ error: 'Diagnostics tool not found' });
      }

      // Send the pre-built diagnostics file
      res.download(diagnosticsPath, 'rprint-diagnostics-windows.zip');
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
            id: 'virtual-printer-windows',
            name: '🖨️ Virtual Printer for Windows (RECOMMENDED)',
            description: 'Print from ANY Windows application (Word, Excel, Chrome, etc.) directly to RPrint',
            platform: 'Windows 10/11',
            size: '~120 KB',
            downloadUrl: '/api/downloads/virtual-printer/windows',
            instructions: 'Extract ZIP, right-click install.bat and Run as Administrator'
          },
          {
            id: 'virtual-printer-mac',
            name: '🍎 Mac Virtual Printer - ZERO CONFIG (RECOMMENDED)',
            description: 'Print from ANY Mac application - Safari, Word, Excel, Preview, Chrome, etc. NO configuration during install! Just run installer and configure on first print with GUI dialogs.',
            platform: 'macOS 10.13+',
            size: '~8 KB',
            downloadUrl: '/api/downloads/virtual-printer/mac',
            instructions: 'Extract ZIP, open Terminal, run: sudo ./install.sh - Done! Configure on first print.'
          },
          {
            id: 'diagnostics',
            name: '🔧 Windows Worker Diagnostics Tool',
            description: 'Test your Windows worker setup before running - checks configuration, connectivity, and printing',
            platform: 'Windows',
            size: '~6 KB',
            downloadUrl: '/api/downloads/diagnostics',
            instructions: 'Extract ZIP, configure .env file with your credentials, run run-diagnostics.bat'
          },
          {
            id: 'windows-service',
            name: 'Windows Print Service',
            description: 'Install on your Windows machine to enable remote printing. Includes printer filtering support.',
            platform: 'Windows 10/11',
            size: '~8.4 MB',
            downloadUrl: '/api/downloads/windows-service',
            instructions: 'Extract the ZIP, download .env file from admin panel, run INSTALL.bat as Administrator',
            features: [
              'Automatic printer synchronization',
              'Filter specific printers to sync',
              'PDF and document printing support',
              'Automatic retry and error handling'
            ]
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
