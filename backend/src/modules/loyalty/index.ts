import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { asyncRoute as a } from '../../utils/async.js';
import { pageSchema } from '../../utils/validation.js';
import { paginated } from '../../utils/response.js';
import { walletHistory, walletSummary } from './service.js';

const router = Router();
router.use(a(authenticate), requireRole('pelanggan'));
router.get('/me', a(async (req, res) => { res.json({ data: await walletSummary(req.user!.id) }); }));
router.get('/me/history', a(async (req, res) => {
  const { page, limit } = pageSchema.parse(req.query);
  const { rows, count } = await walletHistory(req.user!.id, page, limit);
  res.json(paginated(rows, count, page, limit));
}));
export default router;
