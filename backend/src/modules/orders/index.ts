import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, gte, lt, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { orders, orderItems, products } from '../../db/schema/index.js';
import { imageUrlFromPath } from '../products/image-url.js';
import { asyncRoute as a } from '../../utils/async.js';
import { paginated } from '../../utils/response.js';
import { idSchema, pageSchema, orderInputSchema } from '../../utils/validation.js';
import { checkout, cancel, orderDetail, changeStatus } from './service.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { notFound } from '../../utils/errors.js';

const router = Router();
router.use(a(authenticate));

router.post('/', requireRole('pelanggan'), a(async (req, res) => {
  const input = orderInputSchema.parse(req.body);
  const order = await checkout(req.user!.id, input);
  res.status(201).json({ data: order });
}));

router.get('/my', requireRole('pelanggan'), a(async (req, res) => {
  const f = pageSchema.extend({
    status: z.string().max(40).optional(),
    tab: z.enum(['all', 'awaiting_payment', 'processing', 'shipped', 'completed', 'cancelled']).default('all'),
    search: z.string().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).parse(req.query);

  const cond = [eq(orders.userId, req.user!.id)];
  if (f.status) cond.push(eq(orders.status, f.status as typeof orders.$inferSelect.status));
  if (f.tab === 'processing') cond.push(inArray(orders.status, ['awaiting_confirmation', 'confirmed', 'packed']));
  else if (f.tab !== 'all') cond.push(eq(orders.status, f.tab));
  if (f.search) cond.push(ilike(orders.orderNumber, `%${f.search}%`));
  if (f.from) cond.push(gte(orders.createdAt, f.from));
  if (f.to) cond.push(lt(orders.createdAt, f.to));

  const where = and(...cond);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
  const rows = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt), desc(orders.id)).limit(f.limit).offset((f.page - 1) * f.limit);
  const previews = rows.length ? await db.select({
    orderId: orderItems.orderId, name: orderItems.productNameSnapshot,
    quantity: orderItems.quantity, imagePath: products.imagePath,
  }).from(orderItems).leftJoin(products, eq(orderItems.productId, products.id))
    .where(inArray(orderItems.orderId, rows.map(row => row.id))).orderBy(asc(orderItems.id)) : [];
  const data = rows.map(row => {
    const items = previews.filter(item => item.orderId === row.id);
    return { ...row, productName: items[0]?.name ?? null,
      productImageUrl: imageUrlFromPath(items[0]?.imagePath), productCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0) };
  });
  res.json(paginated(data, count.count, f.page, f.limit));
}));

router.get('/:id', requireRole('pelanggan', 'admin'), a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const detail = await orderDetail(id);
  if (req.user!.role === 'pelanggan' && detail.userId !== req.user!.id) {
    notFound('Order not found');
  }
  res.json({ data: detail });
}));

router.post('/:id/cancel', requireRole('pelanggan'), a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const order = await cancel(id, req.user!.id);
  res.json({ data: order });
}));

router.post('/:id/receive', requireRole('pelanggan'), a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  res.json({ data: await changeStatus(id, req.user!.id, 'completed', true) });
}));

export default router;
