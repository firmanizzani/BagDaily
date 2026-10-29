import { Router } from 'express';
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { categories, orders, orderItems, products, users } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { ok } from '../../utils/response.js';

export const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  channel: z.enum(['online', 'pos']).optional(),
}).transform((v) => {
  const to = v.to ?? new Date();
  const from = v.from ?? new Date(to.getTime() - 30 * 86400000);
  return { from, to, channel: v.channel };
});

export function paidRange(v: { from: Date; to: Date; channel?: string }) {
  const cond = [
    eq(orders.paymentStatus, sql.raw(`'paid'`)),
    gte(orders.paidAt, v.from),
    lt(orders.paidAt, v.to),
  ];
  if (v.channel) cond.push(eq(orders.channel, v.channel));
  return and(...cond)!;
}

const router = Router();

router.get('/overview', a(async (req, res) => {
  const v = rangeSchema.parse(req.query);
  const where = paidRange(v);

  const [total] = await db.select({
    totalSales: sql<number>`coalesce(sum(${orders.total}),0)::int`,
    totalTransactions: sql<number>`count(*)::int`,
  }).from(orders).where(where);

  const [online] = await db.select({
    total: sql<number>`coalesce(sum(${orders.total}),0)::int`,
  }).from(orders).where(and(where, eq(orders.channel, 'online')));

  const [posT] = await db.select({
    total: sql<number>`coalesce(sum(${orders.total}),0)::int`,
  }).from(orders).where(and(where, eq(orders.channel, 'pos')));

  const [active] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(products).where(eq(products.isActive, true));

  const [low] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(products).where(and(
    eq(products.isActive, true),
    sql`${products.stock} <= ${products.minimumStock}`,
  ));

  const [sold] = await db.select({
    quantity: sql<number>`coalesce(sum(${orderItems.quantity}),0)::int`,
  }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(where);

  const [customers] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(users).where(and(
    eq(users.role, 'pelanggan'),
    gte(users.createdAt, v.from),
    lt(users.createdAt, v.to),
  ));

  res.json(ok({
    totalSales: total.totalSales,
    totalTransactions: total.totalTransactions,
    activeProducts: active.count,
    lowStockProducts: low.count,
    totalProductsSold: sold.quantity,
    newCustomers: customers.count,
    onlineSales: online.total,
    posSales: posT.total,
  }));
}));

router.get('/sales-trend', a(async (req, res) => {
  const v = rangeSchema.parse(req.query);
  const interval = z.enum(['day', 'week']).default('day').parse(req.query['interval']);
  const trunc = interval === 'week' ? 'week' : 'day';

  const rows = await db.select({
    date: sql<string>`date_trunc(${trunc}, ${orders.paidAt} at time zone 'Asia/Jakarta')::date::text`,
    revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`,
    transactions: sql<number>`count(*)::int`,
  }).from(orders).where(paidRange(v)).groupBy(sql`1`).orderBy(sql`1`);

  res.json(ok(rows));
}));

router.get('/categories', a(async (req, res) => {
  const v = rangeSchema.parse(req.query);
  const rows = await db.select({
    categoryId: products.categoryId,
    name: categories.name,
    quantity: sql<number>`coalesce(sum(${orderItems.quantity}),0)::int`,
    revenue: sql<number>`coalesce(sum(${orderItems.subtotal}),0)::int`,
  }).from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(paidRange(v))
    .groupBy(products.categoryId, categories.name);

  res.json(ok(rows));
}));

router.get('/top-products', a(async (req, res) => {
  const v = rangeSchema.parse(req.query);
  const rows = await db.select({
    productId: orderItems.productId,
    name: sql<string>`min(${orderItems.productNameSnapshot})`,
    quantity: sql<number>`sum(${orderItems.quantity})::int`,
    revenue: sql<number>`sum(${orderItems.subtotal})::int`,
  }).from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(paidRange(v))
    .groupBy(orderItems.productId)
    .orderBy(sql`3 desc`)
    .limit(5);

  res.json(ok(rows));
}));

router.get('/channels', a(async (req, res) => {
  const v = rangeSchema.parse(req.query);
  const rows = await db.select({
    channel: orders.channel,
    revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`,
    transactions: sql<number>`count(*)::int`,
  }).from(orders).where(paidRange(v)).groupBy(orders.channel);

  res.json(ok(rows));
}));

router.get('/restock-recommendations', a(async (_req, res) => {
  const since = new Date(Date.now() - 7 * 86400000);
  const raw = await db.select({
    productId: orderItems.productId,
    sold: sql<number>`coalesce(sum(${orderItems.quantity}),0)::int`,
  }).from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(
      eq(orders.paymentStatus, sql.raw(`'paid'`)),
      gte(orders.paidAt, since),
    ))
    .groupBy(orderItems.productId);

  const soldMap = new Map(raw.map((r) => [r.productId, r.sold]));
  const prods = await db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name));

  res.json(ok(prods.map((p) => {
    const sold = soldMap.get(p.id) ?? 0;
    const avg = sold / 7;
    const demand = Math.ceil(avg * 7);
    return {
      productId: p.id,
      name: p.name,
      stock: p.stock,
      minimumStock: p.minimumStock,
      soldLast7Days: sold,
      averageDailySales: Math.round(avg * 100) / 100,
      next7DaysDemand: demand,
      recommendedQuantity: Math.max(0, demand - p.stock),
    };
  })));
}));

export default router;
