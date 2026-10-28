import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute as a } from '../../utils/async.js';
import { idSchema } from '../../utils/validation.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { pay } from './service.js';

const router = Router();
router.use(a(authenticate));

router.post('/orders/:id/simulate-payment', requireRole('pelanggan'), a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const key = z.string().uuid().parse(req.headers['idempotency-key']);
  const { method } = z.object({ method: z.enum(['bank_transfer', 'qris']) }).parse(req.body);
  const order = await pay(id, req.user!.id, key, method);
  res.json({ data: order });
}));

router.post('/:id/simulate-payment', requireRole('pelanggan'), a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const key = z.string().uuid().parse(req.headers['idempotency-key']);
  const { method } = z.object({ method: z.enum(['bank_transfer', 'qris']) }).parse(req.body);
  const order = await pay(id, req.user!.id, key, method);
  res.json({ data: order });
}));

export default router;
