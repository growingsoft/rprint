import { execSync } from 'child_process';
import { Printer } from '../types';
import { logger } from './logger';

export class PrinterUtils {
  /**
   * Get list of printers using PowerShell
   */
  static getPrinters(): Printer[] {
    try {
      // PowerShell command to get printer information
      const command = `powershell -Command "Get-Printer | Select-Object Name, DriverName, PortName, ShareName, Shared, Published, Type, Default, PrinterStatus, Location, Comment | ConvertTo-Json"`;

      const output = execSync(command, { encoding: 'utf-8' });
      let printers = JSON.parse(output);

      // Ensure printers is an array
      if (!Array.isArray(printers)) {
        printers = [printers];
      }

      return printers.map((p: any) => ({
        name: p.Name,
        displayName: p.Name,
        isDefault: p.Default || false,
        status: this.mapPrinterStatus(p.PrinterStatus),
        description: p.Comment || '',
        location: p.Location || '',
        capabilities: this.detectCapabilities(p)
      }));
    } catch (error) {
      logger.error('Error getting printers:', error);
      return [];
    }
  }

  /**
   * Detect printer capabilities (simplified version)
   */
  private static detectCapabilities(printer: any): any {
    // Default capabilities - in real implementation, query actual printer capabilities
    return {
      color: !printer.Name.toLowerCase().includes('mono'),
      duplex: true, // Assume most modern printers support duplex
      paperSizes: ['A4', 'Letter', 'Legal', 'A3'],
      maxCopies: 99
    };
  }

  /**
   * Map printer status to simplified status
   */
  private static mapPrinterStatus(status: number): string {
    // Windows printer status codes
    if (status === 0) return 'online';
    if (status === 1) return 'busy';
    if (status === 2) return 'error';
    return 'offline';
  }

  /**
   * Print a file using pdf-to-printer or native Windows commands
   */
  static async printFile(
    printerName: string,
    filePath: string,
    options: {
      copies?: number;
      colorMode?: 'color' | 'grayscale';
      duplex?: 'none' | 'short' | 'long';
      orientation?: 'portrait' | 'landscape';
      scale?: 'fit' | 'noscale' | 'shrink';
    }
  ): Promise<void> {
    try {
      const pdfToPrinter = require('pdf-to-printer');

      const printOptions: any = {
        printer: printerName,
        copies: options.copies || 1,
        scale: options.scale || 'noscale'
      };

      // Add additional options if supported
      if (options.duplex && options.duplex !== 'none') {
        printOptions.duplex = options.duplex;
      }
      if (options.orientation) {
        printOptions.orientation = options.orientation;
      }
      if (options.colorMode === 'grayscale') {
        printOptions.monochrome = true;
      }

      await pdfToPrinter.print(filePath, printOptions);
      logger.info(`Successfully printed ${filePath} on ${printerName}`);
    } catch (error) {
      logger.error(`Error printing file: ${error}`);
      throw error;
    }
  }

  /**
   * Print non-PDF files using native Windows printing
   */
  static printNonPdfFile(printerName: string, filePath: string, mimeType?: string): void {
    try {
      let command: string;
      // Sanitize file path for shell command
      const sanitizedFilePath = filePath.replace(/'/g, "''");

      if (mimeType && mimeType.startsWith('image/')) {
        // Use mspaint for printing images to a specific printer.
        // The /pt switch prints to a specific printer without user interaction.
        command = `mspaint /pt "${sanitizedFilePath}" "${printerName}"`;
        logger.info(`Printing image ${filePath} to ${printerName} using mspaint`);
      } else if (
        (mimeType && (mimeType === 'application/zpl' || mimeType === 'application/vnd.zebra.zpl')) ||
        filePath.toLowerCase().endsWith('.zpl')
      ) {
        // For ZPL, send raw content to the printer via PowerShell.
        command = `powershell -Command "Get-Content -Path '${sanitizedFilePath}' -Raw | Out-Printer -Name '${printerName}'"`;
        logger.info(`Sending ZPL file ${filePath} to printer ${printerName}`);
      } else {
        // Fallback to the 'print' command for other file types.
        // This is better than 'Start-Process -Verb Print' as it allows specifying a printer.
        command = `print /d:"${printerName}" "${sanitizedFilePath}"`;
        logger.info(`Sending ${filePath} to printer ${printerName} using "print" command`);
      }

      execSync(command, { stdio: 'ignore' }); // ignore stdio to prevent hanging
      logger.info(`Successfully sent ${filePath} to printer ${printerName}`);
    } catch (error) {
      logger.error(`Error printing non-PDF file: ${error}`);
      throw error;
    }
  }
}
