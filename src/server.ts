import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { closeDatabase } from './database/index.js';
import { closeRedis } from './lib/redis.js';

export function createApp(): Express {
  const app = express();

  // Security headers & CORS
  app.use(helmet());
  app.use(cors());

  // JSON request body parser with payload limit
  app.use(express.json({ limit: '1mb' }));

  // Basic request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Health check routes
  app.use('/health', healthRouter);

  // 404 Handler for unmatched routes
  app.use(notFoundHandler);

  // Centralized Error Handler (must be registered last)
  app.use(errorHandler);

  return app;
}

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`🚀 Notification API Server running at http://${env.HOST}:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});

// Graceful Shutdown handling
let isShuttingDown = false;

async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new HTTP requests
  server.close(async () => {
    console.log('HTTP server closed. Releasing active resources...');

    try {
      // 2. Close backing connections
      console.log('Closing database connection pool...');
      await closeDatabase();

      console.log('Closing Redis connection...');
      await closeRedis();

      console.log('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Failsafe: Force process exit after 10s if connections fail to close
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
