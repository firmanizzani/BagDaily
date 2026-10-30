import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { db, client } from '../src/db/index.js';
import { products } from '../src/db/schema/index.js';
import { env } from '../src/config/env.js';
import { readProductImage, saveProductImage, removeProductImage } from '../src/modules/products/media.js';

const checksum = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const directory = resolve('uploads/catalog-import');
try {
  assert.ok(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY, 'Supabase Storage must be configured');
  const rows = await db.select().from(products);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, `paths-before-flatten-${Date.now()}.json`), JSON.stringify(rows.map(row => ({ id: row.id, slug: row.slug, imagePath: row.imagePath })), null, 2));
  let moved = 0;
  for (const product of rows) {
    if (!product.imagePath || (!product.imagePath.includes('/') && product.imagePath.startsWith(`${product.slug}-`))) continue;
    const bytes = await readProductImage(product.imagePath);
    const extension = product.imagePath.split('.').at(-1)!.toLowerCase();
    const mime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
    assert.ok(['png', 'jpg', 'jpeg', 'webp'].includes(extension), `Unsupported image: ${product.slug}`);
    const saved = await saveProductImage(product.id, bytes, extension, mime, product.slug);
    let attached = false;
    try {
      assert.ok(!saved.imagePath.includes('/'), 'Product files must be stored at bucket root');
      assert.equal(checksum(await readProductImage(saved.imagePath)), checksum(bytes), product.slug);
      const updated = await db.update(products).set({ imagePath: saved.imagePath, updatedAt: new Date() })
        .where(and(eq(products.id, product.id), eq(products.imagePath, product.imagePath))).returning({ id: products.id });
      attached = updated.length === 1;
      if (!attached) throw new Error(`Product changed while moving: ${product.slug}`);
      await removeProductImage(product.imagePath);
      console.log(`${product.slug}: ${saved.imagePath}`);
      moved++;
    } catch (error) {
      if (!attached) await removeProductImage(saved.imagePath);
      throw error;
    }
  }
  console.log(JSON.stringify({ bucket: env.SUPABASE_STORAGE_BUCKET, moved }));
} finally {
  await client.end();
}
