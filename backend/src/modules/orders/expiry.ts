import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

/** Also usable by the long-running local server; pg_cron handles production. */
export async function expireUnpaidOrders() {
  return db.execute(sql`select * from public.cancel_expired_unpaid_orders(200)`);
}
