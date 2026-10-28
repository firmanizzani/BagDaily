import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute as a } from '../../utils/async.js';
import { getProduct, getProducts } from './service.js';

const router = Router();

router.get('/', a(async (req, res) => {
  res.json(await getProducts(req));
}));

router.get('/:id', a(async (req, res) => {
  const id = z.string().max(180).parse(req.params['id']);
  res.json({ data: await getProduct(id) });
}));

export default router;
