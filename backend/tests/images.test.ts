import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const productId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const mocks = vi.hoisted(() => ({ row: {} as Record<string, unknown>, read: vi.fn() }));
vi.mock('../src/db/index.js', () => ({ db: {
  select: () => ({ from: () => ({ where: async () => [mocks.row] }) }),
} }));
vi.mock('../src/modules/products/media.js', () => ({ readProductImage: mocks.read }));
vi.mock('../src/middleware/auth.js', () => ({
  authenticate: async (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!req.headers.authorization) {
      const { unauthorized } = await import('../src/utils/errors.js');
      unauthorized();
    }
    req.user = { id: 'customer', role: req.headers.authorization === 'admin' ? 'admin' : 'pelanggan' } as NonNullable<express.Request['user']>;
    next();
  },
}));
import router from '../src/modules/products/images.js';
import { errorHandler } from '../src/middleware/error.js';

describe('private storage image delivery', () => {
  let server: Server;
  let url: string;
  beforeAll(async () => {
    const app = express();
    app.use('/images', router);
    app.use(errorHandler);
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/images`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.read.mockResolvedValue(Buffer.from('image bytes'));
    mocks.row = { path: 'avatars/customer/photo.png' };
  });
  it('blocks anonymous requests for profile photos', async () => {
    expect((await fetch(`${url}/avatars/customer/photo.png`)).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('blocks other users from reading a profile photo', async () => {
    expect((await fetch(`${url}/avatars/another-user/photo.png`, { headers: { authorization: 'customer' } })).status).toBe(404);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('serves the owner their current photo with private caching', async () => {
    const response = await fetch(`${url}/avatars/customer/photo.png`, { headers: { authorization: 'customer' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('vary')).toContain('Cookie');
    expect(mocks.read).toHaveBeenCalledWith('avatars/customer/photo.png');
  });
  it('rejects an old profile photo URL after replacement', async () => {
    expect((await fetch(`${url}/avatars/customer/old.png`, { headers: { authorization: 'customer' } })).status).toBe(404);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it.each(['products/', '', 'local/products/'])('serves active catalog images with compatible prefix %s', async prefix => {
    mocks.row = { path: `${prefix}${productId}/photo.png`, isActive: true };
    const response = await fetch(`${url}/${productId}/photo.png`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect(response.headers.get('cache-control')).toContain('public');
  });
  it('blocks anonymous access to inactive product photos', async () => {
    mocks.row = { path: `products/${productId}/photo.png`, isActive: false };
    expect((await fetch(`${url}/${productId}/photo.png`)).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('serves a product image stored directly at bucket root', async () => {
    mocks.row = { path: 'arlo-crossbody-abc123.png', isActive: true };
    const response = await fetch(`${url}/arlo-crossbody-abc123.png`);
    expect(response.status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith('arlo-crossbody-abc123.png');
  });
  it('rejects a filename that does not match the product record', async () => {
    mocks.row = { path: 'arlo-crossbody-current.png', isActive: true };
    expect((await fetch(`${url}/arlo-crossbody-old.png`)).status).toBe(404);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('allows admins to preview inactive products with private caching', async () => {
    mocks.row = { path: `products/${productId}/photo.png`, isActive: false };
    const response = await fetch(`${url}/${productId}/photo.png`, { headers: { authorization: 'admin' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('private');
  });
});
