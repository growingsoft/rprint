import * as os from 'os';
import * as path from 'path';

if (os.platform() !== 'win32') {
  console.error('Windows service uninstallation is only supported on Windows');
  process.exit(1);
}

// Dynamic import for node-windows (only available on Windows)
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'RPrint Virtual Printer Monitor',
  script: path.join(__dirname, 'index.js')
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully!');
  console.log('The RPrint Virtual Printer Monitor service has been removed.');
});

svc.on('error', (err: Error) => {
  console.error('Service uninstallation error:', err);
});

console.log('Uninstalling RPrint Virtual Printer Monitor service...');
svc.uninstall();
