import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const mocks = vi.hoisted(() => ({
  product: {} as Record<string, unknown>, fields: {} as Record<string, unknown>, save: vi.fn(), remove: vi.fn(),
}));
vi.mock('../src/db/index.js', () => ({ db: {
  select: () => ({ from: () => ({ where: async () => [{ ...mocks.product }] }) }),
  insert: () => ({ values: (value: Record<string, unknown>) => ({ returning: async () => [{ ...mocks.product, ...value, imagePath: null }] }) }),
  update: () => ({ set: (value: Record<string, unknown>) => {
    mocks.fields = value;
    mocks.product = { ...mocks.product, ...value };
    return { where: () => ({ returning: async () => [{ ...mocks.product }] }) };
  } }),
} }));
vi.mock('../src/modules/products/media.js', () => ({ saveProductImage: mocks.save, removeProductImage: mocks.remove }));
import router from '../src/modules/products/admin.js';
import { errorHandler } from '../src/middleware/error.js';

describe('product writes with a single persisted image column', () => {
  let server: Server;
  let url: string;
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/products', router);
    app.use(errorHandler);
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/products`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.product = { id, slug: 'arlo-crossbody', name: 'Arlo Crossbody', imagePath: `products/${id}/old.png`, stock: 0 };
    mocks.fields = {};
    mocks.save.mockResolvedValue({ imagePath: 'arlo-crossbody-abc123.png', imageUrl: '/api/media/products/arlo-crossbody-abc123.png' });
    mocks.remove.mockResolvedValue(undefined);
  });
  it('uploads with a readable name and writes only imagePath', async () => {
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5RkAAAAASUVORK5CYII=', 'base64');
    const body = new FormData();
    body.append('image', new Blob([bytes], { type: 'image/png' }), 'photo.png');
    const response = await fetch(`${url}/${id}/image`, { method: 'POST', body });
    expect(response.status).toBe(200);
    const result = await response.json() as { data: { imagePath: string; imageUrl: string } };
    expect(result.data.imageUrl).toBe('/api/media/products/arlo-crossbody-abc123.png');
    expect(mocks.fields.imagePath).toBe('arlo-crossbody-abc123.png');
    expect(mocks.fields).not.toHaveProperty('imageUrl');
    expect(mocks.save).toHaveBeenCalledWith(id, expect.any(Buffer), 'png', 'image/png', 'arlo-crossbody');
    expect(mocks.remove).toHaveBeenCalledWith(`products/${id}/old.png`);
  });
  it('deletes a photo by clearing only imagePath and returning a null URL', async () => {
    const response = await fetch(`${url}/${id}/image`, { method: 'DELETE' });
    expect(response.status).toBe(200);
    const result = await response.json() as { data: { imagePath: null; imageUrl: null } };
    expect(result.data.imagePath).toBeNull();
    expect(result.data.imageUrl).toBeNull();
    expect(mocks.fields).not.toHaveProperty('imageUrl');
  });
  it('keeps the derived imageUrl in product edit responses', async () => {
    const response = await fetch(`${url}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Updated name' }) });
    expect(response.status).toBe(200);
    const result = await response.json() as { data: { imageUrl: string } };
    expect(result.data.imageUrl).toBe(`/api/media/products/${id}/old.png`);
  });
  it('returns a null derived URL when creating a product without a photo', async () => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: 'New Bag', slug: 'new-bag', categoryId: id, sku: 'NEW-001', description: 'New', material: 'Canvas', price: 10000, stock: 0,
    }) });
    expect(response.status).toBe(201);
    const result = await response.json() as { data: { imageUrl: null } };
    expect(result.data.imageUrl).toBeNull();
  });
});
