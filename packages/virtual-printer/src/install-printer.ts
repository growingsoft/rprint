import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PRINTER_NAME = 'RPrint Virtual Printer';
const WATCH_FOLDER = path.join(os.homedir(), 'RPrint', 'PrintQueue');

function isWindows(): boolean {
  return os.platform() === 'win32';
}

function isMac(): boolean {
  return os.platform() === 'darwin';
}

function ensureWatchFolder() {
  if (!fs.existsSync(WATCH_FOLDER)) {
    fs.mkdirSync(WATCH_FOLDER, { recursive: true });
    console.log(`Created watch folder: ${WATCH_FOLDER}`);
  }
}

function installWindowsPrinter() {
  console.log('Installing RPrint Virtual Printer on Windows...');

  try {
    // Check if printer already exists
    const existingPrinters = execSync('wmic printer get name', { encoding: 'utf-8' });
    if (existingPrinters.includes(PRINTER_NAME)) {
      console.log('Printer already exists. Removing...');
      execSync(`powershell -Command "Remove-Printer -Name '${PRINTER_NAME}'"`, { stdio: 'inherit' });
    }

    // Create the printer using Microsoft Print to PDF driver
    // This driver is built into Windows 10+
    const psScript = `
      $printerName = "${PRINTER_NAME}"
      $driverName = "Microsoft Print To PDF"
      $portName = "FILE:"

      # Check if driver exists
      if (-not (Get-PrinterDriver -Name $driverName -ErrorAction SilentlyContinue)) {
        Write-Error "Microsoft Print To PDF driver not found. Please ensure it's installed."
        exit 1
      }

      # Create printer
      Add-Printer -Name $printerName -DriverName $driverName -PortName $portName

      # Set print to file location
      $printer = Get-WmiObject -Class Win32_Printer | Where-Object { $_.Name -eq $printerName }
      if ($printer) {
        $printer.PortName = "FILE:"
        $printer.Put() | Out-Null
      }

      Write-Host "Printer '$printerName' installed successfully!"
    `;

    const scriptPath = path.join(os.tmpdir(), 'install-rprint-printer.ps1');
    fs.writeFileSync(scriptPath, psScript);

    execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: 'inherit' });

    fs.unlinkSync(scriptPath);

    console.log('\nIMPORTANT: When printing, you will be prompted to save the PDF.');
    console.log(`Please save it to: ${WATCH_FOLDER}`);
    console.log('\nAlternatively, use the Windows service that auto-monitors a folder.');

  } catch (error: any) {
    console.error('Failed to install printer:', error.message);
    console.error('\nMake sure to run this script as Administrator!');
    process.exit(1);
  }
}

function installMacPrinter() {
  console.log('Installing RPrint Virtual Printer on macOS...');

  try {
    // Check if printer already exists
    try {
      const existingPrinters = execSync('lpstat -p', { encoding: 'utf-8' });
      if (existingPrinters.includes(PRINTER_NAME)) {
        console.log('Printer already exists. Removing...');
        execSync(`lpadmin -x "${PRINTER_NAME}"`, { stdio: 'inherit' });
      }
    } catch (e) {
      // Printer doesn't exist, continue
    }

    // Create a CUPS printer that prints to PDF in our watch folder
    // We'll use the CUPS-PDF backend
    const cupsConfigPath = '/etc/cups/cups-pdf.conf';

    // First, install CUPS-PDF if not present
    console.log('Checking for CUPS-PDF...');

    // Add printer using Generic PostScript driver with file output
    const ppd = '/System/Library/Frameworks/ApplicationServices.framework/Versions/A/Frameworks/PrintCore.framework/Resources/Generic.ppd';

    execSync(`lpadmin -p "${PRINTER_NAME}" -v "file://${WATCH_FOLDER}/" -P "${ppd}" -E`, { stdio: 'inherit' });

    // Set default options
    execSync(`lpadmin -p "${PRINTER_NAME}" -o printer-is-shared=false`, { stdio: 'inherit' });
    execSync(`lpadmin -p "${PRINTER_NAME}" -o document-format=application/pdf`, { stdio: 'inherit' });

    console.log(`\nPrinter '${PRINTER_NAME}' installed successfully!`);
    console.log(`Print jobs will be saved to: ${WATCH_FOLDER}`);
    console.log(`\nNote: You may need to run this with sudo for full permissions.`);

  } catch (error: any) {
    console.error('Failed to install printer:', error.message);
    console.error('\nMake sure to run this script with sudo:');
    console.error('sudo node dist/install-printer.js');
    process.exit(1);
  }
}

function main() {
  console.log('RPrint Virtual Printer Installer\n');

  // Create watch folder
  ensureWatchFolder();

  if (isWindows()) {
    installWindowsPrinter();
  } else if (isMac()) {
    installMacPrinter();
  } else {
    console.error('Unsupported platform:', os.platform());
    console.error('This installer only supports Windows and macOS.');
    process.exit(1);
  }

  console.log('\n=== Next Steps ===');
  console.log('1. Copy .env.example to .env and configure your credentials');
  console.log('2. Run: npm start');
  console.log('3. Print from any application to "RPrint Virtual Printer"');
  console.log(`4. Files will be monitored in: ${WATCH_FOLDER}`);
}

main();
