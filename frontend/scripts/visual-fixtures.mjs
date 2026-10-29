// Isolated visual fixture service. No database, JWT, real accounts, or production access.
// For screenshot QA only: BAGDAILY_API_PROXY=http://127.0.0.1:3002 vite preview.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import console from 'node:console';
const seed = readFileSync(
  new URL('../../backend/src/db/seed.ts', import.meta.url),
  'utf8',
);
const categories = [
  { id: 'visual-ransel', name: 'Tas Ransel', slug: 'tas-ransel' },
  { id: 'visual-sling', name: 'Tas Selempang', slug: 'tas-selempang' },
  { id: 'visual-tote', name: 'Totebag', slug: 'totebag' },
];
const products = seed
  .split('\n')
  .filter(l => l.trim().startsWith('{ categorySlug:'))
  .map((line, i) => {
    const str = k => line.match(new RegExp(k + ": '([^']*)'"))?.[1] || '';
    const num = k => Number(line.match(new RegExp(k + ': (\\d+)'))?.[1] || 0);
    const category = categories.find(c => c.slug === str('categorySlug'));
    return {
      id: `visual-${i}`,
      name: str('name'),
      slug: str('slug'),
      sku: str('sku'),
      description: str('description'),
      material: str('material'),
      categoryId: category.id,
      category,
      price: num('price'),
      stock: num('stock'),
      minimumStock: num('minimumStock'),
      isActive: true,
      imageUrl: null,
    };
  });
