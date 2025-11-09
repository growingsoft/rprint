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

  // Get download information
  static async getDownloadInfo(req: Request, res: Response) {
    try {
      const serverUrl = `${req.protocol}://${req.get('host')}`;

      res.json({
        downloads: [
          {
            id: 'windows-service',
            name: 'Windows Print Service',
            description: 'Install on your Windows 11 machine to enable remote printing',
            platform: 'Windows 11',
            size: 'Dynamic (excludes node_modules)',
            downloadUrl: `${serverUrl}/api/downloads/windows-service`,
            instructions: 'Extract the ZIP file, then run INSTALL.bat as Administrator'
          },
          {
            id: 'electron-client',
            name: 'Desktop Client',
            description: 'Cross-platform desktop application for submitting print jobs',
            platform: 'Windows, macOS, Linux',
            size: 'Dynamic (excludes node_modules)',
            downloadUrl: `${serverUrl}/api/downloads/electron-client`,
            instructions: 'Extract the ZIP file, run npm install, then npm run build'
          }
        ],
        instructions: {
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
            '5. Run: npm run build',
            '6. Run the built application from the dist folder'
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

      const serverUrl = `${req.protocol}://${req.get('host')}`;

      res.json({
        worker: {
          id: worker.id,
          name: worker.name,
          apiKey: worker.apiKey
        },
        downloadUrl: `${serverUrl}/api/downloads/windows-service`,
        setupInstructions: [
          '1. Download the Windows service using the link above',
          '2. Extract the ZIP file to your Windows 11 machine',
          '3. Create a .env file with your worker credentials',
          `4. Add this to .env: API_KEY=${worker.apiKey}`,
          `5. Add this to .env: SERVER_URL=${serverUrl}`,
          '6. Run INSTALL.bat as Administrator',
          '7. Your printers will sync automatically'
        ]
      });
    } catch (error: any) {
      console.error('Error in registerAndDownload:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
