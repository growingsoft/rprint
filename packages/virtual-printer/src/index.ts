import { PrinterMonitor } from './printer-monitor';
import * as path from 'path';
import * as os from 'os';

const config = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  watchFolder: process.env.WATCH_FOLDER || path.join(os.homedir(), 'RPrint', 'PrintQueue'),
  username: process.env.RPRINT_USERNAME || '',
  password: process.env.RPRINT_PASSWORD || '',
  printerName: process.env.PRINTER_NAME || undefined
};

if (!config.username || !config.password) {
  console.error('Error: RPRINT_USERNAME and RPRINT_PASSWORD must be set in .env file');
  process.exit(1);
}

const monitor = new PrinterMonitor(config);

monitor.start().catch(error => {
  console.error('Failed to start printer monitor:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down printer monitor...');
  process.exit(0);
});
