import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export const client = postgres(env.DATABASE_URL, {
  prepare: false,
  max: env.DATABASE_POOL_SIZE,
  // All schema columns are scalar. Avoid the driver's extra pg_catalog array-type
  // query on every fresh connection; its uncaught timeout can terminate Node.
  fetch_types: false,
  ssl: 'require',
  idle_timeout: 60,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
