import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, type Tx } from '../../db/index.js';
import { orders, orderItems, products, shippingRates, history, users } from '../../db/schema/index.js';
import { env } from '../../config/env.js';
import { conflict, notFound, forbidden } from '../../utils/errors.js';
import { sleepMs, delay } from '../../utils/misc.js';
import type { OrderInput } from '../../utils/validation.js';

export function databaseCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return;
  const e = error as { code?: string; cause?: unknown };
  return e.code ?? databaseCode(e.cause);
}

export async function transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(work);
    } catch (error) {
      if (!['40P01', '40001'].includes(databaseCode(error) ?? '') || attempt >= 3) {
        throw error;
      }
      await sleepMs(delay(attempt));
    }
  }
}

export async function orderDetail(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) notFound('Order not found');

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.productId));
  const events = await db.select().from(history).where(eq(history.orderId, id)).orderBy(asc(history.createdAt));
  const [cashier] = order.cashierId ? await db.select({ name: users.name }).from(users).where(eq(users.id, order.cashierId)) : [];

  return {
    ...order,
    items,
    history: events,
    cashierName: cashier?.name ?? null,
  };
}

export async function snapshots(tx: Tx, items: { productId: string; quantity: number }[]) {
  const result = [];
  for (const item of [...items].sort((a, b) => a.productId.localeCompare(b.productId))) {
    const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
    if (!product || !product.isActive) {
      conflict('PRODUCT_UNAVAILABLE', 'Product unavailable');
    }
    result.push({
      productId: product.id,
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: item.quantity * product.price,
    });
  }
  return result;
}

export function validTransition(current: string, next: string, delivery: string): boolean {
  if (!['shipping', 'pickup'].includes(delivery)) return false;
  const transitions: Record<string, string[]> = {
    awaiting_confirmation: ['packed'],
    // Existing confirmed orders can continue without changing their history.
    confirmed: ['packed'],
    packed: delivery === 'pickup' ? ['completed'] : ['shipped'],
    shipped: delivery === 'shipping' ? ['completed'] : [],
  };
  return transitions[current]?.includes(next) ?? false;
}

export async function checkout(userId: string, input: OrderInput) {
  const id = await transaction(async (tx) => {
    const items = await snapshots(tx, input.items);
    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

    let rate: typeof shippingRates.$inferSelect | undefined;
    if (input.deliveryMethod === 'shipping') {
      [rate] = await tx.select().from(shippingRates).where(eq(shippingRates.id, input.shippingRateId!));
      if (!rate) notFound('Shipping rate not found');
    }

    const [order] = await tx.insert(orders).values({
      orderNumber: `BD-${randomUUID()}`,
      userId,
      channel: 'online',
      subtotal,
      shippingCost: rate?.rate ?? 0,
      total: subtotal + (rate?.rate ?? 0),
      deliveryMethod: input.deliveryMethod,
      courier: rate?.courier,
      shippingZone: rate?.zone,
      shippingAddress: rate ? input.shippingAddress : null,
      recipientName: rate ? input.recipientName : null,
      recipientPhone: rate ? input.recipientPhone : null,
      paymentDeadline: new Date(Date.now() + env.PAYMENT_TIMEOUT_MINUTES * 60000),
    }).returning();

    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: order.id })));
    await tx.insert(history).values({ orderId: order.id, newStatus: 'awaiting_payment', changedBy: userId });
    return order.id;
  });

  return orderDetail(id);
}

export async function changeStatus(id: string, actor: string, status: typeof orders.$inferSelect.status) {
  await transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for('update');
    if (!order || order.channel !== 'online') notFound('Online order not found');
    if (order.status === status) return;

    if (order.paymentStatus !== 'paid' || !validTransition(order.status, status, order.deliveryMethod)) {
      conflict('INVALID_STATUS', 'Invalid order status transition');
    }

    await tx.update(orders).set({
      status,
      updatedAt: new Date(),
      ...(status === 'shipped'
        ? { trackingNumber: `BD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID()}` }
        : {}),
    }).where(eq(orders.id, id));

    await tx.insert(history).values({
      orderId: id,
      previousStatus: order.status,
      newStatus: status,
      changedBy: actor,
    });
  });

  return orderDetail(id);
}

export async function cancel(id: string, actor: string) {
  await transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for('update');
    if (!order) notFound('Order not found');
    if (order.userId !== actor) forbidden();

    if (order.status === 'cancelled' && order.paymentStatus === 'unpaid') return;
    if (order.status !== 'awaiting_payment' || order.paymentStatus !== 'unpaid') {
      conflict('INVALID_STATUS', 'Only unpaid orders may be cancelled');
    }

    await tx.update(orders).set({
      status: 'cancelled',
      updatedAt: new Date(),
    }).where(eq(orders.id, id));

    await tx.insert(history).values({
      orderId: id,
      previousStatus: order.status,
      newStatus: 'cancelled',
      changedBy: actor,
    });
  });

  return orderDetail(id);
}
