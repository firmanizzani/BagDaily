import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { orders } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { paginated } from '../../utils/response.js';
import { idSchema, pageSchema, posInputSchema } from '../../utils/validation.js';
import { orderDetail } from '../orders/service.js';
import { pos } from './service.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { notFound } from '../../utils/errors.js';

const router = Router();
router.use(a(authenticate), requireRole('kasir', 'admin'));

router.post('/transactions', a(async (req, res) => {
  const key = z.string().uuid().parse(req.headers['idempotency-key']);
  const input = posInputSchema.parse(req.body);
  const order = await pos(req.user!.id, key, input);
  res.status(201).json({ data: order });
}));

router.get('/transactions', a(async (req, res) => {
  const f = pageSchema.extend({
    search: z.string().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).parse(req.query);
  const cond = [eq(orders.channel, 'pos')];
  if (f.search) cond.push(ilike(orders.orderNumber, `%${f.search}%`));
  if (f.from) cond.push(sql`${orders.createdAt} >= ${f.from}`);
  if (f.to) cond.push(sql`${orders.createdAt} < ${f.to}`);
  const where = and(...cond);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
  const rows = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json(paginated(rows, count.count, f.page, f.limit));
}));

router.get('/transactions/:id', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const detail = await orderDetail(id);
  if (detail.channel !== 'pos') notFound('POS transaction not found');
  res.json({ data: detail });
}));

export default router;
