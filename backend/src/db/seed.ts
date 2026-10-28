import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';
import { users, categories, products, shippingRates } from './schema/index.js';

const url = process.env['DATABASE_URL'] ?? '';
if (!url) { console.error('DATABASE_URL required'); process.exit(1); }

const adminPassword = process.env['DEMO_ADMIN_PASSWORD'];
const cashierPassword = process.env['DEMO_CASHIER_PASSWORD'];
const customerPassword = process.env['DEMO_CUSTOMER_PASSWORD'];
const catalogOnly = process.argv.includes('--catalog-only');
if (!catalogOnly && (!adminPassword || !cashierPassword || !customerPassword)) {
  console.error('DEMO_ADMIN_PASSWORD, DEMO_CASHIER_PASSWORD, and DEMO_CUSTOMER_PASSWORD must be set in env');
  process.exit(1);
}

const client = postgres(url, { prepare: false, fetch_types: false, max: 1, ssl: 'require' });
const db = drizzle(client, { schema: { users, categories, products, shippingRates } });

const CATEGORIES = [
  { name: 'Tas Selempang', slug: 'tas-selempang' },
  { name: 'Tas Ransel', slug: 'tas-ransel' },
  { name: 'Totebag', slug: 'totebag' },
];

const PRODUCTS_BY_SLUG: Array<{ categorySlug: string; sku: string; name: string; slug: string; description: string; material: string; price: number; stock: number; minimumStock: number }> = [
  { categorySlug: 'tas-selempang', sku: 'BD-SLG-001', name: 'Arlo Crossbody', slug: 'arlo-crossbody', description: 'Tas selempang kotak kecil dengan satu resleting atas dan tali panjang. Ringan dan praktis untuk aktivitas sehari-hari.', material: 'Nilon hitam premium', price: 189000, stock: 30, minimumStock: 5 },
  { categorySlug: 'tas-selempang', sku: 'BD-SLG-002', name: 'Nara Sling', slug: 'nara-sling', description: 'Tas sling berbentuk oval dengan tali lebar yang nyaman di bahu. Satu resleting utama yang lebar.', material: 'Kanvas krem tebal', price: 215000, stock: 25, minimumStock: 5 },
  { categorySlug: 'tas-selempang', sku: 'BD-SLG-003', name: 'Kiro Flap Sling', slug: 'kiro-flap-sling', description: 'Tas selempang dengan flap depan dilengkapi kancing magnet yang kokoh. Tampilan klasik dengan nuansa modern.', material: 'Kulit sintetis cokelat', price: 279000, stock: 20, minimumStock: 5 },
  { categorySlug: 'tas-selempang', sku: 'BD-SLG-004', name: 'Tavo Utility Sling', slug: 'tavo-utility-sling', description: 'Tas sling fungsional dengan dua kantong resleting di bagian depan. Ideal untuk menyimpan banyak item kecil.', material: 'Nilon hijau olive tahan air', price: 249000, stock: 18, minimumStock: 5 },
  { categorySlug: 'tas-selempang', sku: 'BD-SLG-005', name: 'Lumi Mini Sling', slug: 'lumi-mini-sling', description: 'Tas sling berukuran mini dengan tali tipis yang elegan. Cocok untuk membawa kebutuhan minimal.', material: 'Nilon navy ringan', price: 159000, stock: 35, minimumStock: 5 },
  { categorySlug: 'tas-selempang', sku: 'BD-SLG-006', name: 'Dova Pocket Sling', slug: 'dova-pocket-sling', description: 'Tas sling kasual dengan satu kantong tempel di bagian depan yang mudah diakses.', material: 'Kanvas abu-abu medium weight', price: 199000, stock: 22, minimumStock: 5 },
  { categorySlug: 'tas-ransel', sku: 'BD-RNS-001', name: 'Mero Daypack', slug: 'mero-daypack', description: 'Ransel klasik berkapasitas sedang dengan kantong depan beresleting. Cocok untuk penggunaan harian dan perjalanan singkat.', material: 'Polyester hitam 600D', price: 329000, stock: 15, minimumStock: 5 },
  { categorySlug: 'tas-ransel', sku: 'BD-RNS-002', name: 'Zeno Laptop Pack', slug: 'zeno-laptop-pack', description: 'Ransel persegi besar dengan dua kantong depan dan panel punggung tebal yang ergonomis. Memuat laptop hingga 15 inci.', material: 'Polyester abu tua ripstop', price: 459000, stock: 12, minimumStock: 3 },
  { categorySlug: 'tas-ransel', sku: 'BD-RNS-003', name: 'Kavi Campus Pack', slug: 'kavi-campus-pack', description: 'Ransel kampus dengan kantong depan dan kantong samping jaring untuk botol minum. Desain yang nyaman dan ringan.', material: 'Nilon navy 420D', price: 289000, stock: 20, minimumStock: 5 },
  { categorySlug: 'tas-ransel', sku: 'BD-RNS-004', name: 'Rhea Mini Pack', slug: 'rhea-mini-pack', description: 'Ransel mini berbentuk membulat dengan tali tipis yang stylish. Satu resleting utama dengan kapasitas esensial.', material: 'Kanvas krem waxed', price: 239000, stock: 28, minimumStock: 5 },
  { categorySlug: 'tas-ransel', sku: 'BD-RNS-005', name: 'Orin Roll-Top Pack', slug: 'orin-roll-top-pack', description: 'Ransel dengan penutup atas yang digulung dan dikunci gesper. Tahan air dan kapasitas bisa disesuaikan.', material: 'Nilon hijau olive waterproof', price: 389000, stock: 10, minimumStock: 3 },
  { categorySlug: 'tas-ransel', sku: 'BD-RNS-006', name: 'Talo Trail Pack', slug: 'talo-trail-pack', description: 'Ransel outdoor dengan tali dada, kantong samping, dan tali kompresi. Ideal untuk hiking dan kegiatan alam.', material: 'Polyester cokelat tua 840D', price: 419000, stock: 8, minimumStock: 3 },
  { categorySlug: 'totebag', sku: 'BD-TTB-001', name: 'Sora Canvas Tote', slug: 'sora-canvas-tote', description: 'Tote bag persegi polos dengan dua tali pendek. Tampilan bersih dan minimalis tanpa resleting.', material: 'Kanvas krem 10 oz', price: 149000, stock: 40, minimumStock: 8 },
  { categorySlug: 'totebag', sku: 'BD-TTB-002', name: 'Kuma Zip Tote', slug: 'kuma-zip-tote', description: 'Tote bag persegi dengan resleting atas untuk keamanan ekstra. Desain urban yang praktis.', material: 'Kanvas hitam 12 oz', price: 179000, stock: 32, minimumStock: 8 },
  { categorySlug: 'totebag', sku: 'BD-TTB-003', name: 'Lino Shopper Tote', slug: 'lino-shopper-tote', description: 'Tote bag berukuran besar dan lebar dengan tali bahu panjang. Sempurna untuk belanja dan kegiatan sehari-hari.', material: 'Kanvas navy heavy duty', price: 199000, stock: 25, minimumStock: 8 },
  { categorySlug: 'totebag', sku: 'BD-TTB-004', name: 'Mika Pocket Tote', slug: 'mika-pocket-tote', description: 'Tote bag dengan satu kantong besar di bagian depan untuk akses cepat ke barang-barang penting.', material: 'Kanvas hijau olive 10 oz', price: 169000, stock: 30, minimumStock: 8 },
  { categorySlug: 'totebag', sku: 'BD-TTB-005', name: 'Ayo Stripe Tote', slug: 'ayo-stripe-tote', description: 'Tote bag kanvas krem dengan motif garis horizontal navy yang playful dan eye-catching.', material: 'Kanvas krem bergaris navy', price: 189000, stock: 22, minimumStock: 8 },
  { categorySlug: 'totebag', sku: 'BD-TTB-006', name: 'Hana Mini Tote', slug: 'hana-mini-tote', description: 'Tote bag mini berbentuk trapesium dengan tali pendek. Lucu dan cocok untuk jalan-jalan kasual.', material: 'Kanvas cokelat muda 8 oz', price: 139000, stock: 35, minimumStock: 8 },
];

