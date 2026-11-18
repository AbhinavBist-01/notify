import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { UnauthorizedError } from './error-handler.js';

/**
 * Timing-safe string comparison to protect against timing attacks.
 */
function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * API Key authentication middleware.
 * Accepts API key via:
 * 1. `x-api-key` header
 * 2. `Authorization: Bearer <key>` header
 */
export function requireApiKey(req: Request, _res: Response, next: NextFunction): void {
  const headerKey = req.header('x-api-key');
  const authHeader = req.header('authorization');

  let providedKey: string | undefined = headerKey;

  if (!providedKey && authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7).trim();
  }

  if (!providedKey) {
    throw new UnauthorizedError('Missing API key. Provide via x-api-key or Authorization: Bearer header.');
  }

  if (!secureCompare(providedKey, env.API_KEY)) {
    throw new UnauthorizedError('Invalid API key.');
  }

  next();
}
