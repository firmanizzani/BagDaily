import 'dotenv/config';
import postgres from 'postgres';
import { readFile } from 'node:fs/promises';

const verifyOnly = process.argv.includes('--check');
const url = process.env['DATABASE_MIGRATION_URL'] || process.env['DATABASE_URL'];
if (!url) throw new Error('DATABASE_MIGRATION_URL or DATABASE_URL is required');
const client = postgres(url, { prepare: false, max: 1, ssl: 'require', fetch_types: false, connect_timeout: 10 });
try {
  if (!verifyOnly) {
    const definition = await readFile(new URL('../../database/cron/cancel_expired_orders.sql', import.meta.url), 'utf8');
    await client.unsafe(definition);
    await client`create extension if not exists pg_cron`;
    await client`select cron.schedule('cancel-expired-orders-every-minute', '* * * * *', 'select * from public.cancel_expired_unpaid_orders(200);')`;
  }
  const [installed] = await client`select exists(select 1 from pg_extension where extname='pg_cron') as cron, to_regprocedure('public.cancel_expired_unpaid_orders(integer)') is not null as expiry_function`;
  console.log('Database expiry prerequisites:', installed);
  if (!installed.cron || !installed.expiry_function) throw new Error('Expiry function or pg_cron missing. Run npm run db:cron with a database owner connection.');
  const jobs = await client`select jobname, schedule, active, command from cron.job where jobname='cancel-expired-orders-every-minute'`;
  console.log('Expiry schedule:', jobs);
  if (jobs.length !== 1 || !jobs[0].active || jobs[0].schedule !== '* * * * *' || jobs[0].command !== 'select * from public.cancel_expired_unpaid_orders(200);') throw new Error('Expected active once-per-minute expiry job was not found.');
  const runs = await client`select status, start_time, end_time from cron.job_run_details where jobid=(select jobid from cron.job where jobname='cancel-expired-orders-every-minute') order by start_time desc limit 3`;
  console.log('Recent scheduler runs:', runs);
  console.log('PASS: active database scheduler; independent of browser and API uptime.');
} finally {
  await client.end({ timeout: 5 });
}
