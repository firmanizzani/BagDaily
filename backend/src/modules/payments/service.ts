import { and, eq, sql, asc } from 'drizzle-orm';
import type { Tx } from '../../db/index.js';
import { orders, orderItems, products, payments, stockMovements, history } from '../../db/schema/index.js';
import { conflict, notFound, forbidden } from '../../utils/errors.js';
import { transaction, orderDetail } from '../orders/service.js';

export async function deduct(tx: Tx, id: string, actor: string) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.productId));
  for (const item of items) {
    const [updated] = await tx.update(products).set({
      stock: sql`${products.stock} - ${item.quantity}`,
      updatedAt: new Date(),
    }).where(and(
      eq(products.id, item.productId),
      eq(products.isActive, true),
      sql`${products.stock} >= ${item.quantity}`,
    )).returning({ stock: products.stock });

    if (!updated) {
      conflict('INSUFFICIENT_STOCK', `Insufficient stock for ${item.productNameSnapshot}`);
    }

    await tx.insert(stockMovements).values({
      productId: item.productId,
      type: 'sale',
      quantity: -item.quantity,
      stockBefore: updated.stock + item.quantity,
      stockAfter: updated.stock,
      notes: 'Paid sale',
      referenceOrderId: id,
      createdBy: actor,
    });
  }
}

export async function pay(id: string, userId: string, key: string, method: 'bank_transfer' | 'qris') {
  await transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for('update');
    if (!order) notFound('Order not found');
    if (order.userId !== userId) forbidden();

    const [previous] = await tx.select().from(payments).where(eq(payments.orderId, id));
    if (previous) {
      if (previous.idempotencyKey === key && previous.method === method) return;
      conflict('IDEMPOTENCY_CONFLICT', 'Order already paid with another request');
    }

    if (order.status !== 'awaiting_payment' || order.paymentStatus !== 'unpaid') {
      conflict('INVALID_STATUS', 'Order cannot be paid');
    }

    const nowResult = await tx.execute<{ now: Date }>(sql`select clock_timestamp() as now`);
    const now: Date = nowResult[0]['now'] as Date;
    if (!order.paymentDeadline || new Date(now).getTime() >= order.paymentDeadline.getTime()) {
      conflict('ORDER_EXPIRED', 'Payment deadline has passed');
    }

    await deduct(tx, id, userId);
    await tx.insert(payments).values({ orderId: id, method, idempotencyKey: key });
    await tx.update(orders).set({
      status: 'awaiting_confirmation',
      paymentStatus: 'paid',
      paymentMethod: method,
      paidAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(orders.id, id));

    await tx.insert(history).values({
      orderId: id,
      previousStatus: 'awaiting_payment',
      newStatus: 'awaiting_confirmation',
      changedBy: userId,
    });
  });

  return orderDetail(id);
}
