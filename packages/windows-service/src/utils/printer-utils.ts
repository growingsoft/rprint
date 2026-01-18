import { execSync } from 'child_process';
import { existsSync, unlinkSync, copyFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { Printer } from '../types';
import { logger } from './logger';

// Debug mode - saves PDFs to debug folder for inspection
const DEBUG_LABEL_PRINTING = true;
const DEBUG_FOLDER = 'C:\\RPrint\\debug';

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
   * Find Ghostscript executable on Windows
   * Returns the path to gswin64c.exe or gswin32c.exe if found
   */
  static findGhostscript(): string | null {
    const possiblePaths = [
      // Check if in PATH first
      'gswin64c',
      'gswin32c',
      // Common installation paths
      'C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.03.1\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.03.0\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.02.0\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.01.2\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.01.1\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs10.00.0\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs9.56.1\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs9.55.0\\bin\\gswin64c.exe',
      'C:\\Program Files\\gs\\gs9.54.0\\bin\\gswin64c.exe',
      'C:\\Program Files (x86)\\gs\\gs10.02.1\\bin\\gswin32c.exe',
      'C:\\Program Files (x86)\\gs\\gs9.56.1\\bin\\gswin32c.exe',
    ];

    for (const gsPath of possiblePaths) {
      try {
        execSync(`"${gsPath}" --version`, {
          encoding: 'utf-8',
          timeout: 5000,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        logger.info(`Found Ghostscript at: ${gsPath}`);
        return gsPath;
      } catch {
        // Not found at this path, try next
      }
    }

    logger.warn('Ghostscript not found on system');
    return null;
  }

  /**
   * Resize a PDF to exact label dimensions using Ghostscript
   * This is the key to reliable label printing - the PDF is resized BEFORE printing
   * so the printer receives a PDF that exactly matches the label size.
   */
  static resizePdfForLabel(
    inputPath: string,
    targetWidth: number,
    targetHeight: number
  ): string | null {
    const gsPath = this.findGhostscript();
    if (!gsPath) {
      logger.warn('Ghostscript not available - cannot resize PDF for label');
      return null;
    }

    // Create temp output path
    const outputPath = join(tmpdir(), `rprint-label-${Date.now()}.pdf`);

    // Ghostscript command to resize PDF to exact dimensions
    // -dFIXEDMEDIA: Force the output to use the specified media size
    // -dPDFFitPage: Scale the input content to fit the output page
    // -dCompatibilityLevel=1.4: Ensure broad compatibility
    const command = `"${gsPath}" -dNOPAUSE -dBATCH -dQUIET -sDEVICE=pdfwrite ` +
      `-dCompatibilityLevel=1.4 -dFIXEDMEDIA -dPDFFitPage ` +
      `-dDEVICEWIDTHPOINTS=${targetWidth} -dDEVICEHEIGHTPOINTS=${targetHeight} ` +
      `-sOutputFile="${outputPath}" "${inputPath}"`;

    logger.info(`Resizing PDF to ${targetWidth}x${targetHeight} points for label printing`);
    logger.debug(`Ghostscript command: ${command}`);

    try {
      execSync(command, {
        encoding: 'utf-8',
        timeout: 60000,  // 60 second timeout for large PDFs
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Verify output file was created
      if (existsSync(outputPath)) {
        logger.info(`PDF resized successfully: ${outputPath}`);
        return outputPath;
      } else {
        logger.error('Ghostscript completed but output file not found');
        return null;
      }
    } catch (error: any) {
      logger.error(`Ghostscript resize failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Print a file to a label printer
   *
   * STRATEGY: Try multiple approaches in order of reliability:
   * 1. Use Ghostscript to resize PDF to exact label dimensions
   * 2. If that fails, convert PDF to image and print the image
   * 3. If all else fails, use SumatraPDF with fit scaling
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
    const pdfToPrinter = require('pdf-to-printer');
    let fileToUse = filePath;
    let tempFileCreated = false;

    try {
      // Determine target label size - ignore non-label sizes
      let paperSize = options.paperSize || '4x6';
      if (!this.isLabelPaperSize(paperSize)) {
        logger.info(`Ignoring non-label paper size "${paperSize}" for label printer, using default "4x6"`);
        paperSize = '4x6';
      }
      const dimensions = PAPER_SIZE_DIMENSIONS[paperSize] || PAPER_SIZE_DIMENSIONS['4x6'];

      logger.info(`=== LABEL PRINTING START ===`);
      logger.info(`Printer: ${printerName}`);
      logger.info(`Target size: ${paperSize} (${dimensions.width}x${dimensions.height} points)`);
      logger.info(`Input file: ${filePath}`);

      // DEBUG: Save original PDF for inspection
      if (DEBUG_LABEL_PRINTING) {
        try {
          mkdirSync(DEBUG_FOLDER, { recursive: true });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const debugOriginal = join(DEBUG_FOLDER, `${timestamp}-1-ORIGINAL.pdf`);
          copyFileSync(filePath, debugOriginal);
          logger.info(`DEBUG: Saved original PDF to ${debugOriginal}`);
        } catch (e) {
          logger.warn(`DEBUG: Could not save original PDF: ${e}`);
        }
      }

      // APPROACH 1: Try to resize PDF with Ghostscript
      logger.info(`Attempting Ghostscript PDF resize...`);
      const resizedPdf = this.resizePdfForLabel(filePath, dimensions.width, dimensions.height);

      if (resizedPdf) {
        fileToUse = resizedPdf;
        tempFileCreated = true;
        logger.info(`SUCCESS: PDF resized to ${dimensions.width}x${dimensions.height} points`);
        logger.info(`Resized file: ${resizedPdf}`);

        // DEBUG: Save resized PDF for inspection
        if (DEBUG_LABEL_PRINTING) {
          try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const debugResized = join(DEBUG_FOLDER, `${timestamp}-2-RESIZED-${paperSize}.pdf`);
            copyFileSync(resizedPdf, debugResized);
            logger.info(`DEBUG: Saved resized PDF to ${debugResized}`);
            logger.info(`DEBUG: Open ${DEBUG_FOLDER} to inspect the PDFs`);
          } catch (e) {
            logger.warn(`DEBUG: Could not save resized PDF: ${e}`);
          }
        }
      } else {
        logger.warn(`Ghostscript resize failed - trying alternative approach`);

        // APPROACH 2: Try to convert PDF to PNG and print the image
        const pngFile = await this.convertPdfToImage(filePath, dimensions.width, dimensions.height);
        if (pngFile) {
          logger.info(`SUCCESS: Converted PDF to image: ${pngFile}`);
          // Print image using mspaint (more reliable for label printers)
          await this.printImageToLabelPrinter(printerName, pngFile, options.copies || 1);
          // Cleanup
          try { unlinkSync(pngFile); } catch {}
          logger.info(`=== LABEL PRINTING COMPLETE (image method) ===`);
          return;
        }

        logger.warn(`Image conversion also failed - using SumatraPDF fallback`);
      }

      // APPROACH 3: Print with SumatraPDF
      const printSettings: string[] = [];

      if (tempFileCreated) {
        // PDF is already correct size - use noscale for 1:1 printing
        printSettings.push('noscale');
        logger.info('Using noscale (PDF already resized to label size)');
      } else {
        // Last resort: try fit scaling with paper dimensions
        printSettings.push('fit');
        logger.info('Using fit scaling (no resize was possible)');
      }

      // Add copies
      const copies = options.copies || 1;
      if (copies > 1) {
        printSettings.push(`${copies}x`);
      }

      const printOptions: any = {
        printer: printerName,
        printSettings: printSettings.join(',')
      };

      logger.info(`SumatraPDF print settings: ${printOptions.printSettings}`);
      logger.info(`Printing file: ${fileToUse}`);

      await pdfToPrinter.print(fileToUse, printOptions);

      logger.info(`=== LABEL PRINTING COMPLETE (PDF method) ===`);

    } catch (error: any) {
      logger.error(`=== LABEL PRINTING FAILED ===`);
      logger.error(`Error: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      throw error;
    } finally {
      // Cleanup temporary files
      if (tempFileCreated && fileToUse !== filePath) {
        try {
          unlinkSync(fileToUse);
          logger.debug(`Cleaned up temp file: ${fileToUse}`);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Convert PDF to PNG image at specific dimensions using Ghostscript
   * This is a fallback for when PDF resizing doesn't work
   */
  static async convertPdfToImage(
    pdfPath: string,
    targetWidth: number,
    targetHeight: number
  ): Promise<string | null> {
    const gsPath = this.findGhostscript();
    if (!gsPath) {
      return null;
    }

    const outputPath = join(tmpdir(), `rprint-label-${Date.now()}.png`);

    // Calculate DPI to achieve target dimensions
    // Ghostscript renders at specified DPI, so we need to calculate what DPI gives us target size
    // For a 4x6 inch label at 203 DPI (common for Zebra): 812x1218 pixels
    // We'll use 203 DPI which is standard for Zebra printers
    const dpi = 203;

    const command = `"${gsPath}" -dNOPAUSE -dBATCH -dQUIET -sDEVICE=png16m ` +
      `-r${dpi} -dPDFFitPage ` +
      `-dDEVICEWIDTHPOINTS=${targetWidth} -dDEVICEHEIGHTPOINTS=${targetHeight} ` +
      `-sOutputFile="${outputPath}" -dFirstPage=1 -dLastPage=1 "${pdfPath}"`;

    logger.info(`Converting PDF to PNG at ${dpi} DPI...`);
    logger.debug(`Command: ${command}`);

    try {
      execSync(command, {
        encoding: 'utf-8',
        timeout: 60000,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (existsSync(outputPath)) {
        logger.info(`PDF converted to PNG: ${outputPath}`);
        return outputPath;
      }
      return null;
    } catch (error: any) {
      logger.error(`PDF to PNG conversion failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Print an image file to a label printer using Windows native printing
   * This is often more reliable than PDF printing for thermal printers
   */
  static async printImageToLabelPrinter(
    printerName: string,
    imagePath: string,
    copies: number = 1
  ): Promise<void> {
    logger.info(`Printing image to label printer: ${printerName}`);

    // Use mspaint for printing - it handles thermal printers well
    // /pt = print to specific printer
    for (let i = 0; i < copies; i++) {
      const command = `mspaint /pt "${imagePath}" "${printerName}"`;
      logger.debug(`Print command: ${command}`);

      try {
        execSync(command, {
          encoding: 'utf-8',
          timeout: 30000,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        logger.info(`Image print ${i + 1}/${copies} sent successfully`);
      } catch (error: any) {
        logger.error(`Image print failed: ${error.message}`);
        throw error;
      }

      // Small delay between copies
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
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
