import dotenv from 'dotenv';
import { ApiClient } from './services/ApiClient';
import { PrintService } from './services/PrintService';
import { logger } from './utils/logger';
import { Config } from './types';

dotenv.config();

// Parse allowed printers from env
const parseAllowedPrinters = (value?: string): string[] => {
  if (!value || value.trim().toLowerCase() === 'all') {
    return [];
  }
  return value.split(',').map(p => p.trim()).filter(p => p.length > 0);
};

// Load configuration
const config: Config = {
  serverUrl: (process.env.SERVER_URL || 'http://localhost:3000').trim(),
  apiKey: (process.env.API_KEY || '').trim(),
  workerName: (process.env.WORKER_NAME || 'Windows-Worker').trim(),
  pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
  logLevel: (process.env.LOG_LEVEL || 'info').trim(),
  allowedPrinters: parseAllowedPrinters(process.env.ALLOWED_PRINTERS)
};

// Validate configuration
if (!config.apiKey) {
  logger.error('API_KEY is not set in environment variables');
  process.exit(1);
}

logger.info('Starting rprint Windows service...');
logger.info(`Server URL: ${config.serverUrl}`);
logger.info(`Worker Name: ${config.workerName}`);
logger.info(`Poll Interval: ${config.pollInterval}ms`);
if (config.allowedPrinters.length > 0) {
  logger.info(`Printer Filter: ${config.allowedPrinters.join(', ')}`);
} else {
  logger.info('Printer Filter: All printers enabled');
}

// Create services
const apiClient = new ApiClient(config.serverUrl, config.apiKey);
const printService = new PrintService(apiClient, config.pollInterval, config.allowedPrinters);

// Start service
printService.start().catch(error => {
  logger.error('Failed to start print service:', error);
  process.exit(1);
});

// Graceful shutdown
const shutdown = () => {
  logger.info('Shutting down service...');
  printService.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
