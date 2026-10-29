import { Router, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { products, users } from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncRoute as a } from '../../utils/async.js';
import { notFound } from '../../utils/errors.js';
import { idSchema } from '../../utils/validation.js';
import { readProductImage } from './media.js';

const router = Router();

async function sendImage(res: Response, path: string, privateImage: boolean) {
  const image = await readProductImage(path);
  const extension = path.split('.').at(-1)?.toLowerCase();
  const mime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  res.setHeader('Cache-Control', privateImage ? 'private, max-age=300' : 'public, max-age=86400, immutable');
  if (privateImage) res.vary('Cookie');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(mime).send(image);
}

// Profile photos can only be read by the signed-in owner.
router.get('/avatars/:userId/:filename', a(authenticate), a(async (req, res) => {
  if (req.params['userId'] !== req.user!.id) notFound('Foto tidak ditemukan.');
  const [user] = await db.select({ path: users.avatarPath }).from(users).where(eq(users.id, req.user!.id));
  const expected = `avatars/${req.user!.id}/${req.params['filename']}`;
  if (!user?.path || user.path.replace(/^local\//, '') !== expected) notFound('Foto tidak ditemukan.');
  await sendImage(res, user.path, true);
}));

// Catalog images remain visible to shoppers; storage credentials stay on the server.
router.get('/:productId/:filename', a(async (req, res) => {
  const id = idSchema.parse(req.params['productId']);
  const [product] = await db.select({ path: products.imagePath, isActive: products.isActive }).from(products)
    .where(eq(products.id, id));
  const expected = `${id}/${req.params['filename']}`;
  // Continue serving earlier uploads stored without the products/ prefix.
  const stored = product?.path?.replace(/^local\//, '').replace(/^products\//, '');
  if (!product?.path || stored !== expected) notFound('Foto tidak ditemukan.');
  if (!product.isActive) {
    await authenticate(req, res, () => {});
    if (req.user?.role !== 'admin') notFound('Foto tidak ditemukan.');
  }
  await sendImage(res, product.path, !product.isActive);
}));

export default router;
