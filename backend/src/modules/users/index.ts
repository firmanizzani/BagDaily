import { Router } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { ok, paginated } from '../../utils/response.js';
import { idSchema, pageSchema } from '../../utils/validation.js';
import { forbidden, notFound } from '../../utils/errors.js';
import { publicUser } from '../auth/index.js';

const router = Router();

router.get('/', a(async (req, res) => {
  const f = pageSchema.extend({
    search: z.string().max(100).optional(),
    role: z.enum(['pelanggan', 'kasir', 'admin']).optional(),
  }).parse(req.query);

  const cond = [];
  if (f.search) cond.push(sql`(${users.name} ilike ${'%' + f.search + '%'} or ${users.email} ilike ${'%' + f.search + '%'})`);
  if (f.role) cond.push(eq(users.role, f.role));

  const where = cond.length ? and(...cond) : undefined;
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(where);
  const rows = await db.select(publicUser).from(users).where(where).orderBy(desc(users.createdAt)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json(paginated(rows, count.count, f.page, f.limit));
}));

router.post('/cashier', a(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(254).transform((v) => v.toLowerCase()),
    password: z.string().min(8).max(72),
  }).strict().parse(req.body);

  const hash = await bcrypt.hash(input.password, 12);
  const [user] = await db.insert(users).values({
    name: input.name,
    email: input.email,
    passwordHash: hash,
    role: 'kasir',
  }).returning(publicUser);

  res.status(201).json(ok(user));
}));

router.patch('/:id', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const input = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    role: z.enum(['pelanggan', 'kasir', 'admin']).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(72).optional(),
  }).strict().parse(req.body);

  if (id === req.user!.id && (input.role || input.isActive !== undefined)) {
    forbidden('Cannot change own role or active status');
  }

  if (input.role === 'pelanggan' || input.isActive === false) {
    const [admin] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.role, 'admin'), eq(users.isActive, true)));
    if (admin.count <= 1) {
      const [target] = await db.select().from(users).where(eq(users.id, id));
      if (target?.role === 'admin' && target.isActive) {
        forbidden('Cannot remove the last active admin');
      }
    }
  }

  const changes: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name) changes['name'] = input.name;
  if (input.role) changes['role'] = input.role;
  if (input.isActive !== undefined) changes['isActive'] = input.isActive;
  if (input.password) changes['passwordHash'] = await bcrypt.hash(input.password, 12);

  const [user] = await db.update(users).set(changes).where(eq(users.id, id)).returning(publicUser);
  if (!user) notFound('User not found');
  res.json(ok(user));
}));

export default router;
