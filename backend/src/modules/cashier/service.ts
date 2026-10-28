import { sql, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { orders, orderItems, payments, history } from '../../db/schema/index.js';
import { conflict } from '../../utils/errors.js';
import { hashObject } from '../../utils/misc.js';
import type { PosInput } from '../../utils/validation.js';
import { transaction, orderDetail, snapshots } from '../orders/service.js';
import { deduct } from '../payments/service.js';

export async function pos(actor: string, key: string, input: PosInput) {
  const requestHash = hashObject({
    actor,
    items: [...input.items].sort((a, b) => a.productId.localeCompare(b.productId)),
    cashReceived: input.cashReceived,
  });

  const id = await transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
    const [existing] = await tx.select().from(orders).where(eq(orders.idempotencyKey, key));

    if (existing) {
      if (existing.requestHash !== requestHash || existing.cashierId !== actor) {
        conflict('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different request');
      }
      return existing.id;
    }

    const items = await snapshots(tx, input.items);
    const total = items.reduce((sum, i) => sum + i.subtotal, 0);
    if (input.cashReceived < total) {
      conflict('INSUFFICIENT_CASH', 'Cash received is below total');
    }

    const [inserted] = await tx.insert(orders).values({
      orderNumber: `BD-${randomUUID()}`,
      cashierId: actor,
      channel: 'pos',
      status: 'awaiting_payment',
      subtotal: total,
      total,
      deliveryMethod: 'pickup',
      cashReceived: input.cashReceived,
      changeAmount: input.cashReceived - total,
      idempotencyKey: key,
      requestHash,
    }).returning();

    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: inserted.id })));
    await deduct(tx, inserted.id, actor);
    await tx.insert(payments).values({ orderId: inserted.id, method: 'cash', idempotencyKey: key });
    await tx.update(orders).set({
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paidAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(orders.id, inserted.id));

    await tx.insert(history).values({ orderId: inserted.id, newStatus: 'completed', changedBy: actor });
    return inserted.id;
  });

  return orderDetail(id);
}
