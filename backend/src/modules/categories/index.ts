import { Router } from 'express';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { categories, products } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { ok } from '../../utils/response.js';
import { idSchema } from '../../utils/validation.js';
import { conflict, notFound } from '../../utils/errors.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', a(async (_req, res) => {
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  res.json({ data: rows });
}));

export const adminCategoriesRouter = Router();

adminCategoriesRouter.post('/', a(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  }).strict().parse(req.body);

  const [cat] = await db.insert(categories).values(input).returning();
  res.status(201).json(ok(cat));
}));

adminCategoriesRouter.patch('/:id', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const input = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  }).strict().parse(req.body);

  const [cat] = await db.update(categories).set({ ...input, updatedAt: new Date() }).where(eq(categories.id, id)).returning();
  if (!cat) notFound('Category not found');
  res.json(ok(cat));
}));

adminCategoriesRouter.delete('/:id', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const [linked] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.categoryId, id));
  if (linked.count > 0) {
    conflict('CATEGORY_IN_USE', 'Cannot delete category with linked products');
  }

  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning();
  if (!deleted.length) notFound('Category not found');
  res.json(ok({ success: true }));
}));

export default categoriesRouter;
