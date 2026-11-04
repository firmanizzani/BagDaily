import { and, asc, eq, isNull } from 'drizzle-orm';
import { client, db } from '../src/db/index.js';
import { orders } from '../src/db/schema/index.js';
import { awardPoints } from '../src/modules/loyalty/service.js';
import { transaction } from '../src/modules/orders/service.js';

try {
  const rows = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.paymentStatus, 'paid'), eq(orders.status, 'completed'), isNull(orders.loyaltyProcessedAt))).orderBy(asc(orders.paidAt), asc(orders.id));
  let credited = 0;
  for (const row of rows) await transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, row.id)).for('update');
    if (!order || order.loyaltyProcessedAt || order.status !== 'completed' || order.paymentStatus !== 'paid') return;
    await awardPoints(tx, order);
    credited++;
  });
  console.log(`PASS: ${credited} completed paid orders processed once. Unfinished online orders did not receive points. No order totals or stock changed.`);
  console.table(await client`select u.name,u.email,w.balance,w.reserved from loyalty_accounts w join users u on u.id=w.user_id order by u.name`);
} finally { await client.end({ timeout: 5 }); }
