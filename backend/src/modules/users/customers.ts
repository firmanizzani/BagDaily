import { Router } from 'express';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { users, orders } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { idSchema, pageSchema } from '../../utils/validation.js';
import { notFound } from '../../utils/errors.js';
import { paginated } from '../../utils/response.js';

const router = Router();
const totals = sql`(
  select user_id, count(*)::int as total_orders,
    coalesce(sum(total) filter (where payment_status = 'paid'), 0)::bigint as total_spend
  from orders where user_id is not null group by user_id
) as customer_totals`;
const customerFields = {
  id: users.id, name: users.name, email: users.email, phone: users.phone,
  isActive: users.isActive, createdAt: users.createdAt,
  totalOrders: sql<number>`coalesce(customer_totals.total_orders, 0)::int`,
  totalSpend: sql<number>`coalesce(customer_totals.total_spend, 0)::bigint`.mapWith(Number),
};
const escapedSearch = (value: string) => `%${value.trim().replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;

router.get('/', a(async (req, res) => {
  const f = pageSchema.extend({
    search: z.string().max(100).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    sort: z.enum(['name', 'orders_desc', 'spend_desc', 'newest']).default('name'),
  }).parse(req.query);
  const conditions = [eq(users.role, 'pelanggan')];
  if (f.isActive) conditions.push(eq(users.isActive, f.isActive === 'true'));
  if (f.search?.trim()) {
    const search = escapedSearch(f.search);
    conditions.push(or(ilike(users.name, search), ilike(users.email, search), ilike(users.phone, search))!);
  }
  const where = and(...conditions);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(where);
  const sort = {
    name: asc(users.name), newest: desc(users.createdAt),
    orders_desc: desc(customerFields.totalOrders), spend_desc: desc(customerFields.totalSpend),
  }[f.sort];
  const rows = await db.select(customerFields).from(users)
    .leftJoin(totals, sql`customer_totals.user_id = ${users.id}`)
    .where(where).orderBy(sort, asc(users.id)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json(paginated(rows, count.count, f.page, f.limit));
}));

router.get('/:id/orders', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const f = pageSchema.extend({
    search: z.string().max(100).optional(),
    channel: z.enum(['online', 'pos']).optional(),
    paymentStatus: z.enum(['paid', 'unpaid']).optional(),
  }).parse(req.query);
  const [customer] = await db.select(customerFields).from(users)
    .leftJoin(totals, sql`customer_totals.user_id = ${users.id}`)
    .where(and(eq(users.id, id), eq(users.role, 'pelanggan')));
  if (!customer) notFound('Pelanggan tidak ditemukan.');
  const conditions = [eq(orders.userId, id)];
  if (f.search?.trim()) conditions.push(ilike(orders.orderNumber, escapedSearch(f.search)));
  if (f.channel) conditions.push(eq(orders.channel, f.channel));
  if (f.paymentStatus) conditions.push(eq(orders.paymentStatus, f.paymentStatus));
  const where = and(...conditions);
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(where);
  const rows = await db.select().from(orders).where(where)
    .orderBy(desc(orders.createdAt), desc(orders.id)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json({ ...paginated(rows, count.count, f.page, f.limit), customer });
}));

export default router;
