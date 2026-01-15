import { execSync } from 'child_process';
import { Printer } from '../types';
import { logger } from './logger';

// Paper size dimensions in points (72 points = 1 inch)
// These are used for proper scaling on label printers
const PAPER_SIZE_DIMENSIONS: Record<string, { width: number; height: number; name: string }> = {
  'A4': { width: 595, height: 842, name: 'A4' },
  'Letter': { width: 612, height: 792, name: 'Letter' },
  'Legal': { width: 612, height: 1008, name: 'Legal' },
  'A3': { width: 842, height: 1191, name: 'A3' },
  'A5': { width: 420, height: 595, name: 'A5' },
  'Tabloid': { width: 792, height: 1224, name: 'Tabloid' },
  // Label sizes (converted from inches to points: inches * 72)
  '4x6': { width: 288, height: 432, name: '4x6in' },
  '4x3': { width: 288, height: 216, name: '4x3in' },
  '4x2': { width: 288, height: 144, name: '4x2in' },
  '4x1': { width: 288, height: 72, name: '4x1in' },
  '2.25x1.25': { width: 162, height: 90, name: '2.25x1.25in' },
  'Label_1.5x3': { width: 108, height: 216, name: '1.5x3in' },
};

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
    const printerName = printer.Name.toLowerCase();
    const isLabelPrinter = printerName.includes('zebra') ||
                           printerName.includes('rollo') ||
                           printerName.includes('dymo') ||
                           printerName.includes('label') ||
                           printerName.includes('gk420');

    // Label printers have different capabilities
    if (isLabelPrinter) {
      return {
        color: false, // Most label printers are thermal (monochrome)
        duplex: false, // Label printers don't support duplex
        paperSizes: ['4x6', '4x3', '4x2', '4x1', '2.25x1.25', 'Label_1.5x3'],
        maxCopies: 99,
        isLabelPrinter: true
      };
    }

    // Default capabilities for regular printers
    return {
      color: !printerName.includes('mono'),
      duplex: true, // Assume most modern printers support duplex
      paperSizes: ['A4', 'Letter', 'Legal', 'A3', 'A5', 'Tabloid', '4x6'],
      maxCopies: 99,
      isLabelPrinter: false
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
   * Check if a paper size is a label size
   */
  static isLabelPaperSize(paperSize: string): boolean {
    const labelSizes = ['4x6', '4x3', '4x2', '4x1', '2.25x1.25', 'Label_1.5x3'];
    return labelSizes.includes(paperSize);
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
      paperSize?: string;
    }
  ): Promise<void> {
    try {
      const pdfToPrinter = require('pdf-to-printer');

      logger.info(`Preparing to print file: ${filePath}`);
      logger.info(`Target printer: ${printerName}`);
      logger.info(`Print options requested:`, options);

      // Detect if this is a label printer (Rollo, Zebra, Dymo, etc.)
      const isLabelPrinter = printerName.toLowerCase().includes('rollo') ||
                            printerName.toLowerCase().includes('zebra') ||
                            printerName.toLowerCase().includes('dymo') ||
                            printerName.toLowerCase().includes('label') ||
                            printerName.toLowerCase().includes('gk420');

      // Check if paper size is a label size
      const isLabelSize = options.paperSize && this.isLabelPaperSize(options.paperSize);

      // For label printers, use SumatraPDF with explicit page dimensions
      if (isLabelPrinter || isLabelSize) {
        logger.info(`Detected label printer or label paper size - using optimized printing`);
        await this.printLabelFile(printerName, filePath, options);
        return;
      }

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
      if (options.paperSize) {
        printOptions.paperSize = options.paperSize;
        logger.info(`Using paper size: ${options.paperSize}`);
      }

      logger.info(`Final print options:`, printOptions);
      logger.info(`Calling pdf-to-printer.print()...`);

      await pdfToPrinter.print(filePath, printOptions);

      logger.info(`pdf-to-printer.print() completed successfully`);
      logger.info(`Printed ${filePath} on ${printerName}`);
    } catch (error: any) {
      logger.error(`Error printing file:`, {
        error: error.message,
        stack: error.stack,
        printer: printerName,
        filePath: filePath
      });
      throw error;
    }
  }

  /**
   * Print a file to a label printer using SumatraPDF with explicit dimensions
   * This ensures the label is printed correctly with proper sizing
   */
  static async printLabelFile(
    printerName: string,
    filePath: string,
    options: {
      copies?: number;
      colorMode?: 'color' | 'grayscale';
      orientation?: 'portrait' | 'landscape';
      scale?: 'fit' | 'noscale' | 'shrink';
      paperSize?: string;
    }
  ): Promise<void> {
    try {
      const pdfToPrinter = require('pdf-to-printer');

      // Get paper dimensions
      const paperSize = options.paperSize || '4x6';
      const dimensions = PAPER_SIZE_DIMENSIONS[paperSize] || PAPER_SIZE_DIMENSIONS['4x6'];

      logger.info(`Label printing with dimensions: ${dimensions.width}x${dimensions.height} points (${paperSize})`);

      // Build print settings string for SumatraPDF
      // Format: "fit,paper=<width>x<height>" where dimensions are in points
      const printSettings: string[] = [];

      // Always use fit for label printers to ensure content fits on label
      const scaleMode = options.scale || 'fit';
      printSettings.push(scaleMode);

      // Add paper dimensions
      printSettings.push(`paper=${dimensions.width}x${dimensions.height}`);

      // Add copies
      const copies = options.copies || 1;
      if (copies > 1) {
        printSettings.push(`${copies}x`);
      }

      // Add monochrome if requested
      if (options.colorMode === 'grayscale') {
        printSettings.push('monochrome');
      }

      const printOptions: any = {
        printer: printerName,
        printSettings: printSettings.join(',')
      };

      logger.info(`Label print options:`, printOptions);
      logger.info(`Print settings string: ${printOptions.printSettings}`);

      await pdfToPrinter.print(filePath, printOptions);

      logger.info(`Label printing completed successfully`);
      logger.info(`Printed ${filePath} on ${printerName}`);
    } catch (error: any) {
      logger.error(`Error printing label file:`, {
        error: error.message,
        stack: error.stack,
        printer: printerName,
        filePath: filePath
      });
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
