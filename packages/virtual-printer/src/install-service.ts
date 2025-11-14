import * as os from 'os';
import * as path from 'path';

if (os.platform() !== 'win32') {
  console.error('Windows service installation is only supported on Windows');
  console.log('For macOS, please see README.md for LaunchAgent setup instructions');
  process.exit(1);
}

// Dynamic import for node-windows (only available on Windows)
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'RPrint Virtual Printer Monitor',
  description: 'Monitors print queue folder and uploads jobs to RPrint server',
  script: path.join(__dirname, 'index.js'),
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

svc.on('install', () => {
  console.log('Service installed successfully!');
  console.log('Starting service...');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started!');
  console.log('\nThe RPrint Virtual Printer Monitor is now running as a Windows service.');
  console.log('It will automatically start when Windows boots.');
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed.');
});

svc.on('error', (err: Error) => {
  console.error('Service installation error:', err);
});

console.log('Installing RPrint Virtual Printer Monitor as a Windows service...');
console.log('This may take a moment...\n');
svc.install();
