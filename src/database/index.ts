import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { env } from '../config/env.js';

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(dbPool, { schema });

export * from './schema.js';

dbPool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await dbPool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('PostgreSQL health check failed:', err);
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  await dbPool.end();
}
