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
const orders = products
  .slice(0, 5)
  .map((p, i) => ({
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
const top = products
  .slice(0, 5)
  .map((p, i) => ({
    productId: p.id,
    name: p.name,
    quantity: i + 1,
    revenue: p.price * (i + 1),
  }));
let role = 'admin';
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let data;
  const p = url.pathname.replace('/api', '');
  if (req.method === 'POST' && p === '/auth/login') {
    let body = '';
    for await (const c of req) body += c;
    role = JSON.parse(body).email.includes('kasir') ? 'kasir' : 'admin';
    data = {
      id: 'visual-user',
      name: 'Pratinjau UI',
      role,
      email: 'visual@example.test',
      isActive: true,
    };
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
  else if (p === '/categories') data = categories;
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
  else if (p === '/cashier/orders' || p === '/cashier/transactions') data = orders;
  else data = [];
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(
    JSON.stringify({
      data,
      pagination: Array.isArray(data)
        ? { page: 1, total: data.length, totalPages: 1, limit: 100 }
        : undefined,
    }),
  );
}).listen(3002, '127.0.0.1', () =>
  console.log('Isolated visual fixtures on 127.0.0.1:3002. No real account access.'),
);