const now = new Date();
const orders = products.slice(0, 5).map((p, i) => ({
  id: `visual-order-${i}`,
  orderNumber: `BD-VISUAL-00${i + 1}`,
  total: p.price * (i + 1),
  subtotal: p.price * (i + 1),
  shippingCost: 0,
  channel: 'online',
  status: ['completed', 'shipped', 'packed', 'confirmed', 'completed'][i],
  paymentStatus: 'paid',
  createdAt: new Date(now - i * 86400000).toISOString(),
}));
const sum = orders.reduce((s, o) => s + o.total, 0);
const top = products.slice(0, 5).map((p, i) => ({
  productId: p.id,
  name: p.name,
  quantity: i + 1,
  revenue: p.price * (i + 1),
}));
let role = 'pelanggan';
const checkoutOrders = new Map();
const makeCheckoutOrder = (id, input) => {
  const items = input.items.map((item, index) => {
    const product = products.find(product => product.id === item.productId);
    return {
      id: `${id}-item-${index}`,
      productId: product.id,
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: product.price * item.quantity,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingCost = input.deliveryMethod === 'shipping' ? 15000 : 0;
  return {
    ...input,
    id,
    orderNumber: `BD-DEMO-${checkoutOrders.size + 1}`,
    items,
    subtotal,
    shippingCost,
    total: subtotal + shippingCost,
    channel: 'online',
    status: 'awaiting_payment',
    paymentStatus: 'unpaid',
    paymentMethod: null,
    createdAt: new Date().toISOString(),
    paymentDeadline: new Date(Date.now() + 15 * 60000).toISOString(),
  };
};
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let data;
  let extra = {};
  const p = url.pathname.replace('/api', '');
  if (req.method === 'POST' && p === '/auth/login') {
    let body = '';
    for await (const c of req) body += c;
    const email = JSON.parse(body).email;
    role = email.includes('kasir')
      ? 'kasir'
      : email.includes('admin')
        ? 'admin'
        : 'pelanggan';
    data = {
      id: 'visual-user',
      name: 'Pratinjau UI',
      role,
      email: 'visual@example.test',
      isActive: true,
    };
  } else if (req.method === 'POST' && p === '/auth/logout') {
    role = 'pelanggan';
    data = null;
  } else if (req.method === 'POST' && p === '/orders') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const id = `visual-checkout-${checkoutOrders.size + 1}`;
    data = makeCheckoutOrder(id, JSON.parse(body));
    checkoutOrders.set(id, data);
  } else if (
    req.method === 'POST' &&
    /^\/orders\/[^/]+\/(simulate-payment|cancel)$/.test(p)
  ) {
    const order = checkoutOrders.get(p.split('/')[2]);
    let body = '';
    for await (const chunk of req) body += chunk;
    if (p.endsWith('/simulate-payment')) {
      Object.assign(order, {
        status: 'awaiting_confirmation',
        paymentStatus: 'paid',
        paymentMethod: JSON.parse(body).method,
        paidAt: new Date().toISOString(),
      });
    } else Object.assign(order, { status: 'cancelled' });
    data = order;
  } else if (req.method !== 'GET') {
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        data: null,
        error: {
          message:
            'Layanan ini hanya untuk pratinjau visual. Gunakan API asli untuk transaksi.',
        },
      }),
    );
    return;
  } else if (p === '/auth/me')
    data = {
      id: 'visual-user',
      name: 'Pratinjau UI',
      role,
      email: 'visual@example.test',
      isActive: true,
    };
  else if (p === '/orders/my') data = [...checkoutOrders.values()];
  else if (/^\/orders\/[^/]+$/.test(p)) data = checkoutOrders.get(p.split('/')[2]);
  else if (p === '/categories') data = categories;
  else if (p === '/shipping/rates')
    data = [{ id: 'visual-rate', courier: 'JNE', zone: 'Jabodetabek', rate: 15000 }];
  else if (['/products', '/admin/products'].includes(p) || p === '/admin/inventory')
    data = products.filter(
      p =>
        (!url.searchParams.get('search') ||
          p.name.toLowerCase().includes(url.searchParams.get('search').toLowerCase())) &&
        (!url.searchParams.get('category') ||
          p.category.slug === url.searchParams.get('category')),
    );
  else if (p === '/admin/dashboard/overview')
    data = {
      totalSales: sum,
      totalTransactions: orders.length,
      activeProducts: products.length,
      lowStockProducts: 0,
      totalProductsSold: top.reduce((sum, row) => sum + row.quantity, 0),
      newCustomers: 0,
      onlineSales: sum,
      posSales: 0,
    };
  else if (p === '/admin/dashboard/sales-trend')
    data = Array.from({ length: 15 }, (_, i) => ({
      date: new Date(now - (14 - i) * 86400000).toISOString().slice(0, 10),
      revenue: Math.round((sum / 15) * (0.3 + i / 10 + (i % 3) * 0.4)),
      transactions: (i % 4) + 1,
    }));
  else if (p === '/admin/dashboard/categories')
    data = categories
      .map(c => ({
        categoryId: c.id,
        name: c.name,
        quantity: top
          .filter(t => products.find(p => p.id === t.productId).categoryId === c.id)
          .reduce((s, t) => s + t.quantity, 0),
        revenue: top
          .filter(t => products.find(p => p.id === t.productId).categoryId === c.id)
          .reduce((s, t) => s + t.revenue, 0),
      }))
      .filter(c => c.quantity);
  else if (p === '/admin/dashboard/top-products') data = top;
  else if (p === '/admin/dashboard/channels')
    data = [
      { channel: 'online', revenue: sum, transactions: 5 },
      { channel: 'pos', revenue: 0, transactions: 0 },
    ];
  else if (p === '/admin/dashboard/restock-recommendations') data = [];
  else if (p === '/admin/reports/sales') {
    data = url.searchParams.get('channel') === 'pos' ? [] : orders;
    const totalSales = data.reduce((sum, order) => sum + order.total, 0);
    extra = {
      summary: {
        totalSales,
        totalTransactions: data.length,
        onlineSales: totalSales,
        posSales: 0,
      },
      products: data.length ? top : [],
    };
  } else if (p === '/cashier/orders' || p === '/cashier/transactions') data = orders;
  else data = [];
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(
    JSON.stringify({
      data,
      ...extra,
      pagination: Array.isArray(data)
        ? { page: 1, total: data.length, totalPages: 1, limit: 100 }
        : undefined,
    }),
  );
}).listen(3002, '127.0.0.1', () =>
  console.log('Isolated visual fixtures on 127.0.0.1:3002. No real account access.'),
);
