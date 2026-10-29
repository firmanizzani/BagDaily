import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const mocks = vi.hoisted(() => {
  const fields: Record<string, unknown> = {};
  const tx = {
    select: () => ({ from: () => ({ where: () => ({ for: async () => [{ avatarPath: 'old/avatar.png' }] }) }) }),
    update: () => ({ set: (value: Record<string, unknown>) => {
      Object.assign(fields, value);
      return { where: () => ({ returning: async () => [{ id: 'customer', avatarUrl: value.avatarUrl }] }) };
    } }),
  };
  return {
    transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
    save: vi.fn(), remove: vi.fn(), fields,
  };
});
vi.mock('../src/db/index.js', () => ({ db: { transaction: mocks.transaction } }));
vi.mock('../src/modules/products/media.js', () => ({ saveProductImage: mocks.save, removeProductImage: mocks.remove }));
vi.mock('../src/middleware/auth.js', () => ({
  authenticate: async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization !== 'test-session') {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    req.user = { id: 'customer', role: 'pelanggan' } as NonNullable<express.Request['user']>;
    next();
  },
}));
import router from '../src/modules/auth/index.js';
import { errorHandler } from '../src/middleware/error.js';

describe('profile avatar API', () => {
  let server: Server;
  let url: string;
  beforeAll(async () => {
    const app = express();
    app.use('/auth', router);
    app.use(errorHandler);
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/auth/profile/avatar`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockResolvedValue({ imagePath: 'new/avatar.png', imageUrl: '/api/media/products/new/avatar.png' });
    mocks.remove.mockResolvedValue(undefined);
  });
  const upload = (buffer: Uint8Array = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5RkAAAAASUVORK5CYII=', 'base64')) => {
    const body = new FormData();
    body.append('image', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'photo.png');
    return body;
  };
  const headers = { authorization: 'test-session' };

  it('rejects guests before accepting an upload', async () => {
    expect((await fetch(url, { method: 'POST', body: upload() })).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects disguised files by checking their bytes', async () => {
    expect((await fetch(url, { method: 'POST', headers, body: upload(Buffer.from('<svg>not a PNG</svg>')) })).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects files larger than 3 MB', async () => {
    expect((await fetch(url, { method: 'POST', headers, body: upload(new Uint8Array(3 * 1024 * 1024 + 1)) })).status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('saves a valid image to the signed-in user and removes the previous image', async () => {
    const response = await fetch(url, { method: 'POST', headers, body: upload() });
    expect(response.status).toBe(200);
    const payload = await response.json() as { data: { avatarUrl: string } };
    expect(payload.data.avatarUrl).toBe('/api/media/products/new/avatar.png');
    expect(mocks.save).toHaveBeenCalledWith('avatars/customer', expect.any(Buffer), 'png', 'image/png');
    expect(mocks.remove).toHaveBeenCalledWith('old/avatar.png');
  });
  it('cleans up the new file if the database update fails', async () => {
    mocks.transaction.mockRejectedValueOnce(new Error('database unavailable'));
    expect((await fetch(url, { method: 'POST', headers, body: upload() })).status).toBe(500);
    expect(mocks.remove).toHaveBeenCalledWith('new/avatar.png');
    expect(mocks.remove).not.toHaveBeenCalledWith('old/avatar.png');
  });
  it('removes an avatar and clears its URL', async () => {
    const response = await fetch(url, { method: 'DELETE', headers });
    expect(response.status).toBe(200);
    const payload = await response.json() as { data: { avatarUrl: null } };
    expect(payload.data.avatarUrl).toBeNull();
    expect(mocks.remove).toHaveBeenCalledWith('old/avatar.png');
  });
});
