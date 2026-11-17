import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  API_KEY: z.string().min(1, 'API_KEY is required'),
  RESEND_API_KEY: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues;
  const formattedErrors = issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`❌ Invalid or missing environment configuration:\n${formattedErrors}`);
  throw new Error(`Invalid environment configuration:\n${formattedErrors}`);
}

export const env: Env = parsed.data;
