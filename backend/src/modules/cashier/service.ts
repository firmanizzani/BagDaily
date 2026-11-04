import { sql, eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { orders, orderItems, payments, history, users } from '../../db/schema/index.js';
import { conflict } from '../../utils/errors.js';
import { hashObject } from '../../utils/misc.js';
import type { PosInput } from '../../utils/validation.js';
import { transaction, orderDetail, snapshots } from '../orders/service.js';
import { deduct } from '../payments/service.js';
import { awardPoints, spendPoints } from '../loyalty/service.js';
import { pointQuote } from '../loyalty/rules.js';

export async function pos(actor: string, key: string, input: PosInput) {
  const requestHash = hashObject({
    actor,
    items: [...input.items].sort((a, b) => a.productId.localeCompare(b.productId)),
    cashReceived: input.cashReceived,
    paymentMethod: input.paymentMethod,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    ...(input.pointsToRedeem ? { pointsToRedeem: input.pointsToRedeem } : {}),
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

    if (input.customerId) {
      const [customer] = await tx.select({ id: users.id }).from(users).where(and(
        eq(users.id, input.customerId), eq(users.role, 'pelanggan'), eq(users.isActive, true),
      )).for('share');
      if (!customer) conflict('CUSTOMER_UNAVAILABLE', 'Akun pelanggan tidak aktif atau tidak tersedia. Pilih pelanggan lain atau gunakan Pelanggan umum.');
    }
    const items = await snapshots(tx, input.items);
    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const redeemed = input.pointsToRedeem ?? 0;
    if (redeemed > subtotal) conflict('POINTS_EXCEED_TOTAL', 'Poin yang dipakai melebihi tagihan.');
    const { totalPaid: total } = pointQuote(subtotal, redeemed);
    if (total > 0 && input.paymentMethod === 'points') conflict('INVALID_PAYMENT_METHOD', 'Tagihan masih memerlukan pembayaran.');
    const paymentMethod = total === 0 ? 'points' : input.paymentMethod;
    const isCash = paymentMethod === 'cash';
    const cashReceived = isCash ? (input.cashReceived ?? 0) : null;
    if (isCash && cashReceived! < total) {
      conflict('INSUFFICIENT_CASH', 'Cash received is below total');
    }

    const [inserted] = await tx.insert(orders).values({
      orderNumber: `BD-${randomUUID()}`,
      cashierId: actor,
      userId: input.customerId ?? null,
      channel: 'pos',
      status: 'awaiting_payment',
      subtotal,
      total,
      pointsRedeemed: redeemed,
      deliveryMethod: 'pickup',
      cashReceived,
      changeAmount: isCash ? cashReceived! - total : null,
      idempotencyKey: key,
      requestHash,
    }).returning();

    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: inserted.id })));
    await spendPoints(tx, inserted, false);
    await deduct(tx, inserted.id, actor);
    await tx.insert(payments).values({ orderId: inserted.id, method: paymentMethod, idempotencyKey: key });
    await tx.update(orders).set({
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod,
      paidAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(orders.id, inserted.id));
    await awardPoints(tx, inserted);

    await tx.insert(history).values({ orderId: inserted.id, newStatus: 'completed', changedBy: actor });
    return inserted.id;
  });

  return orderDetail(id);
}
