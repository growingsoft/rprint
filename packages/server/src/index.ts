import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { db } from './database';
import { scheduler } from './utils/scheduler';

// Routes
import authRoutes from './routes/auth';
import printerRoutes from './routes/printers';
import jobRoutes from './routes/jobs';
import workerRoutes from './routes/workers';
import downloadRoutes from './routes/downloads';
import webhookRoutes from './routes/webhooks';
import apikeyRoutes from './routes/apikeys';
import packageRoutes from './routes/packages';
import clientRoutes from './routes/clients';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - we're behind nginx (1 proxy hop)
app.set('trust proxy', 1);

// Middleware
// Configure helmet to allow Swagger UI resources
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "unpkg.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "unpkg.com"],
      imgSrc: ["'self'", "data:", "validator.swagger.io"],
      fontSrc: ["'self'", "data:"],
    },
  },
}));
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - disabled temporarily due to proxy configuration issues
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per windowMs
//   standardHeaders: true,
//   legacyHeaders: false
// });
// app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/api-keys', apikeyRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/clients', clientRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// SPA fallback - serve index.html for client-side routes
app.get(['/', '/jobs', '/jobs/*', '/printers', '/printers/*', '/workers', '/workers/*', '/settings', '/settings/*', '/login', '/register', '/admin', '/admin/*', '/servers', '/servers/*', '/users', '/users/*', '/API-token', '/API-token/*', '/api-token', '/api-token/*', '/api-docs', '/api-docs/*', '/print', '/print/*'], (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check (both /health and /api/health for compatibility)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve OpenAPI specification
app.get('/api/openapi.yaml', (_req, res) => {
  const openapiPath = path.join(__dirname, '../openapi.yaml');
  if (fs.existsSync(openapiPath)) {
    res.type('text/yaml').sendFile(openapiPath);
  } else {
    res.status(404).json({ error: 'OpenAPI specification not found' });
  }
});

// Redirect /apidoc to documentation page
app.get('/apidoc', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/apidoc.html'));
});

// Also serve /apidoc.html for direct access
app.get('/apidoc.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/apidoc.html'));
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function start() {
  try {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/rprint.db');
    await db.connect(dbPath);
    await db.initialize();
    console.log('Database initialized');

    scheduler.start();
    console.log('Scheduler started');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  scheduler.stop();
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  scheduler.stop();
  await db.close();
  process.exit(0);
});

start();
