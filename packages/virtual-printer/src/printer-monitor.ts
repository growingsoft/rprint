import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import * as dotenv from 'dotenv';
import { PrinterDialog } from './PrinterDialog';

dotenv.config();

interface Config {
  serverUrl: string;
  watchFolder: string;
  username: string;
  password: string;
  printerName?: string;
  pollInterval?: number;
}

export class PrinterMonitor {
  private config: Config;
  private authToken: string | null = null;
  private processing = new Set<string>();

  constructor(config: Config) {
    this.config = {
      pollInterval: 2000,
      ...config
    };
  }

  async start() {
    console.log('RPrint Virtual Printer Monitor started');
    console.log(`Watching folder: ${this.config.watchFolder}`);
    console.log(`Server: ${this.config.serverUrl}`);

    // Ensure watch folder exists
    if (!fs.existsSync(this.config.watchFolder)) {
      fs.mkdirSync(this.config.watchFolder, { recursive: true });
      console.log(`Created watch folder: ${this.config.watchFolder}`);
    }

    // Authenticate with server
    await this.authenticate();

    // Watch for new PDF files
    const watcher = chokidar.watch(this.config.watchFolder, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    watcher.on('add', async (filePath) => {
      if (path.extname(filePath).toLowerCase() === '.pdf') {
        await this.handleNewPrintJob(filePath);
      }
    });

    watcher.on('error', (error) => {
      console.error('Watcher error:', error);
    });

    console.log('Monitoring for print jobs...');
  }

  private async authenticate() {
    try {
      const response = await axios.post(`${this.config.serverUrl}/api/auth/login`, {
        username: this.config.username,
        password: this.config.password
      });

      this.authToken = response.data.token;
      console.log('Authenticated with RPrint server');
    } catch (error: any) {
      console.error('Authentication failed:', error.message);
      throw new Error('Failed to authenticate with RPrint server');
    }
  }

  private async handleNewPrintJob(filePath: string) {
    // Prevent duplicate processing
    if (this.processing.has(filePath)) {
      return;
    }

    this.processing.add(filePath);
    console.log(`New print job detected: ${path.basename(filePath)}`);

    try {
      // Wait a bit to ensure file is fully written
      await this.waitForFileReady(filePath);

      // Get available printers
      const printers = await this.getAvailablePrinters();

      if (printers.length === 0) {
        console.error('No printers available on server');
        this.processing.delete(filePath);
        return;
      }

      // Show printer selection dialog
      const dialog = new PrinterDialog();
      const options = await dialog.show(printers);

      if (!options) {
        console.log('Print job cancelled by user');
        fs.unlinkSync(filePath);
        this.processing.delete(filePath);
        return;
      }

      // Upload to RPrint server for each selected printer
      for (const printerId of options.printerIds) {
        await this.uploadPrintJob(filePath, printerId, options.copies, options.colorMode);
      }

      // Delete the file after successful upload
      fs.unlinkSync(filePath);
      console.log(`Print job sent to ${options.printerIds.length} printer(s) successfully and file cleaned up`);

    } catch (error: any) {
      console.error('Error processing print job:', error.message);
    } finally {
      this.processing.delete(filePath);
    }
  }

  private async waitForFileReady(filePath: string, maxAttempts = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try to open file exclusively to check if it's ready
        const fd = fs.openSync(filePath, 'r+');
        fs.closeSync(fd);
        return;
      } catch (error) {
        // File is still being written, wait
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    throw new Error('File not ready after waiting');
  }

  private async getAvailablePrinters() {
    try {
      // Use the virtual-printer endpoint to get only enabled printers
      const response = await axios.get(`${this.config.serverUrl}/api/printers/virtual-printer/list`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to get printers:', error.message);
      return [];
    }
  }

  private async uploadPrintJob(
    filePath: string,
    printerId: string,
    copies: number = 1,
    colorMode: 'color' | 'grayscale' = 'color'
  ) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('printerId', printerId);
    form.append('copies', copies.toString());
    form.append('colorMode', colorMode);

    const response = await axios.post(`${this.config.serverUrl}/api/jobs`, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    console.log(`Job created: ID ${response.data.id}, Printer: ${printerId}, Copies: ${copies}, Status: ${response.data.status}`);
    return response.data;
  }
}
