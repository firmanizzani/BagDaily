import assert from 'node:assert/strict';

const base = process.env.QA_API_URL || 'http://localhost:5173/api';
const accounts = [
  { email: 'demo@bagdaily.com', password: 'BagDaily123!' },
  { email: 'nadia@gmail.com', password: 'pelanggan' },
];
let previousOrderId: string | undefined;
for (const account of accounts) {
  const login = await fetch(base + '/auth/login', {
    method: 'POST', headers: { Origin: new URL(base).origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(account), signal: AbortSignal.timeout(20000),
  });
  assert.equal(login.status, 200, 'Customer login must succeed');
  const user = (await login.json()).data;
  const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
  async function get(path: string) {
    const response = await fetch(base + path, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, 'Customer endpoint must succeed');
    return response.json();
  }
  const all = await get('/orders/my?limit=100');
  assert.equal(all.data.length, all.pagination.total, 'Fixture must fit on one page');
  assert.ok(all.data.length > 0);
  for (const row of all.data) {
    assert.equal(row.userId, user.id);
    const detail = (await get('/orders/' + row.id)).data;
    assert.equal(row.productCount, detail.items.length);
    assert.equal(row.totalQuantity, detail.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0));
    assert.ok(detail.items.some((item: { productNameSnapshot: string }) => item.productNameSnapshot === row.productName));
    assert.ok(!JSON.stringify(row).includes('unitCost'), 'Cost prices must remain private');
    assert.ok(!JSON.stringify(detail).includes('unitCost'));
    if (row.productImageUrl) {
      const image = await fetch(new URL(row.productImageUrl, base), { signal: AbortSignal.timeout(20000) });
      assert.equal(image.status, 200, 'Product preview image must load');
    }
  }
  for (const tab of ['awaiting_payment', 'processing', 'shipped', 'completed', 'cancelled']) {
    const statuses = tab === 'processing' ? ['awaiting_confirmation', 'confirmed', 'packed'] : [tab];
    const result = await get('/orders/my?limit=100&tab=' + tab);
    const expected = all.data.filter((row: { status: string }) => statuses.includes(row.status));
    assert.equal(result.pagination.total, expected.length);
    assert.deepEqual(result.data.map((row: { id: string }) => row.id).sort(), expected.map((row: { id: string }) => row.id).sort());
  }
  const searched = await get('/orders/my?search=' + encodeURIComponent(all.data[0].orderNumber));
  assert.equal(searched.pagination.total, 1);
  assert.equal(searched.data[0].id, all.data[0].id);
  if (previousOrderId) {
    const denied = await fetch(base + '/orders/' + previousOrderId, { headers: { Cookie: cookie } });
    assert.equal(denied.status, 404, 'Another customer must not access the order');
  }
  previousOrderId = all.data[0].id;
  console.log(`PASS customer ${accounts.indexOf(account) + 1}: product previews, item quantities, images, grouped filters, search, privacy and ownership.`);
}