const SHIPPING_RATES = [
  { courier: 'JNE', zone: 'Jabodetabek', rate: 15000 },
  { courier: 'JNE', zone: 'Jawa', rate: 22000 },
  { courier: 'JNE', zone: 'Luar Jawa', rate: 35000 },
  { courier: 'J&T', zone: 'Jabodetabek', rate: 13000 },
  { courier: 'J&T', zone: 'Jawa', rate: 20000 },
  { courier: 'J&T', zone: 'Luar Jawa', rate: 32000 },
  { courier: 'SiCepat', zone: 'Jabodetabek', rate: 12000 },
  { courier: 'SiCepat', zone: 'Jawa', rate: 19000 },
  { courier: 'SiCepat', zone: 'Luar Jawa', rate: 30000 },
];

async function run() {
  console.log('Seeding database...');

  if (!catalogOnly) {
    if (!adminPassword || !cashierPassword || !customerPassword) {
      throw new Error('DEMO_ADMIN_PASSWORD, DEMO_CASHIER_PASSWORD, and DEMO_CUSTOMER_PASSWORD must be set');
    }
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const cashierHash = await bcrypt.hash(cashierPassword, 12);
    const customerHash = await bcrypt.hash(customerPassword, 12);
    const demoAccounts = [
      { name: 'Admin BagDaily', email: 'admin@bagdaily.com', passwordHash: adminHash, role: 'admin' as const },
      { name: 'Kasir Demo', email: 'kasir@bagdaily.com', passwordHash: cashierHash, role: 'kasir' as const },
      { name: 'Pelanggan Demo', email: 'demo@bagdaily.com', passwordHash: customerHash, role: 'pelanggan' as const },
    ];

    for (const acc of demoAccounts) {
      const [existing] = await db.select().from(users).where(eq(users.email, acc.email));
      if (!existing) { await db.insert(users).values(acc); console.log(`Created user: ${acc.email} (${acc.role})`); }
      else console.log(`User exists: ${acc.email} — skipped`);
    }
  }

  const catMap: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const [existing] = await db.select().from(categories).where(eq(categories.slug, cat.slug));
    if (existing) { catMap[cat.slug] = existing.id; console.log(`Category exists: ${cat.name} — skipped`); }
    else { const [c] = await db.insert(categories).values(cat).returning(); catMap[cat.slug] = c.id; console.log(`Created category: ${cat.name}`); }
  }

  for (const p of PRODUCTS_BY_SLUG) {
    const categoryId = catMap[p.categorySlug];
    const [existing] = await db.select().from(products).where(eq(products.sku, p.sku));
    if (existing) { console.log(`Product exists: ${p.sku} — skipped`); continue; }
    const { categorySlug: _cs, ...vals } = p;
    await db.insert(products).values({ ...vals, categoryId });
    console.log(`Created product: ${p.name} (${p.sku})`);
  }

  for (const rate of SHIPPING_RATES) {
    const [existing] = await db.select().from(shippingRates).where(and(eq(shippingRates.courier, rate.courier), eq(shippingRates.zone, rate.zone)));
    if (existing) { console.log(`Rate exists: ${rate.courier} ${rate.zone} — skipped`); continue; }
    await db.insert(shippingRates).values(rate);
    console.log(`Created rate: ${rate.courier} ${rate.zone} = ${rate.rate}`);
  }

  console.log('\nSeed complete.');
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
