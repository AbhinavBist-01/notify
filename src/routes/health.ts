import { Router, type Request, type Response } from 'express';
import { checkDatabaseConnection } from '../database/index.js';
import { checkRedisConnection } from '../lib/redis.js';

export const healthRouter = Router();

/**
 * Liveness probe: /health/live
 * Used by orchestrators (Kubernetes / Docker) to check if the Node process is running.
 * Should NOT depend on external systems like DB or Redis.
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: /health
 * Probes backing dependencies (PostgreSQL, Redis).
 * Returns HTTP 200 if all dependencies are healthy, or HTTP 503 if any dependency is down.
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  const [dbHealthy, redisHealthy] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
  ]);

  const allHealthy = dbHealthy && redisHealthy;
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy ? 'healthy' : 'unhealthy',
    },
  });
});
