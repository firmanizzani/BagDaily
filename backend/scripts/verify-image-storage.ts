import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import app from '../src/app.js';
import { client, db } from '../src/db/index.js';
import { products, users } from '../src/db/schema/index.js';
import { allowedOrigins, env } from '../src/config/env.js';
import { removeProductImage } from '../src/modules/products/media.js';

// Opt-in live verification; creates only disposable product/user fixtures.
const password = process.env['QA_ADMIN_PASSWORD'] || process.env['DEMO_ADMIN_PASSWORD'];
if (!password) throw new Error('Set QA_ADMIN_PASSWORD or DEMO_ADMIN_PASSWORD to run live storage verification.');
const storage = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const server = createServer(app);
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5RkAAAAASUVORK5CYII=', 'base64');
let customerId: string | undefined;
let productId: string | undefined;
let checks = 0;
const check = (condition: unknown, message: string) => { assert.ok(condition, message); checks++; };

async function api(path: string, method = 'GET', cookie = '', body?: unknown) {
  const response = await fetch(base + path, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: {
      Origin: allowedOrigins[0]!,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  });
  const data = await response.json() as { data: Record<string, any>; error?: { message: string } };
  assert.ok(response.ok, `${method} ${path}: ${response.status} ${data.error?.message || ''}`);
  return { data: data.data, cookie: response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ') };
}
function imageBody() {
  const body = new FormData();
  body.append('image', new Blob([bytes], { type: 'image/png' }), 'qa-photo.png');
  return body;
}

async function storedFileExists(bucket: string, path: string) {
  const split = path.lastIndexOf('/');
  const { data, error } = await storage.storage.from(bucket).list(path.slice(0, split));
  if (error) throw error;
  return data.some(file => file.name === path.slice(split + 1));
}

try {
  for (const name of [env.SUPABASE_STORAGE_BUCKET, env.SUPABASE_PROFILE_STORAGE_BUCKET]) {
    const { data, error } = await storage.storage.getBucket(name);
    if (error) throw error;
    check(data && !data.public, `${name} exists and is private`);
  }
  const admin = await api('/api/auth/login', 'POST', '', {
    email: process.env['QA_ADMIN_EMAIL'] || 'admin@bagdaily.com', password,
  });
  check(admin.data['role'] === 'admin', 'Admin login works');
  const stamp = randomUUID();
  const customer = await api('/api/auth/register', 'POST', '', {
    name: 'Storage QA temporary user', email: `storage-qa-${stamp}@example.test`, password: randomUUID(),
  });
  customerId = customer.data['id'];
  check(Boolean(customerId), 'Temporary customer registered');
  const category = await api('/api/categories');
  const firstCategory = (category.data as unknown as { id: string }[])[0];
  assert.ok(firstCategory, 'At least one category is required');
  const product = await api('/api/admin/products', 'POST', admin.cookie, {
    categoryId: firstCategory.id, sku: `STORAGE-QA-${stamp}`, name: 'Storage QA temporary product',
    slug: `storage-qa-${stamp}`, description: 'Disposable storage verification fixture', material: 'QA',
    price: 10000, stock: 0, minimumStock: 0, isActive: true,
  });
  productId = product.data['id'];
  const uploadedProduct = await api(`/api/admin/products/${productId}/image`, 'POST', admin.cookie, imageBody());
  const productPath = uploadedProduct.data['imagePath'] as string;
  check(!productPath.includes('/') && productPath.startsWith(`storage-qa-${stamp}-`), 'Product file has a readable name at bucket root');
  const { data: storedProduct, error: productError } = await storage.storage.from(env.SUPABASE_STORAGE_BUCKET).download(productPath);
  if (productError) throw productError;
  check(Buffer.from(await storedProduct.arrayBuffer()).equals(bytes), 'Product bytes persisted in product-images');
  const catalogImage = await fetch(base + uploadedProduct.data['imageUrl']);
  check(catalogImage.ok && Buffer.from(await catalogImage.arrayBuffer()).equals(bytes), 'Product image is visible in the catalog');

  const uploadedProfile = await api('/api/auth/profile/avatar', 'POST', customer.cookie, imageBody());
  const [customerRow] = await db.select().from(users).where(eq(users.id, customerId!));
  assert.ok(customerRow?.avatarPath);
  check(customerRow.avatarPath.startsWith(`avatars/${customerId}/`), 'Profile path persisted in the database');
  const { data: storedProfile, error: profileError } = await storage.storage.from(env.SUPABASE_PROFILE_STORAGE_BUCKET).download(customerRow.avatarPath);
  if (profileError) throw profileError;
  check(Buffer.from(await storedProfile.arrayBuffer()).equals(bytes), 'Profile bytes persisted in profile-images');
  const session = await api('/api/auth/me', 'GET', customer.cookie);
  check(session.data['avatarUrl'] === uploadedProfile.data['avatarUrl'], 'Avatar URL survives a session refresh');
  const avatarUrl = base + uploadedProfile.data['avatarUrl'];
  const ownPhoto = await fetch(avatarUrl, { headers: { Cookie: customer.cookie } });
  check(ownPhoto.ok && Buffer.from(await ownPhoto.arrayBuffer()).equals(bytes), 'Owner can view the uploaded profile photo');
  check((await fetch(avatarUrl)).status === 401, 'Anonymous profile access is blocked');
  check((await fetch(avatarUrl, { headers: { Cookie: admin.cookie } })).status === 404, 'Another account cannot view the profile photo');

  const replacement = await api('/api/auth/profile/avatar', 'POST', customer.cookie, imageBody());
  check(replacement.data['avatarUrl'] !== uploadedProfile.data['avatarUrl'], 'Replacing a photo creates a new URL');
  check(!(await storedFileExists(env.SUPABASE_PROFILE_STORAGE_BUCKET, customerRow.avatarPath)), 'Replacing a profile photo removes the previous file');
  await api('/api/auth/profile/avatar', 'DELETE', customer.cookie);
  const cleared = await api('/api/auth/me', 'GET', customer.cookie);
  check(cleared.data['avatarUrl'] === null, 'Deleting a profile photo clears the session URL');
  await api(`/api/admin/products/${productId}/image`, 'DELETE', admin.cookie);
  check(!(await storedFileExists(env.SUPABASE_STORAGE_BUCKET, productPath)), 'Deleting a product photo removes it from Storage');
  console.log(JSON.stringify({ passed: checks, productBucket: env.SUPABASE_STORAGE_BUCKET, profileBucket: env.SUPABASE_PROFILE_STORAGE_BUCKET }));
} finally {
  if (customerId) {
    const [row] = await db.select().from(users).where(eq(users.id, customerId));
    if (row?.avatarPath) await removeProductImage(row.avatarPath);
    await db.delete(users).where(eq(users.id, customerId));
  }
  if (productId) {
    const [row] = await db.select().from(products).where(eq(products.id, productId));
    if (row?.imagePath) await removeProductImage(row.imagePath);
    await db.delete(products).where(eq(products.id, productId));
  }
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await client.end();
  console.log('Temporary QA files, user, and product cleaned up.');
}
