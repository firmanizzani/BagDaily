import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const mocks = vi.hoisted(() => ({
  row: {} as Record<string, unknown>, select: vi.fn(), detail: vi.fn(), changeStatus: vi.fn(),
}));
vi.mock('../src/db/index.js', () => ({ db: { select: mocks.select } }));
vi.mock('../src/modules/orders/service.js', async importOriginal => ({
  ...await importOriginal<typeof import('../src/modules/orders/service.js')>(),
  orderDetail: mocks.detail,
  changeStatus: mocks.changeStatus,
}));
vi.mock('../src/middleware/auth.js', async importOriginal => ({
  ...await importOriginal<typeof import('../src/middleware/auth.js')>(),
  authenticate: async (req: Request, _res: Response, next: NextFunction) => {
    const role = req.headers['x-test-role'];
    if (role !== 'admin' && role !== 'kasir' && role !== 'pelanggan') {
      const { unauthorized } = await import('../src/utils/errors.js');
      return unauthorized();
    }
    req.user = { id: `${role}-id`, role, email: 'test@example.test', name: 'Test user' };
    next();
  },
}));
import app from '../src/app.js';
import { allowedOrigins } from '../src/config/env.js';

describe('online orders belong to admins and offline POS belongs to cashiers', () => {
  let server: Server;
  let base: string;
  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.row = { id, channel: 'online', status: 'awaiting_confirmation', userId: 'pelanggan-id', paymentStatus: 'paid' };
    mocks.detail.mockResolvedValue(mocks.row);
    mocks.changeStatus.mockResolvedValue({ ...mocks.row, status: 'packed' });
    mocks.select.mockImplementation((selection?: Record<string, unknown>) => {
      const rows = selection && 'count' in selection ? [{ count: 1 }] : [mocks.row];
      const where = Object.assign(Promise.resolve(rows), {
        orderBy: () => Object.assign(Promise.resolve(rows), { limit: () => ({ offset: async () => rows }) }),
        groupBy: async () => [{ status: 'awaiting_confirmation', count: 1 }],
      });
      const chain = { where: () => where, leftJoin: () => chain };
      return { from: () => chain };
    });
  });
  const request = (path: string, role?: string, method = 'GET', body?: unknown) => fetch(base + path, {
    method,
    headers: {
      Origin: allowedOrigins[0]!,
      ...(role ? { 'x-test-role': role } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  it.each([
    ['/api/admin/orders', 'GET'],
    ['/api/admin/customers', 'GET'],
    [`/api/admin/customers/${id}/orders`, 'GET'],
    [`/api/admin/orders/${id}`, 'GET'],
    [`/api/admin/orders/${id}/status`, 'PATCH'],
    ['/api/cashier/orders', 'GET'],
    [`/api/cashier/orders/${id}`, 'GET'],
    [`/api/cashier/orders/${id}/status`, 'PATCH'],
    [`/api/orders/${id}`, 'GET'],
  ])('blocks cashier access to %s', async (path, method) => {
    expect((await request(path!, 'kasir', method, method === 'PATCH' ? { status: 'packed' } : undefined)).status).toBe(403);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.detail).not.toHaveBeenCalled();
    expect(mocks.changeStatus).not.toHaveBeenCalled();
  });

  it.each([['pelanggan', 403], [undefined, 401]] as const)('blocks unauthorized online order management for %s', async (role, status) => {
    expect((await request('/api/admin/orders', role)).status).toBe(status);
    expect((await request('/api/admin/customers', role)).status).toBe(status);
  });

  it('allows admins to list, inspect, and process online orders', async () => {
    expect((await request('/api/admin/orders', 'admin')).status).toBe(200);
    expect((await request(`/api/admin/orders/${id}`, 'admin')).status).toBe(200);
    expect((await request(`/api/admin/orders/${id}/status`, 'admin', 'PATCH', { status: 'packed' })).status).toBe(200);
    expect(mocks.changeStatus).toHaveBeenCalledWith(id, 'admin-id', 'packed');
  });

  it('keeps the old order API available to admins only', async () => {
    expect((await request('/api/cashier/orders', 'admin')).status).toBe(200);
  });

  it('does not show POS receipts as online orders in the admin order detail', async () => {
    mocks.detail.mockResolvedValue({ ...mocks.row, channel: 'pos' });
    expect((await request(`/api/admin/orders/${id}`, 'admin')).status).toBe(404);
  });

  it('preserves cashier access to offline history and receipts', async () => {
    mocks.row = { ...mocks.row, channel: 'pos' };
    mocks.detail.mockResolvedValue(mocks.row);
    expect((await request('/api/cashier/transactions', 'kasir')).status).toBe(200);
    expect((await request(`/api/cashier/transactions/${id}`, 'kasir')).status).toBe(200);
  });

  it('allows customers to read only their own online orders', async () => {
    expect((await request(`/api/orders/${id}`, 'pelanggan')).status).toBe(200);
    mocks.detail.mockResolvedValue({ ...mocks.row, userId: 'another-customer' });
    expect((await request(`/api/orders/${id}`, 'pelanggan')).status).toBe(404);
  });
});
