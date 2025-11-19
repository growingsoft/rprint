import { Service } from 'node-windows';
import path from 'path';

const svc = new Service({
  name: 'RPrint Worker Service',
  description: 'Remote printing worker service for rprint',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [],
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

svc.on('install', () => {
  console.log('Service installed successfully');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed');
});

svc.on('error', (err) => {
  console.error('Service installation error:', err);
});

console.log('Installing rprint worker service...');
svc.install();
