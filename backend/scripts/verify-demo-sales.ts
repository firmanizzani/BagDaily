import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { client } from '../src/db/index.js';

const base = process.env['QA_API_URL'] || 'http://localhost:5173/api';
const origin = new URL(base).origin;
const plan = JSON.parse(await readFile(new URL('../../database/demo/sales-2026.json', import.meta.url), 'utf8')) as {
  customers: { key: string; name: string; email: string; phone: string; address: string; shippingZone: string }[];
  sales: { number: string; channel: string; customerKey: string | null; quantity: number; unitPrice: number }[];
};
let requests = 0;
async function request(path: string, cookie = '', body?: unknown, expectedStatus = 200) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(20000),
    headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  assert.equal(response.status, expectedStatus, `${path}: ${JSON.stringify(result.error)}`);
  requests++;
  return { ...result, cookie: response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ') };
}
try {
  const rates = (await request('/shipping/rates')).data as { courier: string; zone: string; rate: number }[];
  for (const customer of plan.customers) {
    const login = await request('/auth/login', '', { email: customer.email, password: 'pelanggan' });
    const me = (await request('/auth/me', login.cookie)).data;
    assert.equal(me.address, customer.address); assert.equal(me.phone, customer.phone); assert.equal(me.role, 'pelanggan');
    assert.equal(me.name, customer.name);
    const own = (await request('/orders/my?limit=100', login.cookie)).data as { id: string; orderNumber: string; userId: string; channel: string }[];
    const expected = plan.sales.filter(sale => sale.customerKey === customer.key);
    assert.equal(own.length, expected.length);
    assert.deepEqual(new Set(own.map(sale => sale.orderNumber)), new Set(expected.map(sale => sale.number)));
    for (const order of own) {
      assert.equal(order.userId, me.id);
      const detail = (await request(`/orders/${order.id}`, login.cookie)).data;
      assert.equal(detail.total, detail.subtotal + detail.shippingCost);
      if (detail.channel === 'online') {
        assert.equal(detail.shippingAddress, me.address); assert.equal(detail.recipientPhone, me.phone);
        assert.equal(detail.recipientName, me.name);
        assert.equal(detail.shippingZone, customer.shippingZone);
        assert.equal(detail.shippingCost, rates.find(rate => rate.courier === detail.courier && rate.zone === customer.shippingZone)?.rate);
        assert.ok(detail.shippingCost > 0 && detail.trackingNumber && detail.history.length === 5);
      }
    }
    await request('/admin/customers', login.cookie, undefined, 403);
    console.log(`PASS customer login, profile and ${own.length} linked purchases: ${customer.email}`);
  }
  const admin = await request('/auth/login', '', { email: 'admin@bagdaily.com', password: 'BagDaily123!' });
  const online = (await request('/admin/orders?search=BD-SIM-2026-&limit=100', admin.cookie)).data;
  assert.equal(online.length, 20);
  const customers = (await request('/admin/customers?search=gmail.com&limit=100', admin.cookie)).data;
  for (const customer of plan.customers) {
    const row = customers.find((value: { email: string }) => value.email === customer.email);
    assert.ok(row);
    const expected = plan.sales.filter(sale => sale.customerKey === customer.key);
    assert.equal(row.totalOrders, expected.length);
    const history = await request(`/admin/customers/${row.id}/orders?limit=100`, admin.cookie);
    assert.equal(history.data.length, expected.length);
    assert.equal(row.totalSpend, history.data.reduce((sum: number, order: { total: number }) => sum + order.total, 0));
  }
  const from = '2026-08-31T17:00:00.000Z';
  const to = '2026-11-04T17:00:00.000Z';
  const params = new URLSearchParams({ from, to, limit: '100' });
  const report = await request(`/admin/reports/sales?${params}`, admin.cookie);
  const [totals] = await client`select sum(total)::int as revenue, count(*)::int as transactions from orders where payment_status='paid' and paid_at>=${from} and paid_at<${to}`;
  assert.equal(report.summary.totalSales, totals.revenue);
  assert.equal(report.summary.totalTransactions, totals.transactions);
  const trend = (await request(`/admin/dashboard/sales-trend?${params}`, admin.cookie)).data;
  assert.equal(trend.reduce((sum: number, day: { revenue: number }) => sum + day.revenue, 0), totals.revenue);
  const dashboard = (await request(`/admin/dashboard/overview?${params}`, admin.cookie)).data;
  assert.equal(dashboard.totalSales, totals.revenue); assert.equal(dashboard.totalTransactions, totals.transactions);
  const [allTotals] = await client`select sum(total)::int as revenue, count(*)::int as transactions from orders where payment_status='paid'`;
  for (const path of ['/admin/reports/sales?all=true&limit=100', '/admin/dashboard/overview?all=true']) {
    const result = await request(path, admin.cookie);
    const summary = result.summary ?? result.data;
    assert.equal(summary.totalSales, allTotals.revenue);
    assert.equal(summary.totalTransactions, allTotals.transactions);
  }
  const csv = await fetch(`${base}/admin/reports/sales/export?all=true`, { headers: { Cookie: admin.cookie }, signal: AbortSignal.timeout(20000) });
  assert.equal(csv.status, 200);
  assert.ok(csv.headers.get('content-disposition')?.includes('sales-all-time.csv'));
  assert.ok((await csv.text()).includes('BD-SIM-2026-0001'));
  requests++;
  const pos = (await request('/cashier/transactions?search=BD-SIM-2026-&limit=100', admin.cookie)).data;
  assert.equal(pos.length, 20);
  assert.equal(pos.filter((order: { userId: string | null }) => !order.userId).length, 12);
  const publicProducts = (await request('/products?limit=100')).data;
  const products = await client`select id, stock, price from products where is_active=true`;
  for (const product of products) {
    const displayed = publicProducts.find((row: { id: string }) => row.id === product.id);
    assert.ok(displayed); assert.equal(displayed.stock, product.stock); assert.equal(displayed.price, product.price);
  }
  console.log(`PASS: ${requests} API requests through frontend proxy. Five real logins, addresses, courier/zone/rates, customer history/totals, admin reports/charts, 20 POS orders and catalog stock match PostgreSQL.`);
} finally { await client.end({ timeout: 5 }); }
