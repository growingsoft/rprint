import { Request, Response } from 'express';
import { ClientPackageModel } from '../models/ClientPackageModel';
import { ServerPackageModel } from '../models/ServerPackageModel';
import { WorkerModel } from '../models/WorkerModel';
import { PackageBuilder } from '../services/PackageBuilder';
import fs from 'fs';
import crypto from 'crypto';

export class PackageController {
  /**
   * Get all client packages
   */
  static async getClientPackages(req: Request, res: Response) {
    try {
      const packages = await ClientPackageModel.findAll();
      res.json(packages);
    } catch (error: any) {
      console.error('Error fetching client packages:', error);
      res.status(500).json({ error: 'Failed to fetch client packages' });
    }
  }

  /**
   * Create a new client package
   */
  static async createClientPackage(req: Request, res: Response) {
    try {
      const { name, operating_system, default_printer_id } = req.body;
      const client_id = (req as any).clientId;

      if (!name || !operating_system) {
        return res.status(400).json({ error: 'Name and operating_system are required' });
      }

      if (!['windows', 'mac', 'linux'].includes(operating_system)) {
        return res.status(400).json({ error: 'Invalid operating_system' });
      }

      const pkg = await ClientPackageModel.create({
        name,
        operating_system,
        client_id,
        default_printer_id
      });

      res.status(201).json(pkg);
    } catch (error: any) {
      console.error('Error creating client package:', error);
      res.status(500).json({ error: 'Failed to create client package' });
    }
  }

  /**
   * Update a client package
   */
  static async updateClientPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const success = await ClientPackageModel.update(id, updates);

      if (!success) {
        return res.status(404).json({ error: 'Package not found' });
      }

      const updated = await ClientPackageModel.findById(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating client package:', error);
      res.status(500).json({ error: 'Failed to update client package' });
    }
  }

  /**
   * Delete a client package
   */
  static async deleteClientPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await ClientPackageModel.delete(id);

      if (!success) {
        return res.status(404).json({ error: 'Package not found' });
      }

      res.json({ message: 'Package deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting client package:', error);
      res.status(500).json({ error: 'Failed to delete client package' });
    }
  }

  /**
   * Regenerate client package auth token
   */
  static async regenerateClientToken(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const new_token = await ClientPackageModel.regenerateToken(id);

      res.json({ auth_token: new_token });
    } catch (error: any) {
      console.error('Error regenerating token:', error);
      res.status(500).json({ error: 'Failed to regenerate token' });
    }
  }

  /**
   * Download client package ZIP
   */
  static async downloadClientPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      let pkg = await ClientPackageModel.findById(id);

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }

      // Auto-regenerate token on download to ensure fresh credentials
      // This is critical for auto-update to work properly
      const new_token = await ClientPackageModel.regenerateToken(id);
      pkg = await ClientPackageModel.findById(id); // Refresh to get new token

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found after token regeneration' });
      }

      // Build package with fresh token
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      const zipPath = await PackageBuilder.buildClientPackage(pkg, serverUrl);

      // Track download
      await ClientPackageModel.trackDownload(id);

      // Send file
      const fileName = `rprint-client-${pkg.name}-${pkg.operating_system}.zip`;
      res.download(zipPath, fileName, (err) => {
        // Clean up file after download
        fs.unlinkSync(zipPath);

        if (err) {
          console.error('Error sending file:', err);
        }
      });
    } catch (error: any) {
      console.error('Error downloading client package:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Failed to build package', details: error.message });
    }
  }

  /**
   * Get all server packages
   */
  static async getServerPackages(req: Request, res: Response) {
    try {
      const packages = await ServerPackageModel.findAll();
      res.json(packages);
    } catch (error: any) {
      console.error('Error fetching server packages:', error);
      res.status(500).json({ error: 'Failed to fetch server packages' });
    }
  }

  /**
   * Create a new server package
   */
  static async createServerPackage(req: Request, res: Response) {
    const fs = require('fs');
    const logFile = '/tmp/rprint-debug.log';
    const log = (msg: string) => {
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
      console.log(msg);
    };

    try {
      log('[PackageController] createServerPackage called');
      log('[PackageController] Request body: ' + JSON.stringify(req.body));
      log('[PackageController] Client ID: ' + (req as any).clientId);

      const { name, selected_printers } = req.body;

      if (!name) {
        log('[PackageController] Name is missing');
        return res.status(400).json({ error: 'Name is required' });
      }

      log('[PackageController] Creating worker: ' + name);
      // Create worker first
      const worker = await WorkerModel.create(name);
      log('[PackageController] Worker created: ' + worker.id);

      const api_key = crypto.randomBytes(32).toString('hex');
      log('[PackageController] Generated API key');

      // Update worker with API key
      await WorkerModel.updateApiKey(worker.id, api_key);
      log('[PackageController] Worker API key updated');

      // Create server package
      log('[PackageController] Creating server package');
      const pkg = await ServerPackageModel.create({
        name,
        worker_id: worker.id,
        api_key,
        selected_printers
      });
      log('[PackageController] Server package created: ' + pkg.id);

      log('[PackageController] Sending response');
      res.status(201).json(pkg);
      log('[PackageController] Response sent successfully');
    } catch (error: any) {
      log('[PackageController ERROR] Error creating server package: ' + error.message);
      log('[PackageController ERROR] Stack: ' + error.stack);
      res.status(500).json({ error: 'Failed to create server package', details: error.message });
    }
  }

  /**
   * Update a server package
   */
  static async updateServerPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const success = await ServerPackageModel.update(id, updates);

      if (!success) {
        return res.status(404).json({ error: 'Package not found' });
      }

      const updated = await ServerPackageModel.findById(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating server package:', error);
      res.status(500).json({ error: 'Failed to update server package' });
    }
  }

  /**
   * Delete a server package
   */
  static async deleteServerPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await ServerPackageModel.delete(id);

      if (!success) {
        return res.status(404).json({ error: 'Package not found' });
      }

      res.json({ message: 'Package deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting server package:', error);
      res.status(500).json({ error: 'Failed to delete server package' });
    }
  }

  /**
   * Regenerate server package API key
   */
  static async regenerateServerApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const new_key = await ServerPackageModel.regenerateApiKey(id);

      // Also update the worker's API key
      const pkg = await ServerPackageModel.findById(id);
      if (pkg) {
        await WorkerModel.updateApiKey(pkg.worker_id, new_key);
      }

      res.json({ api_key: new_key });
    } catch (error: any) {
      console.error('Error regenerating API key:', error);
      res.status(500).json({ error: 'Failed to regenerate API key' });
    }
  }

  /**
   * Download server package ZIP
   */
  static async downloadServerPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pkg = await ServerPackageModel.findById(id);

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found' });
      }

      // Build package
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      const zipPath = await PackageBuilder.buildServerPackage(pkg, serverUrl);

      // Track download
      await ServerPackageModel.trackDownload(id);

      // Send file
      const fileName = `rprint-server-${pkg.name}.zip`;
      res.download(zipPath, fileName, (err) => {
        // Clean up file after download
        fs.unlinkSync(zipPath);

        if (err) {
          console.error('Error sending file:', err);
        }
      });
    } catch (error: any) {
      console.error('Error downloading server package:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Failed to build package', details: error.message });
    }
  }
}
