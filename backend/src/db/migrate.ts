import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

const url = process.env['DATABASE_MIGRATION_URL'] || process.env['DATABASE_URL'];
if (!url) throw new Error('DATABASE_MIGRATION_URL required');
const client = postgres(url, { prepare: false, max: 1, ssl: 'require' });
try { await migrate(drizzle(client), { migrationsFolder: './drizzle' }); }
finally { await client.end(); }
