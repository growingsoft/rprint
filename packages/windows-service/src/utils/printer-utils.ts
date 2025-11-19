import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Printer, PrinterInfo } from '../types';
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
   * Get supported paper sizes for a printer
   */
  static async getPrinterPaperSizes(printerName: string): Promise<string[]> {
    try {
      const pdfToPrinter = require('pdf-to-printer');
      const printers = await pdfToPrinter.getPrinters();
      const printer = printers.find((p: any) => p.name === printerName);

      if (printer && printer.paperSizes) {
        logger.info(`Printer ${printerName} supports paper sizes: ${JSON.stringify(printer.paperSizes)}`);
        return printer.paperSizes;
      }

      logger.warn(`Could not get paper sizes for printer ${printerName}`);
      return [];
    } catch (error) {
      logger.error(`Error getting printer paper sizes: ${error}`);
      return [];
    }
  }

  /**
   * Map common paper size names to printer-specific names
   */
  private static mapPaperSize(requestedSize: string, availableSizes: string[]): string {
    // Try exact match first
    if (availableSizes.includes(requestedSize)) {
      return requestedSize;
    }

    // Common 4x6 label variations
    const label4x6Variants = [
      '4x6',
      '4 x 6',
      '4" x 6"',
      'Index 4x6',
      'Index 4 x 6',
      '4x6 Label',
      'Label 4x6',
      '4x6 in',
      '10x15cm',
      '101.6x152.4mm'
    ];

    // If requesting 4x6, try all common variations
    if (requestedSize === '4x6') {
      for (const variant of label4x6Variants) {
        const match = availableSizes.find(size =>
          size.toLowerCase().includes(variant.toLowerCase()) ||
          variant.toLowerCase().includes(size.toLowerCase())
        );
        if (match) {
          logger.info(`Mapped paper size '${requestedSize}' to '${match}'`);
          return match;
        }
      }
    }

    // Try case-insensitive partial match
    const match = availableSizes.find(size =>
      size.toLowerCase().includes(requestedSize.toLowerCase()) ||
      requestedSize.toLowerCase().includes(size.toLowerCase())
    );

    if (match) {
      logger.info(`Mapped paper size '${requestedSize}' to '${match}' (partial match)`);
      return match;
    }

    // No match found, return original
    logger.warn(`No mapping found for paper size '${requestedSize}'. Available sizes: ${JSON.stringify(availableSizes)}`);
    return requestedSize;
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
      paperSize?: string;
    }
  ): Promise<void> {
    try {
      logger.info(`Attempting to print ${filePath} on ${printerName}`);
      logger.info(`Print options: ${JSON.stringify(options)}`);

      // For Zebra printers or 4x6 labels, use SumatraPDF with raw printing
      if (printerName.toLowerCase().includes('zebra') || options.paperSize === '4x6') {
        logger.info('Using SumatraPDF for Zebra/label printing');
        await this.printWithSumatraPDF(printerName, filePath, options);
        return;
      }

      // For other printers, use pdf-to-printer
      const pdfToPrinter = require('pdf-to-printer');

      const printOptions: any = {
        printer: printerName,
        copies: options.copies || 1
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

      logger.info(`Final print options: ${JSON.stringify(printOptions)}`);
      await pdfToPrinter.print(filePath, printOptions);
      logger.info(`Successfully printed ${filePath} on ${printerName}`);
    } catch (error) {
      logger.error(`Error printing file: ${error}`);
      throw error;
    }
  }

  /**
   * Print using SumatraPDF which respects PDF page size
   */
  private static async printWithSumatraPDF(
    printerName: string,
    filePath: string,
    options: {
      copies?: number;
      colorMode?: 'color' | 'grayscale';
      duplex?: 'none' | 'short' | 'long';
      orientation?: 'portrait' | 'landscape';
      paperSize?: string;
    }
  ): Promise<void> {
    try {
      // Try common SumatraPDF installation locations
      const sumatraLocations = [
        'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
        'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
        process.env.ProgramFiles + '\\SumatraPDF\\SumatraPDF.exe',
        process.env['ProgramFiles(x86)'] + '\\SumatraPDF\\SumatraPDF.exe'
      ];

      let sumatraPath = null;
      for (const loc of sumatraLocations) {
        if (fs.existsSync(loc)) {
          sumatraPath = loc;
          break;
        }
      }

      if (!sumatraPath) {
        logger.warn('SumatraPDF not found, falling back to PowerShell print');
        await this.printWithPowerShell(printerName, filePath, options);
        return;
      }

      logger.info(`Using SumatraPDF at: ${sumatraPath}`);

      // SumatraPDF command: -print-to <printer> -print-settings "noscale" <file>
      // noscale = don't scale, fit = fit to page, shrink = shrink if needed
      const command = `"${sumatraPath}" -print-to "${printerName}" -print-settings "noscale" -silent "${filePath}"`;

      logger.info(`SumatraPDF command: ${command}`);
      execSync(command, { timeout: 30000 });

      logger.info(`Successfully printed ${filePath} with SumatraPDF`);
    } catch (error) {
      logger.error(`Error printing with SumatraPDF: ${error}`);
      throw error;
    }
  }

  /**
   * Print using PowerShell (fallback method)
   */
  private static async printWithPowerShell(
    printerName: string,
    filePath: string,
    options: {
      copies?: number;
      colorMode?: 'color' | 'grayscale';
      duplex?: 'none' | 'short' | 'long';
      orientation?: 'portrait' | 'landscape';
      paperSize?: string;
    }
  ): Promise<void> {
    try {
      logger.info('Using PowerShell direct printing');

      // Use Adobe Reader or default PDF viewer
      const command = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList '\\\\'${printerName}'\\\\' -WindowStyle Hidden -Wait"`;

      logger.info(`PowerShell command: ${command}`);
      execSync(command, { timeout: 30000 });

      logger.info(`Successfully printed ${filePath} with PowerShell`);
    } catch (error) {
      logger.error(`Error printing with PowerShell: ${error}`);
      throw error;
    }
  }

  /**
   * Print non-PDF files using native Windows printing
   */
  static async printNonPdfFile(printerName: string, filePath: string): Promise<void> {
    try {
      const ext = path.extname(filePath).toLowerCase();

      // Handle PostScript files by converting to PDF first
      if (ext === '.ps') {
        logger.info(`Converting PostScript file to PDF: ${filePath}`);
        const pdfPath = filePath.replace(/\.ps$/i, '_converted.pdf');

        try {
          // Try using Ghostscript to convert PS to PDF
          // Common Ghostscript locations on Windows
          const gsLocations = [
            'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe',
            'C:\\Program Files\\gs\\gs10.02.0\\bin\\gswin64c.exe',
            'C:\\Program Files\\gs\\gs10.01.2\\bin\\gswin64c.exe',
            'C:\\Program Files (x86)\\gs\\gs10.02.1\\bin\\gswin32c.exe',
            'C:\\Program Files (x86)\\gs\\gs10.02.0\\bin\\gswin32c.exe',
            'gswin64c.exe', // Try PATH
            'gswin32c.exe'  // Try PATH
          ];

          let gsPath = null;
          for (const loc of gsLocations) {
            try {
              execSync(`where "${loc}"`, { stdio: 'ignore' });
              gsPath = loc;
              break;
            } catch {
              // Try next location
            }
          }

          if (!gsPath) {
            throw new Error('Ghostscript not found. Please install Ghostscript to print PostScript files.');
          }

          // Convert PS to PDF using Ghostscript
          const gsCommand = `"${gsPath}" -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -sOutputFile="${pdfPath}" "${filePath}"`;
          execSync(gsCommand);
          logger.info(`Converted PS to PDF: ${pdfPath}`);

          // Now print the PDF
          await this.printFile(printerName, pdfPath, { copies: 1 });

          // Clean up converted PDF
          fs.unlinkSync(pdfPath);
          logger.info(`Cleaned up converted PDF: ${pdfPath}`);
          return;
        } catch (error) {
          logger.error(`Failed to convert PostScript: ${error}`);
          throw error;
        }
      }

      // For other non-PDF files, use Windows Shell Execute
      const command = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb Print -WindowStyle Hidden"`;
      execSync(command);
      logger.info(`Successfully sent ${filePath} to default printer`);
    } catch (error) {
      logger.error(`Error printing non-PDF file: ${error}`);
      throw error;
    }
  }
}
