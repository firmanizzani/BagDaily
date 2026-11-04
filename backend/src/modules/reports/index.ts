import { Router } from 'express';
import profitRouter from './profit.js';
import { periodComparison } from './comparison.js';
import { and, asc, desc, eq, getTableColumns, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categories, orders, orderItems, products, users } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { ok, paginated } from '../../utils/response.js';
import { z } from 'zod';
import { pageSchema } from '../../utils/validation.js';
import { paidRange, rangeSchema } from '../dashboard/index.js';
import { imageUrlFromPath } from '../products/image-url.js';

const router = Router();
router.use('/profit', profitRouter);

router.get('/trends', a(async (req, res) => {
  const range = rangeSchema.parse(req.query);
  const interval = z.enum(['day', 'week', 'month']).default('day').parse(req.query['interval']);
  // Count each payment once, even when the order contains multiple products.
  const perOrder = db.select({
    date: sql<string>`date_trunc(${interval}, ${orders.paidAt} at time zone 'Asia/Jakarta')::date::text`.as('date'),
    total: orders.total,
    netSales: sql<number>`(${orders.total}::bigint - ${orders.shippingCost})`.as('net_sales'),
    units: sql<number>`(select coalesce(sum(i.quantity),0) from order_items i where i.order_id = "orders"."id")`.as('units'),
  }).from(orders).where(paidRange(range)).as('per_order');
  const sales = await db.select({ date: perOrder.date,
    revenue: sql<number>`sum(${perOrder.total})::bigint`.mapWith(Number),
    netSales: sql<number>`sum(${perOrder.netSales})::bigint`.mapWith(Number),
    units: sql<number>`sum(${perOrder.units})::bigint`.mapWith(Number),
    transactions: sql<number>`count(*)::int`,
  }).from(perOrder).groupBy(perOrder.date).orderBy(perOrder.date);
  const monthly = await db.select({
    month: sql<string>`date_trunc('month', ${orders.paidAt} at time zone 'Asia/Jakarta')::date::text`,
    categoryId: categories.id, name: categories.name,
    quantity: sql<number>`sum(${orderItems.quantity})::bigint`.mapWith(Number),
  }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(paidRange(range)).groupBy(sql`1`, categories.id, categories.name).orderBy(sql`1`, categories.name);
  res.json(ok({ sales, monthly }));
}));

router.get('/sales', a(async (req, res) => {
  const v = rangeSchema.parse(req.query);
  const f = pageSchema.parse(req.query);
  const where = paidRange(v);

  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
  const rows = await db.select({ ...getTableColumns(orders), customerName: users.name }).from(orders).leftJoin(users, eq(orders.userId, users.id)).where(where).orderBy(desc(orders.paidAt)).limit(f.limit).offset((f.page - 1) * f.limit);
  const [summary] = await db.select({
    totalSales: sql<number>`coalesce(sum(${orders.total}),0)::int`,
    netProductSales: sql<number>`coalesce(sum(${orders.total}::bigint - ${orders.shippingCost}),0)::bigint`.mapWith(Number),
    totalTransactions: sql<number>`count(*)::int`,
    merchandiseTotal: sql<number>`coalesce(sum(${orders.subtotal}),0)::bigint`.mapWith(Number),
    shippingTotal: sql<number>`coalesce(sum(${orders.shippingCost}),0)::bigint`.mapWith(Number),
    pointsDiscount: sql<number>`coalesce(sum(${orders.pointsRedeemed}),0)::bigint`.mapWith(Number),
  }).from(orders).where(where);

  const [onlineS] = await db.select({
    total: sql<number>`coalesce(sum(${orders.total}),0)::int`,
  }).from(orders).where(and(where, eq(orders.channel, 'online')));

  const [posS] = await db.select({
    total: sql<number>`coalesce(sum(${orders.total}),0)::int`,
  }).from(orders).where(and(where, eq(orders.channel, 'pos')));

  const prodItems = await db.select({
      productId: orderItems.productId,
      name: sql<string>`min(${orderItems.productNameSnapshot})`,
      quantity: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.subtotal})::int`,
      imagePath: products.imagePath,
      stock: products.stock,
      minimumStock: products.minimumStock,
    }).from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(where)
      .groupBy(orderItems.productId, products.imagePath, products.stock, products.minimumStock)
      .orderBy(desc(sql`sum(${orderItems.quantity})`), asc(sql`min(${orderItems.productNameSnapshot})`));
  const customerRows = await db.select({
    customerId: orders.userId, name: users.name, email: users.email,
    transactions: sql<number>`count(*)::int`, revenue: sql<number>`sum(${orders.total})::int`,
  }).from(orders).innerJoin(users, eq(orders.userId, users.id))
    .where(and(where, isNotNull(orders.userId))).groupBy(orders.userId, users.name, users.email)
    .orderBy(desc(sql`sum(${orders.total})`));

  res.json({
    ...paginated(rows, count.count, f.page, f.limit),
    summary: {
      comparison: await periodComparison(v),
      totalSales: summary.totalSales,
      netProductSales: summary.netProductSales,
      totalTransactions: summary.totalTransactions,
      merchandiseTotal: summary.merchandiseTotal,
      shippingTotal: summary.shippingTotal,
      pointsDiscount: summary.pointsDiscount,
      onlineSales: onlineS.total,
      posSales: posS.total,
      totalProductsSold: prodItems.reduce((total, item) => total + item.quantity, 0),
    },
    products: prodItems.map(({ imagePath, ...item }) => ({ ...item, imageUrl: imageUrlFromPath(imagePath) })),
    customers: customerRows,
  });
}));

router.get('/sales/export', a(async (req, res) => {
  const v = rangeSchema.parse(req.query);
  const where = paidRange(v);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);

  if (count.count > 10000) {
    res.status(422).json({
      data: null,
      error: { code: 'TOO_MANY_ROWS', message: 'Export limited to 10000 orders. Narrow the date range.' },
    });
    return;
  }

  const rows = await db.select().from(orders).where(where).orderBy(asc(orders.paidAt));
  const esc = (val: unknown) => {
    const s = String(val ?? '');
    if (/[",\r\n]/.test(s) || s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@')) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };

  const header = 'order_number,channel,status,subtotal,shipping_cost,points_redeemed,points_earned,total,payment_method,delivery_method,courier,paid_at,created_at';
  const csv = [
    header,
    ...rows.map((o) => [
      o.orderNumber,
      o.channel,
      o.status,
      o.subtotal,
      o.shippingCost,
      o.pointsRedeemed,
      o.pointsEarned,
      o.total,
      o.paymentMethod,
      o.deliveryMethod,
      o.courier,
      o.paidAt?.toISOString(),
      o.createdAt.toISOString(),
    ].map(esc).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sales-${v.from?.toISOString().slice(0, 10) ?? 'all'}-${v.to?.toISOString().slice(0, 10) ?? 'time'}.csv"`);
  res.send(csv);
}));

export default router;
