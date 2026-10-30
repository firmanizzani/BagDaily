import { Router, type Request, type Response } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { products, users } from '../../db/schema/index.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncRoute as a } from '../../utils/async.js';
import { notFound } from '../../utils/errors.js';
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

async function sendProductImage(req: Request, res: Response, expected: string) {
  const [product] = await db.select({ path: products.imagePath, isActive: products.isActive }).from(products)
    .where(inArray(products.imagePath, [expected, `products/${expected}`, `local/${expected}`, `local/products/${expected}`]));
  // Continue serving earlier uploads stored without the products/ prefix.
  const stored = product?.path?.replace(/^local\//, '').replace(/^products\//, '');
  if (!product?.path || stored !== expected) notFound('Foto tidak ditemukan.');
  if (!product.isActive) {
    await authenticate(req, res, () => {});
    if (req.user?.role !== 'admin') notFound('Foto tidak ditemukan.');
  }
  await sendImage(res, product.path, !product.isActive);
}

const filenameSchema = z.string().max(240).regex(/^[a-z0-9-]+\.(png|jpe?g|webp)$/);

// New product files live directly in the bucket; keep legacy folder URLs readable.
router.get('/:filename', a(async (req, res) => {
  const filename = filenameSchema.parse(req.params['filename']);
  await sendProductImage(req, res, filename);
}));

router.get('/:productId/:filename', a(async (req, res) => {
  const folder = z.string().min(1).max(180).regex(/^[a-z0-9-]+$/).parse(req.params['productId']);
  const filename = filenameSchema.parse(req.params['filename']);
  await sendProductImage(req, res, `${folder}/${filename}`);
}));

export default router;
