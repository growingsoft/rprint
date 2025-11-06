import dotenv from 'dotenv';
import { ApiClient } from './services/ApiClient';
import { PrintService } from './services/PrintService';
import { logger } from './utils/logger';
import { Config } from './types';

dotenv.config();

// Load configuration
const config: Config = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY || '',
  workerName: process.env.WORKER_NAME || 'Windows-Worker',
  pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
  logLevel: process.env.LOG_LEVEL || 'info'
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

// Create services
const apiClient = new ApiClient(config.serverUrl, config.apiKey);
const printService = new PrintService(apiClient, config.pollInterval);

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
