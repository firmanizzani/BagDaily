import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { orders } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { paginated } from '../../utils/response.js';
import { idSchema, pageSchema, orderInputSchema } from '../../utils/validation.js';
import { checkout, cancel, orderDetail } from './service.js';
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
    search: z.string().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).parse(req.query);

  const cond = [eq(orders.userId, req.user!.id)];
  if (f.status) cond.push(eq(orders.status, f.status as typeof orders.$inferSelect.status));
  if (f.search) cond.push(ilike(orders.orderNumber, `%${f.search}%`));
  if (f.from) cond.push(sql`${orders.createdAt} >= ${f.from}`);
  if (f.to) cond.push(sql`${orders.createdAt} < ${f.to}`);

  const where = and(...cond);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
  const rows = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json(paginated(rows, count.count, f.page, f.limit));
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

export default router;
