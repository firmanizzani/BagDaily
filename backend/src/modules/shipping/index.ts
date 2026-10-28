import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { shippingRates } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { ok } from '../../utils/response.js';
import { idSchema } from '../../utils/validation.js';
import { conflict, notFound } from '../../utils/errors.js';

export const publicShippingRouter = Router();

publicShippingRouter.get('/rates', a(async (_req, res) => {
  const rows = await db.select().from(shippingRates).orderBy(asc(shippingRates.courier), asc(shippingRates.zone));
  res.json({ data: rows });
}));

export const adminShippingRouter = Router();

adminShippingRouter.get('/rates', a(async (_req, res) => {
  const rows = await db.select().from(shippingRates).orderBy(asc(shippingRates.courier), asc(shippingRates.zone));
  res.json({ data: rows });
}));

adminShippingRouter.post('/rates', a(async (req, res) => {
  const input = z.object({
    courier: z.enum(['JNE', 'J&T', 'SiCepat']),
    zone: z.enum(['Jabodetabek', 'Jawa', 'Luar Jawa']),
    rate: z.number().int().min(0).max(2147483647),
  }).strict().parse(req.body);

  const [rate] = await db.insert(shippingRates).values(input).onConflictDoNothing().returning();
  if (!rate) {
    conflict('DUPLICATE_RATE', 'Rate for this courier and zone already exists');
  }
  res.status(201).json(ok(rate));
}));

adminShippingRouter.patch('/rates/:id', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const input = z.object({
    rate: z.number().int().min(0).max(2147483647),
  }).strict().parse(req.body);

  const [rate] = await db.update(shippingRates).set({
    rate: input.rate,
    updatedAt: new Date(),
  }).where(eq(shippingRates.id, id)).returning();

  if (!rate) notFound('Rate not found');
  res.json(ok(rate));
}));

export default publicShippingRouter;
