import app from './app.js';
import { env } from './config/env.js';
import { expireUnpaidOrders } from './modules/orders/expiry.js';

let expiring = false;
async function runExpiry() {
  if (expiring) return;
  expiring = true;
  try { await expireUnpaidOrders(); }
  catch { console.error('Order expiry failed. Check database migration 0004 and npm run db:cron:check.'); }
  finally { expiring = false; }
}
void runExpiry();
const expiryTimer = setInterval(() => void runExpiry(), 60_000);
expiryTimer.unref();

const server = app.listen(env.PORT, () => {
  console.log(`\n  BagDaily API ready\n`);
  console.log(`  ➜  Local:   http://localhost:${env.PORT}/`);
  console.log(`  ➜  Health:  http://localhost:${env.PORT}/api/health\n`);
});
const shutdown = () => { clearInterval(expiryTimer); server.close(); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
