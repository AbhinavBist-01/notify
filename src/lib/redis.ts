import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    if (redis.status !== 'ready' && redis.status !== 'connecting' && redis.status !== 'connect') {
      await redis.connect();
    }
    const response = await redis.ping();
    return response === 'PONG';
  } catch (err) {
    console.error('Redis health check failed:', err);
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis.status !== 'end') {
    await redis.quit();
  }
}
