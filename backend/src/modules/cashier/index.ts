import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, getTableColumns, gte, lt, ilike, isNull, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { orders, users } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { paginated } from '../../utils/response.js';
import { idSchema, pageSchema, posInputSchema } from '../../utils/validation.js';
import { orderDetail } from '../orders/service.js';
import { pos } from './service.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { notFound } from '../../utils/errors.js';

const router = Router();
router.use(a(authenticate), requireRole('kasir', 'admin'));

router.get('/customers', a(async (req, res) => {
  const { search } = z.object({ search: z.string().trim().min(2).max(100) }).parse(req.query);
  const pattern = `%${search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
  const rows = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone }).from(users)
    .where(and(eq(users.role, 'pelanggan'), eq(users.isActive, true), or(ilike(users.name, pattern), ilike(users.email, pattern), ilike(users.phone, pattern))))
    .orderBy(asc(users.name), asc(users.id)).limit(10);
  res.json({ data: rows });
}));

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
    customer: z.enum(['general', 'registered']).optional(),
  }).parse(req.query);
  const cond = [eq(orders.channel, 'pos')];
  if (f.search) cond.push(ilike(orders.orderNumber, `%${f.search}%`));
  if (f.from) cond.push(gte(orders.createdAt, f.from));
  if (f.to) cond.push(lt(orders.createdAt, f.to));
  if (f.customer === 'general') cond.push(isNull(orders.userId));
  if (f.customer === 'registered') cond.push(isNotNull(orders.userId));
  const where = and(...cond);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
  const rows = await db.select({ ...getTableColumns(orders), customerName: users.name }).from(orders).leftJoin(users, eq(orders.userId, users.id)).where(where).orderBy(desc(orders.createdAt)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json(paginated(rows, count.count, f.page, f.limit));
}));

router.get('/transactions/:id', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const detail = await orderDetail(id);
  if (detail.channel !== 'pos') notFound('POS transaction not found');
  res.json({ data: detail });
}));

export default router;
