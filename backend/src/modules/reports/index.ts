import { Router } from 'express';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { orders, orderItems } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { paginated } from '../../utils/response.js';
import { pageSchema } from '../../utils/validation.js';
import { paidRange, rangeSchema } from '../dashboard/index.js';

const router = Router();

router.get('/sales', a(async (req, res) => {
  const v = rangeSchema.parse(req.query);
  const f = pageSchema.parse(req.query);
  const where = paidRange(v);

  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
  const rows = await db.select().from(orders).where(where).orderBy(desc(orders.paidAt)).limit(f.limit).offset((f.page - 1) * f.limit);
  const [summary] = await db.select({
    totalSales: sql<number>`coalesce(sum(${orders.total}),0)::int`,
    totalTransactions: sql<number>`count(*)::int`,
  }).from(orders).where(where);

  const [onlineS] = await db.select({
    total: sql<number>`coalesce(sum(${orders.total}),0)::int`,
  }).from(orders).where(and(where, eq(orders.channel, 'online')));

  const [posS] = await db.select({
    total: sql<number>`coalesce(sum(${orders.total}),0)::int`,
  }).from(orders).where(and(where, eq(orders.channel, 'pos')));

  const paidIds = rows.map((o) => o.id);
  const prodItems = paidIds.length
    ? await db.select({
      productId: orderItems.productId,
      name: sql<string>`min(${orderItems.productNameSnapshot})`,
      quantity: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.subtotal})::int`,
    }).from(orderItems)
      .where(inArray(orderItems.orderId, paidIds))
      .groupBy(orderItems.productId)
    : [];

  res.json({
    ...paginated(rows, count.count, f.page, f.limit),
    summary: {
      totalSales: summary.totalSales,
      totalTransactions: summary.totalTransactions,
      onlineSales: onlineS.total,
      posSales: posS.total,
    },
    products: prodItems,
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

  const header = 'order_number,channel,status,subtotal,shipping_cost,total,payment_method,delivery_method,courier,paid_at,created_at';
  const csv = [
    header,
    ...rows.map((o) => [
      o.orderNumber,
      o.channel,
      o.status,
      o.subtotal,
      o.shippingCost,
      o.total,
      o.paymentMethod,
      o.deliveryMethod,
      o.courier,
      o.paidAt?.toISOString(),
      o.createdAt.toISOString(),
    ].map(esc).join(',')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sales-${v.from.toISOString().slice(0, 10)}-${v.to.toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}));

export default router;
