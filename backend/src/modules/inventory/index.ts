import { Router } from 'express';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { products, stockMovements } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { ok, paginated } from '../../utils/response.js';
import { adjustmentSchema, pageSchema } from '../../utils/validation.js';
import { getProducts } from '../products/service.js';
import { adjust } from './service.js';

const router = Router();

router.get('/', a(async (req, res) => {
  res.json(await getProducts(req, true));
}));

router.post('/adjustments', a(async (req, res) => {
  const key = z.string().uuid().parse(req.headers['idempotency-key']);
  const input = adjustmentSchema.parse(req.body);
  const movement = await adjust(req.user!.id, key, input);
  res.status(201).json(ok(movement));
}));

router.get('/movements', a(async (req, res) => {
  const f = pageSchema.extend({
    productId: z.string().uuid().optional(),
    type: z.string().max(20).optional(),
  }).parse(req.query);

  const cond = [];
  if (f.productId) cond.push(eq(stockMovements.productId, f.productId));
  if (f.type) cond.push(eq(stockMovements.type, f.type));
  const where = cond.length ? and(...cond) : undefined;

  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(stockMovements).where(where);
  const rows = await db.select().from(stockMovements).where(where).orderBy(desc(stockMovements.createdAt)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json(paginated(rows, count.count, f.page, f.limit));
}));

router.get('/low-stock', a(async (req, res) => {
  const f = pageSchema.parse(req.query);
  const where = and(
    eq(products.isActive, true),
    sql`${products.stock} <= ${products.minimumStock}`,
  );
  const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(where);
  const rows = await db.select().from(products).where(where).orderBy(asc(products.stock)).limit(f.limit).offset((f.page - 1) * f.limit);
  res.json(paginated(rows, count.count, f.page, f.limit));
}));

export default router;
