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
        const syncedPrinters = await this.apiClient.syncPrinters(this.printers);

        // Update printer map with server-assigned IDs
        this.printerMap.clear();
        syncedPrinters.forEach((serverPrinter: any) => {
          // Find matching local printer by name
          const localPrinter = this.printers.find(p => p.name === serverPrinter.name);
          if (localPrinter) {
            // Add server ID to local printer
            (localPrinter as any).id = serverPrinter.id;
            this.printerMap.set(serverPrinter.id, localPrinter);
          }
        });

        logger.info(`Mapped ${this.printerMap.size} printers with server IDs`);
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
    if (this.printerMap.size === 0) {
      logger.warn('No printers found to poll. Printer map is empty.');
      return;
    }

    // Poll for each printer using their server IDs
    this.printerMap.forEach((printer, printerId) => {
      logger.info(`Setting up polling for printer: ${printer.name} (ID: ${printerId})`);

      const timer = setInterval(async () => {
        if (!this.isRunning) return;
        logger.debug(`Polling for jobs on printer: ${printer.name}`);
        await this.pollAndPrint(printerId, printer);
      }, this.pollInterval);

      this.pollTimers.set(printerId, timer);
    });

    logger.info(`Started polling for ${this.printerMap.size} printers`);
  }

  /**
   * Poll for jobs and print them
   */
  private async pollAndPrint(printerId: string, printer: Printer): Promise<void> {
    try {
      const jobs = await this.apiClient.pollPrintJobs(printerId);

      if (jobs.length > 0) {
        logger.info(`Found ${jobs.length} job(s) for printer ${printer.name}`);
      }

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
          orientation: job.orientation,
          scale: job.scale
        });
      } else {
        // For non-PDF files, use native printing
        PrinterUtils.printNonPdfFile(printer.name, localFilePath, job.mimeType);
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
