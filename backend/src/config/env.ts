import 'dotenv/config';
import { z } from 'zod';

const isTest = process.env['NODE_ENV'] === 'test';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default(isTest ? 'postgresql://postgres:postgres@localhost:5432/postgres' : ''),
  DATABASE_MIGRATION_URL: z.string().optional(),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(10).default(4),
  JWT_SECRET: z.string().default(isTest ? 'test_jwt_secret_must_be_at_least_32_characters_long' : ''),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('product-images'),
  SUPABASE_PROFILE_STORAGE_BUCKET: z.string().default('profile-images'),
  SESSION_COOKIE_NAME: z.string().default('bagdaily_session'),
  SESSION_COOKIE_DOMAIN: z.string().optional(),
}).refine(data => data.NODE_ENV === 'test' || (data.DATABASE_URL.length > 0 && data.JWT_SECRET.length >= 32), {
  message: 'DATABASE_URL and JWT_SECRET (>= 32 chars) must be provided in non-test environments',
});
export const env = envSchema.parse(process.env);
export const allowedOrigins = env.FRONTEND_URL.split(',').map(s => new URL(s.trim()).origin);
