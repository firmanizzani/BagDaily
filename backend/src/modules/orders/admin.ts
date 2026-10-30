import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { orders } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { paginated } from '../../utils/response.js';
import { idSchema, pageSchema } from '../../utils/validation.js';
import { notFound } from '../../utils/errors.js';
import { changeStatus, orderDetail } from './service.js';

// Mounted behind the admin guard in app.ts, including the legacy API alias.
const router = Router();

router.get('/', a(async (req, res) => {
  const f = pageSchema.extend({
    status: z.enum(['awaiting_payment', 'awaiting_confirmation', 'confirmed', 'packed', 'shipped', 'completed', 'cancelled']).optional(),
    search: z.string().max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).parse(req.query);
  const cond = [eq(orders.channel, 'online')];
  if (f.status) cond.push(eq(orders.status, f.status));
  if (f.search) cond.push(ilike(orders.orderNumber, `%${f.search}%`));
  if (f.from) cond.push(sql`${orders.createdAt} >= ${f.from}`);
  if (f.to) cond.push(sql`${orders.createdAt} < ${f.to}`);
  const where = and(...cond);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
  const rows = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json(paginated(rows, count.count, f.page, f.limit));
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
