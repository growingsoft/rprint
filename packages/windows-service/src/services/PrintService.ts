import { ApiClient } from './ApiClient';
import { PrinterUtils } from '../utils/printer-utils';
import { logger } from '../utils/logger';
import { PrintJob, Printer } from '../types';

export class PrintService {
  private apiClient: ApiClient;
  private pollInterval: number;
  private printers: Printer[] = [];
  private printerMap: Map<string, Printer> = new Map();
  private isRunning: boolean = false;
  private pollTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(apiClient: ApiClient, pollInterval: number) {
    this.apiClient = apiClient;
    this.pollInterval = pollInterval;
  }

  /**
   * Start the print service
   */
  async start(): Promise<void> {
    logger.info('Starting print service...');
    this.isRunning = true;

    // Initial printer sync
    await this.syncPrinters();

    // Start heartbeat
    this.startHeartbeat();

    // Start polling for each printer
    this.startPolling();

    // Periodically resync printers (every 5 minutes)
    setInterval(() => {
      this.syncPrinters();
    }, 5 * 60 * 1000);

    logger.info('Print service started successfully');
  }

  /**
   * Stop the print service
   */
  stop(): void {
    logger.info('Stopping print service...');
    this.isRunning = false;

    // Stop all polling timers
    this.pollTimers.forEach(timer => clearInterval(timer));
    this.pollTimers.clear();

    logger.info('Print service stopped');
  }

  /**
   * Sync printers with server
   */
  private async syncPrinters(): Promise<void> {
    try {
      this.printers = PrinterUtils.getPrinters();
      logger.info(`Found ${this.printers.length} printers`);

      if (this.printers.length > 0) {
        await this.apiClient.syncPrinters(this.printers);

        // Update printer map (Note: server returns printer IDs, but we'll use names for now)
        this.printerMap.clear();
        this.printers.forEach(printer => {
          this.printerMap.set(printer.name, printer);
        });
      }
    } catch (error) {
      logger.error('Error syncing printers:', error);
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds
    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.apiClient.sendHeartbeat();
      } catch (error) {
        logger.error('Heartbeat failed:', error);
      }
    }, 30000);

    // Send initial heartbeat
    this.apiClient.sendHeartbeat().catch(err => {
      logger.error('Initial heartbeat failed:', err);
    });
  }

  /**
   * Start polling for print jobs
   */
  private startPolling(): void {
    // For simplicity, we'll poll for all printers
    // In production, you'd want to get printer IDs from the server after sync
    this.printers.forEach(printer => {
      const timer = setInterval(async () => {
        if (!this.isRunning) return;
        await this.pollAndPrint(printer);
      }, this.pollInterval);

      this.pollTimers.set(printer.name, timer);
    });
  }

  /**
   * Poll for jobs and print them
   */
  private async pollAndPrint(printer: Printer): Promise<void> {
    try {
      // Note: In real implementation, you'd need the printer ID from server
      // For now, we'll use printer name as identifier
      const jobs = await this.apiClient.pollPrintJobs(printer.name);

      for (const job of jobs) {
        await this.processPrintJob(job, printer);
      }
    } catch (error) {
      logger.error(`Error polling for printer ${printer.name}:`, error);
    }
  }

  /**
   * Process a single print job
   */
  private async processPrintJob(job: PrintJob, printer: Printer): Promise<void> {
    let localFilePath: string | null = null;

    try {
      logger.info(`Processing job ${job.id} for printer ${printer.name}`);

      // Update status to printing
      await this.apiClient.updateJobStatus(job.id, 'printing');

      // Download file
      localFilePath = await this.apiClient.downloadJobFile(job.id, job.fileName);

      // Print file
      if (job.mimeType === 'application/pdf') {
        await PrinterUtils.printFile(printer.name, localFilePath, {
          copies: job.copies,
          colorMode: job.colorMode,
          duplex: job.duplex,
          orientation: job.orientation
        });
      } else {
        // For non-PDF files, use native printing
        PrinterUtils.printNonPdfFile(printer.name, localFilePath);
      }

      // Update status to completed
      await this.apiClient.updateJobStatus(job.id, 'completed');
      logger.info(`Successfully completed job ${job.id}`);
    } catch (error: any) {
      logger.error(`Error processing job ${job.id}:`, error);
      await this.apiClient.updateJobStatus(job.id, 'failed', error.message);
    } finally {
      // Clean up downloaded file
      if (localFilePath) {
        this.apiClient.cleanupFile(localFilePath);
      }
    }
  }
}
