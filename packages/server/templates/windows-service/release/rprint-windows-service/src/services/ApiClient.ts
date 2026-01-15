import axios, { AxiosInstance } from 'axios';
import { PrintJob, Printer } from '../types';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export class ApiClient {
  private client: AxiosInstance;
  private serverUrl: string;
  private apiKey: string;
  private downloadDir: string;

  constructor(serverUrl: string, apiKey: string) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
    this.downloadDir = path.join(process.cwd(), 'downloads');

    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }

    this.client = axios.create({
      baseURL: serverUrl,
      headers: {
        'X-API-Key': apiKey
      },
      timeout: 30000
    });
  }

  /**
   * Send heartbeat to server
   */
  async sendHeartbeat(): Promise<void> {
    try {
      await this.client.post('/api/workers/heartbeat');
      logger.debug('Heartbeat sent successfully');
    } catch (error: any) {
      logger.error('Error sending heartbeat:', error.message);
      throw error;
    }
  }

  /**
   * Sync printers with server
   */
  async syncPrinters(printers: Printer[]): Promise<any[]> {
    try {
      const response = await this.client.post('/api/printers/sync', { printers });
      const syncedPrinters = response.data.printers || [];
      logger.info(`Synced ${printers.length} printers with server`);
      return syncedPrinters;
    } catch (error: any) {
      logger.error('Error syncing printers:', error);
      throw error;
    }
  }

  /**
   * Poll for pending print jobs
   */
  async pollPrintJobs(printerId: string): Promise<PrintJob[]> {
    try {
      const response = await this.client.get('/api/jobs/poll/pending', {
        params: { printerId }
      });
      return response.data.jobs || [];
    } catch (error: any) {
      logger.error('Error polling print jobs:', error);
      return [];
    }
  }

  /**
   * Update print job status
   */
  async updateJobStatus(
    jobId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.client.put(`/api/jobs/${jobId}/status`, {
        status,
        errorMessage
      });
      logger.info(`Updated job ${jobId} status to ${status}`);
    } catch (error: any) {
      logger.error('Error updating job status:', error.message);
      throw error;
    }
  }

  /**
   * Download print job file
   */
  async downloadJobFile(jobId: string, fileName: string): Promise<string> {
    try {
      const response = await this.client.get(`/api/jobs/${jobId}/download`, {
        responseType: 'arraybuffer'
      });

      const filePath = path.join(this.downloadDir, `${jobId}_${fileName}`);
      fs.writeFileSync(filePath, response.data);
      logger.info(`Downloaded file to ${filePath}`);
      return filePath;
    } catch (error: any) {
      logger.error('Error downloading job file:', error.message);
      throw error;
    }
  }

  /**
   * Clean up downloaded file
   */
  cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Cleaned up file: ${filePath}`);
      }
    } catch (error: any) {
      logger.error('Error cleaning up file:', error.message);
    }
  }
}
