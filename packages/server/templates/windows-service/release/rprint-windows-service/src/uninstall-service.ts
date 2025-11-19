import { Service } from 'node-windows';
import path from 'path';

const svc = new Service({
  name: 'RPrint Worker Service',
  script: path.join(__dirname, 'index.js')
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully');
});

svc.on('error', (err) => {
  console.error('Service uninstallation error:', err);
});

console.log('Uninstalling rprint worker service...');
svc.uninstall();
