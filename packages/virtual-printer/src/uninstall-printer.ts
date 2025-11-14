import { execSync } from 'child_process';
import * as os from 'os';

const PRINTER_NAME = 'RPrint Virtual Printer';

function isWindows(): boolean {
  return os.platform() === 'win32';
}

function isMac(): boolean {
  return os.platform() === 'darwin';
}

function uninstallWindowsPrinter() {
  console.log('Uninstalling RPrint Virtual Printer from Windows...');

  try {
    execSync(`powershell -Command "Remove-Printer -Name '${PRINTER_NAME}'"`, { stdio: 'inherit' });
    console.log('Printer removed successfully!');
  } catch (error: any) {
    console.error('Failed to uninstall printer:', error.message);
    console.error('\nMake sure to run this script as Administrator!');
    process.exit(1);
  }
}

function uninstallMacPrinter() {
  console.log('Uninstalling RPrint Virtual Printer from macOS...');

  try {
    execSync(`lpadmin -x "${PRINTER_NAME}"`, { stdio: 'inherit' });
    console.log('Printer removed successfully!');
  } catch (error: any) {
    console.error('Failed to uninstall printer:', error.message);
    console.error('\nMake sure to run this script with sudo:');
    console.error('sudo node dist/uninstall-printer.js');
    process.exit(1);
  }
}

function main() {
  console.log('RPrint Virtual Printer Uninstaller\n');

  if (isWindows()) {
    uninstallWindowsPrinter();
  } else if (isMac()) {
    uninstallMacPrinter();
  } else {
    console.error('Unsupported platform:', os.platform());
    process.exit(1);
  }
}

main();
