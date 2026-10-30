import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, getTableColumns, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { orders, users, orderItems, products } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { paginated } from '../../utils/response.js';
import { idSchema, pageSchema } from '../../utils/validation.js';
import { notFound } from '../../utils/errors.js';
import { changeStatus, orderDetail } from './service.js';
import { imageUrlFromPath } from '../products/image-url.js';

// Mounted behind the admin guard in app.ts, including the legacy API alias.
const router = Router();

router.get('/', a(async (req, res) => {
  const f = pageSchema.extend({
    status: z.enum(['awaiting_payment', 'awaiting_confirmation', 'confirmed', 'packed', 'shipped', 'completed', 'cancelled']).optional(),
    tab: z.enum(['all', 'processing', 'shipped', 'completed', 'cancelled', 'awaiting_payment']).default('all'),
    search: z.string().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).parse(req.query);
  const cond = [eq(orders.channel, 'online')];
  if (f.search?.trim()) {
    const pattern = `%${f.search.trim().replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
    cond.push(or(ilike(orders.orderNumber, pattern), ilike(users.name, pattern), ilike(users.email, pattern), ilike(orders.recipientName, pattern))!);
  }
  if (f.from) cond.push(sql`${orders.createdAt} >= ${f.from}`);
  if (f.to) cond.push(sql`${orders.createdAt} < ${f.to}`);
  const counts = await db.select({ status: orders.status, count: sql<number>`count(*)::int` }).from(orders)
    .leftJoin(users, eq(orders.userId, users.id)).where(and(...cond)).groupBy(orders.status);
  const statusCounts = Object.fromEntries(['awaiting_payment','awaiting_confirmation','confirmed','packed','shipped','completed','cancelled'].map(status => [status, 0]));
  for (const row of counts) statusCounts[row.status] = row.count;
  if (f.status) cond.push(eq(orders.status, f.status));
  if (f.tab === 'processing') cond.push(inArray(orders.status, ['awaiting_confirmation', 'confirmed', 'packed']));
  else if (f.tab !== 'all') cond.push(eq(orders.status, f.tab));
  const where = and(...cond);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).leftJoin(users, eq(orders.userId, users.id)).where(where);
  const rows = await db.select({ ...getTableColumns(orders), customerName: users.name, customerEmail: users.email }).from(orders)
    .leftJoin(users, eq(orders.userId, users.id)).where(where).orderBy(desc(orders.createdAt), desc(orders.id)).limit(f.limit).offset((f.page - 1) * f.limit);
  const previews = rows.length ? await db.select({ orderId: orderItems.orderId, name: orderItems.productNameSnapshot, imagePath: products.imagePath })
    .from(orderItems).leftJoin(products, eq(orderItems.productId, products.id))
    .where(inArray(orderItems.orderId, rows.map(row => row.id))).orderBy(asc(orderItems.productId)) : [];
  const data = rows.map(row => {
    const items = previews.filter(item => item.orderId === row.id);
    return { ...row, productCount: items.length, productName: items[0]?.name ?? null, productImageUrl: imageUrlFromPath(items[0]?.imagePath) };
  });
  res.json({ ...paginated(data, count.count, f.page, f.limit), statusCounts });
}));

router.get('/:id', a(async (req, res) => {
  const detail = await orderDetail(idSchema.parse(req.params['id']));
  if (detail.channel !== 'online') notFound('Online order not found');
  res.json({ data: detail });
}));

router.patch('/:id/status', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const { status } = z.object({
    status: z.enum(['packed', 'shipped', 'completed']),
  }).strict().parse(req.body);
  res.json({ data: await changeStatus(id, req.user!.id, status) });
}));

export default router;
