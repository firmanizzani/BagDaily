import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { and, eq, isNull } from 'drizzle-orm';
import { db, client } from '../src/db/index.js';
import { products } from '../src/db/schema/index.js';
import { env } from '../src/config/env.js';
import { saveProductImage, readProductImage, removeProductImage } from '../src/modules/products/media.js';

// Run after scripts/export-catalog-images.ps1. Re-running skips existing photos.
const directory = resolve('uploads/catalog-import');
const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const results: { slug: string; status: string; imagePath?: string }[] = [];
try {
  assert.ok(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY, 'Supabase Storage must be configured');
  const manifest = JSON.parse((await readFile(resolve(directory, 'manifest.json'), 'utf8')).replace(/^\uFEFF/, '')) as string[];
  const rows = await db.select().from(products);
  // Check the complete mapping and every input before uploading or updating anything.
  const sources = await Promise.all(manifest.map(async slug => {
    const product = rows.find(row => row.slug === slug);
    assert.ok(product, `No product matches ${slug}`);
    const image = await readFile(resolve(directory, `${slug}.png`));
    assert.ok(image.length > 0 && image.length <= 3 * 1024 * 1024, `Invalid image size: ${slug}`);
    return { product, image };
  }));
  for (const { product, image } of sources) {
    if (product.imagePath) {
      results.push({ slug: product.slug, status: 'existing-photo-kept' });
      console.log(`${product.slug}: existing photo kept`);
      continue;
    }
    const saved = await saveProductImage(product.id, image, 'png', 'image/png', product.slug);
    assert.ok(!saved.imagePath.startsWith('local/'), 'Expected a Supabase upload');
    let attached = false;
    try {
      const downloaded = await readProductImage(saved.imagePath);
      assert.equal(digest(downloaded), digest(image), `Storage verification failed: ${product.slug}`);
      const updated = await db.update(products).set({ imagePath: saved.imagePath, updatedAt: new Date() })
        .where(and(eq(products.id, product.id), isNull(products.imagePath)))
        .returning({ id: products.id });
      attached = updated.length === 1;
      if (!attached) {
        await removeProductImage(saved.imagePath);
        results.push({ slug: product.slug, status: 'concurrent-change-kept' });
        continue;
      }
      results.push({ slug: product.slug, status: 'uploaded-and-verified', imagePath: saved.imagePath });
      await writeFile(resolve(directory, 'import-results.json'), JSON.stringify(results, null, 2));
      console.log(`${product.slug}: uploaded, verified, and linked`);
    } catch (error) {
      if (!attached) await removeProductImage(saved.imagePath);
      throw error;
    }
  }
  const finalRows = await db.select({ slug: products.slug, imagePath: products.imagePath }).from(products);
  for (const slug of manifest) {
    const row = finalRows.find(product => product.slug === slug);
    assert.ok(row?.imagePath, `Missing photo: ${slug}`);
  }
  console.log(JSON.stringify({ bucket: env.SUPABASE_STORAGE_BUCKET, productsVerified: manifest.length, uploaded: results.filter(row => row.status === 'uploaded-and-verified').length }));
} finally {
  await client.end();
}
