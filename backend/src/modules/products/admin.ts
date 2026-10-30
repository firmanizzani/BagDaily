import { Router } from 'express';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { db } from '../../db/index.js';
import { products, categories, stockMovements } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { ok } from '../../utils/response.js';
import { productInputSchema, idSchema } from '../../utils/validation.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { saveProductImage, removeProductImage } from './media.js';
import { getProducts } from './service.js';
import { withProductImageUrl } from './image-url.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const router = Router();

router.get('/', a(async (req, res) => {
  res.json(await getProducts(req, true));
}));

router.post('/', a(async (req, res) => {
  const input = productInputSchema.parse(req.body);
  const [cat] = await db.select().from(categories).where(eq(categories.id, input.categoryId));
  if (!cat) notFound('Category not found');
  const initialStock = input.stock ?? 0;
  const [product] = await db.insert(products).values({
    ...input,
    stock: initialStock,
    minimumStock: input.minimumStock ?? 5,
    isActive: input.isActive ?? true,
  }).returning();
  if (initialStock > 0) {
    await db.insert(stockMovements).values({
      productId: product.id,
      type: 'restock',
      quantity: initialStock,
      stockBefore: 0,
      stockAfter: initialStock,
      notes: 'Initial stock',
      createdBy: req.user!.id,
    });
  }
  res.status(201).json(ok(withProductImageUrl(product)));
}));

router.patch('/:id', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const input = productInputSchema.partial().strict().parse(req.body);
  if ('stock' in input) delete (input as Record<string, unknown>)['stock'];
  if (input.categoryId) {
    const [cat] = await db.select().from(categories).where(eq(categories.id, input.categoryId));
    if (!cat) notFound('Category not found');
  }
  const [product] = await db.update(products).set({
    ...input,
    updatedAt: new Date(),
  }).where(eq(products.id, id)).returning();
  if (!product) notFound('Product not found');
  res.json(ok(withProductImageUrl(product)));
}));

router.delete('/:id', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const [product] = await db.update(products).set({
    isActive: false,
    updatedAt: new Date(),
  }).where(eq(products.id, id)).returning();
  if (!product) notFound('Product not found');
  res.json(ok(withProductImageUrl(product)));
}));

router.post('/:id/image', upload.single('image'), a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  if (!req.file) badRequest('NO_FILE', 'Image file required');
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) notFound('Product not found');
  const result = await fileTypeFromBuffer(req.file.buffer);
  if (!result || !ALLOWED.includes(result.mime)) {
    badRequest('INVALID_FILE', 'Only JPEG, PNG, and WebP images are allowed');
  }
  const image = await saveProductImage(id,req.file.buffer,result.ext,result.mime,product.slug);
  const [updated] = await db.update(products).set({
    imagePath: image.imagePath,
    updatedAt: new Date(),
  }).where(eq(products.id, id)).returning();
  if (product.imagePath) {
    await removeProductImage(product.imagePath).catch(() => {});
  }
  res.json(ok(withProductImageUrl(updated)));
}));

router.delete('/:id/image', a(async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) notFound('Product not found');
  if (product.imagePath) {
    await removeProductImage(product.imagePath);
  }
  const [updated] = await db.update(products).set({
    imagePath: null,
    updatedAt: new Date(),
  }).where(eq(products.id, id)).returning();
  res.json(ok(withProductImageUrl(updated)));
}));

export default router;
