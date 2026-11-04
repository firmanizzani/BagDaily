import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { client } from './index.js';

const customerSchema = z.object({
  key: z.string(), name: z.string().trim().min(2).max(100), email: z.string().email(), previousEmail: z.string().email().optional(),
  phone: z.string(), address: z.string().startsWith('Jl. ').min(15), shippingZone: z.enum(['Jabodetabek', 'Jawa', 'Luar Jawa']),
});
const planSchema = z.object({
  batch: z.literal('SIM-GTNIC-2026'), customers: z.array(customerSchema).length(5),
  sales: z.array(z.object({
    number: z.string().regex(/^BD-SIM-2026-\d{4}$/), createdAt: z.string().datetime({ offset: true }),
    channel: z.enum(['online', 'pos']), customerKey: z.string().nullable(), sku: z.string(), productName: z.string(),
    quantity: z.number().int().min(1).max(3), unitPrice: z.number().int().positive().multipleOf(10000),
    courier: z.enum(['JNE', 'J&T', 'SiCepat']).optional(),
  })).length(40),
});
type Plan = z.infer<typeof planSchema>;

export async function importDemoSales(mode: 'preview' | 'apply' | 'check' | 'profiles') {
  const plan = planSchema.parse(JSON.parse(await readFile(new URL('../../../database/demo/sales-2026.json', import.meta.url), 'utf8')));
  assert.equal(new Set(plan.sales.map(s => s.number)).size, 40);
  assert.equal(new Set(plan.customers.map(c => c.key)).size, 5);
  assert.equal(new Set(plan.customers.map(c => c.email)).size, 5);
  assert.equal(plan.sales.filter(s => s.channel === 'online').length, 20);
  assert.equal(plan.sales.reduce((total, sale) => total + sale.quantity, 0), 71);
  const byKey = new Map(plan.customers.map(customer => [customer.key, customer]));
  const rates = await client<{ courier: string; zone: string; rate: number }[]>`select courier, zone, rate from shipping_rates`;
  const enriched = plan.sales.map((sale, i) => {
    const customer = sale.customerKey ? byKey.get(sale.customerKey) : undefined;
    if (sale.customerKey) assert.ok(customer, `Unknown customer ${sale.customerKey}`);
    if (sale.channel === 'online') assert.ok(customer && sale.courier, 'Online sale requires customer, address and courier');
    const createdAt = new Date(sale.createdAt);
    assert.ok(createdAt >= new Date('2026-09-01T00:00:00+07:00') && createdAt <= new Date('2026-11-04T23:59:59+07:00') && createdAt <= new Date());
    const shippingCost = sale.channel === 'online' ? rates.find(rate => rate.courier === sale.courier && rate.zone === customer!.shippingZone)?.rate : 0;
    assert.ok(shippingCost !== undefined && (sale.channel !== 'online' || shippingCost > 0), `Shipping rate missing for ${sale.number}`);
    const paidAt = new Date(createdAt.getTime() + (sale.channel === 'online' ? 2 * 60000 : 0));
    const days = customer?.shippingZone === 'Luar Jawa' ? 2 : 1;
    const completedAt = new Date(paidAt.getTime() + (sale.channel === 'online' ? days * 86400000 : 0));
    assert.ok(completedAt <= new Date(), `Completion would be in the future: ${sale.number}`);
    const subtotal = sale.quantity * sale.unitPrice;
    const paymentMethod = sale.channel === 'online' ? (i % 2 ? 'bank_transfer' : 'qris') : ['cash', 'qris', 'bank_transfer', 'debit', 'credit'][i % 5]!;
    return { ...sale, customer, createdAt, paidAt, completedAt, subtotal, shippingCost, total: subtotal + shippingCost, paymentMethod };
  });
  const summary = {
    transactions: enriched.length, online: 20, pos: 20, anonymous: enriched.filter(s => !s.customer).length,
    units: 71, merchandise: enriched.reduce((sum, s) => sum + s.subtotal, 0),
    shipping: enriched.reduce((sum, s) => sum + s.shippingCost, 0), total: enriched.reduce((sum, s) => sum + s.total, 0),
  };
  console.log('Demo sales plan:', summary);
  if (mode === 'preview') {
    console.table(enriched.map(s => ({ number: s.number, customer: s.customer?.name ?? 'Pelanggan umum', channel: s.channel, sku: s.sku, quantity: s.quantity, zone: s.customer?.shippingZone ?? '-', courier: s.courier ?? '-', shipping: s.shippingCost, total: s.total })));
    return;
  }
  if (mode === 'profiles') {
    await client.begin(async tx => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${plan.batch}, 0))`;
      for (const customer of plan.customers) {
        const accounts = await tx`select id, email from users where email in ${tx([customer.email, customer.previousEmail ?? customer.email])} and role='pelanggan' for update`;
        assert.equal(accounts.length, 1, `Account missing or email collision: ${customer.email}`);
        const account = accounts[0]!;
        const [scope] = await tx`select count(*)::int as count from orders where user_id=${account.id} and order_number like 'BD-SIM-2026-%'`;
        assert.ok(scope!.count > 0, 'Refusing to change an account outside this simulation batch');
        await tx`update users set name=${customer.name}, email=${customer.email}, phone=${customer.phone}, address=${customer.address}, updated_at=clock_timestamp() where id=${account.id}`;
        await tx`update orders set recipient_name=${customer.name}, recipient_phone=${customer.phone}, shipping_address=${customer.address}
          where user_id=${account.id} and channel='online' and order_number like 'BD-SIM-2026-%'`;
      }
    });
    console.log('Synchronized all five account profiles and their 20 online recipient/address snapshots.');
  }
  if (mode === 'apply') {
    const passwordHash = await bcrypt.hash('pelanggan', 12);
    await client.begin(async tx => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${plan.batch}, 0))`;
      const existing = await tx`select order_number from orders where order_number like 'BD-SIM-2026-%'`;
      if (existing.length) {
        assert.equal(existing.length, 40, 'Partial/colliding simulation batch found; refusing to duplicate or overwrite it');
        assert.deepEqual(new Set(existing.map(row => row.order_number)), new Set(plan.sales.map(sale => sale.number)));
        console.log('All 40 simulation orders already exist. Nothing inserted.');
        return;
      }
      const [admin] = await tx`select id from users where email='admin@bagdaily.com' and role='admin' and is_active=true`;
      const [cashier] = await tx`select id from users where email='kasir@bagdaily.com' and role='kasir' and is_active=true`;
      assert.ok(admin && cashier, 'Active demo admin and cashier are required');
      const allProducts = await tx<{ id: string; sku: string; name: string; price: number; stock: number; minimum_stock: number }[]>`select id, sku, name, price, stock, minimum_stock from products where sku like 'BD-%' order by sku for update`;
      const products = new Map(allProducts.map(product => [product.sku, product]));
      for (const sale of enriched) {
        const product = products.get(sale.sku);
        assert.ok(product && product.name === sale.productName && product.price === sale.unitPrice, `Catalog differs from reviewed plan: ${sale.sku}`);
      }
      const collisions = await tx`select email from users where email in ${tx(plan.customers.map(c => c.email))}`;
      assert.equal(collisions.length, 0, 'A simulation email is already in use; refusing to overwrite an account');
      const directory = new URL('../../uploads/demo-sales/', import.meta.url);
      await mkdir(directory, { recursive: true });
      await writeFile(new URL(`before-${Date.now()}.json`, directory), JSON.stringify({ batch: plan.batch, products: allProducts, summary }, null, 2));
      const customerIds = new Map<string, string>();
      for (const customer of plan.customers) {
        const id = randomUUID();
        await tx`insert into users (id, name, email, password_hash, role, phone, address, created_at, updated_at)
          values (${id}, ${customer.name}, ${customer.email}, ${passwordHash}, 'pelanggan', ${customer.phone}, ${customer.address}, '2026-09-01T00:00:00+07:00', clock_timestamp())`;
        customerIds.set(customer.key, id);
      }
      let movementTime = Date.now();
      for (const product of allProducts) {
        const sold = enriched.filter(sale => sale.sku === product.sku).reduce((sum, sale) => sum + sale.quantity, 0);
        if (!sold) continue;
        const restock = Math.max(0, sold + product.minimum_stock + 1 - product.stock);
        if (restock > 0) {
          const before = product.stock;
          product.stock += restock;
          await tx`update products set stock=${product.stock}, updated_at=clock_timestamp() where id=${product.id}`;
          await tx`insert into stock_movements (product_id, type, quantity, stock_before, stock_after, notes, created_by, created_at)
            values (${product.id}, 'restock', ${restock}, ${before}, ${product.stock}, ${`${plan.batch}: restock persiapan impor simulasi; dicatat pada waktu impor`}, ${admin.id}, ${new Date(movementTime++).toISOString()})`;
        }
      }
      for (const sale of enriched) {
        const product = products.get(sale.sku)!;
        const id = randomUUID();
        const key = randomUUID();
        const online = sale.channel === 'online';
        const customerId = sale.customerKey ? customerIds.get(sale.customerKey)! : null;
        const cash = sale.paymentMethod === 'cash' ? Math.ceil(sale.total / 50000) * 50000 : null;
        const row = {
          id, order_number: sale.number, user_id: customerId, cashier_id: online ? null : cashier.id, channel: sale.channel,
          status: 'completed', subtotal: sale.subtotal, shipping_cost: sale.shippingCost, total: sale.total,
          payment_method: sale.paymentMethod, payment_status: 'paid', delivery_method: online ? 'shipping' : 'pickup',
          courier: online ? sale.courier! : null, shipping_zone: online ? sale.customer!.shippingZone : null,
          shipping_address: online ? sale.customer!.address : null, recipient_name: online ? sale.customer!.name : null,
          recipient_phone: online ? sale.customer!.phone : null, tracking_number: online ? `SIM-RESI-${sale.number}` : null,
          payment_deadline: online ? new Date(sale.createdAt.getTime() + 15 * 60000).toISOString() : null, paid_at: sale.paidAt.toISOString(),
          cash_received: cash, change_amount: cash === null ? null : cash - sale.total,
          idempotency_key: key, request_hash: null, created_at: sale.createdAt.toISOString(), updated_at: sale.completedAt.toISOString(),
        };
        await tx`insert into orders ${tx(row)}`;
        await tx`insert into order_items (order_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, subtotal)
          values (${id}, ${product.id}, ${product.name}, ${product.sku}, ${sale.quantity}, ${sale.unitPrice}, ${sale.subtotal})`;
        await tx`insert into payment_simulations (order_id, method, idempotency_key, created_at, completed_at)
          values (${id}, ${sale.paymentMethod}, ${key}, ${sale.paidAt.toISOString()}, ${sale.paidAt.toISOString()})`;
        const before = product.stock;
        product.stock -= sale.quantity;
        assert.ok(product.stock >= 0);
        await tx`update products set stock=${product.stock}, updated_at=clock_timestamp() where id=${product.id}`;
        await tx`insert into stock_movements (product_id, type, quantity, stock_before, stock_after, notes, reference_order_id, created_by, created_at)
          values (${product.id}, 'sale', ${-sale.quantity}, ${before}, ${product.stock}, ${`${plan.batch}: impor penjualan simulasi ${sale.number}; tanggal transaksi ${sale.createdAt.toISOString()}; mutasi dicatat pada waktu impor`}, ${id}, ${online ? customerId : cashier.id}, ${new Date(movementTime++).toISOString()})`;
        const events = online ? [
          { previous: null, next: 'awaiting_payment', actor: customerId, time: sale.createdAt },
          { previous: 'awaiting_payment', next: 'awaiting_confirmation', actor: customerId, time: sale.paidAt },
          { previous: 'awaiting_confirmation', next: 'packed', actor: admin.id, time: new Date(sale.paidAt.getTime() + 15 * 60000) },
          { previous: 'packed', next: 'shipped', actor: admin.id, time: new Date(sale.paidAt.getTime() + 60 * 60000) },
          { previous: 'shipped', next: 'completed', actor: admin.id, time: sale.completedAt },
        ] : [{ previous: null, next: 'completed', actor: cashier.id, time: sale.paidAt }];
        for (const event of events) await tx`insert into order_status_history (order_id, previous_status, new_status, changed_by, created_at)
          values (${id}, ${event.previous}, ${event.next}, ${event.actor}, ${event.time.toISOString()})`;
      }
      console.log('Inserted 5 simulation accounts and 40 linked orders in one database transaction.');
    });
  }
  await verify(plan, summary);
}

async function verify(plan: Plan, expected: { merchandise: number; shipping: number; total: number }) {
  const sales = await client`select o.*, u.email, u.address as account_address, u.phone as account_phone,
    i.product_name_snapshot, i.quantity, i.unit_price
    from orders o left join users u on u.id=o.user_id join order_items i on i.order_id=o.id
    where o.order_number like 'BD-SIM-2026-%' order by o.order_number`;
  assert.equal(sales.length, 40);
  assert.equal(sales.filter(s => s.channel === 'online').length, 20);
  assert.equal(sales.filter(s => s.channel === 'pos').length, 20);
  assert.equal(sales.filter(s => s.user_id === null).length, 12);
  assert.equal(sales.reduce((sum, s) => sum + s.subtotal, 0), expected.merchandise);
  assert.equal(sales.reduce((sum, s) => sum + s.shipping_cost, 0), expected.shipping);
  assert.equal(sales.reduce((sum, s) => sum + s.total, 0), expected.total);
  const rates = await client`select courier, zone, rate from shipping_rates`;
  for (const sale of sales) {
    assert.equal(sale.status, 'completed'); assert.equal(sale.payment_status, 'paid');
    assert.equal(sale.total, sale.subtotal + sale.shipping_cost);
    assert.ok(new Date(sale.updated_at) <= new Date());
    if (sale.channel === 'online') {
      const customer = plan.customers.find(c => c.email === sale.email);
      assert.ok(customer);
      assert.equal(sale.shipping_address, customer.address); assert.equal(sale.account_address, customer.address);
      assert.equal(sale.recipient_name, customer.name);
      assert.equal(sale.recipient_phone, customer.phone); assert.equal(sale.account_phone, customer.phone);
      assert.equal(sale.shipping_zone, customer.shippingZone);
      assert.equal(sale.shipping_cost, rates.find(r => r.courier === sale.courier && r.zone === customer.shippingZone)?.rate);
      assert.ok(sale.shipping_cost > 0 && sale.tracking_number);
    } else assert.equal(sale.shipping_cost, 0);
  }
  const [integrity] = await client`select count(*)::int as items, sum(i.quantity)::int as units,
    count(*) filter (where i.subtotal=i.quantity*i.unit_price and m.quantity=-i.quantity and m.stock_after=m.stock_before-i.quantity)::int as valid
    from order_items i join orders o on o.id=i.order_id
    left join stock_movements m on m.reference_order_id=o.id and m.product_id=i.product_id
    where o.order_number like 'BD-SIM-2026-%'`;
  assert.equal(integrity!.items, 40); assert.equal(integrity!.units, 71); assert.equal(integrity!.valid, 40);
  const [payments] = await client`select count(*)::int as count from payment_simulations p join orders o on o.id=p.order_id where o.order_number like 'BD-SIM-2026-%' and p.method=o.payment_method and p.status='completed'`;
  assert.equal(payments!.count, 40);
  const [history] = await client`select count(*)::int as count from order_status_history h join orders o on o.id=h.order_id where o.order_number like 'BD-SIM-2026-%'`;
  assert.equal(history!.count, 120);
  const stocks = await client`select p.sku, p.stock, (select m.stock_after from stock_movements m where m.product_id=p.id order by m.created_at desc, m.id desc limit 1) as latest_stock from products p where p.id in (select i.product_id from order_items i join orders o on o.id=i.order_id where o.order_number like 'BD-SIM-2026-%')`;
  for (const product of stocks) { assert.ok(product.stock >= 0); assert.equal(product.stock, product.latest_stock, product.sku); }
  for (const customer of plan.customers) {
    const [account] = await client`select id, name, password_hash, address from users where email=${customer.email} and role='pelanggan' and is_active=true`;
    assert.ok(account && await bcrypt.compare('pelanggan', account.password_hash));
    assert.equal(account.address, customer.address);
    assert.equal(account.name, customer.name);
    const [count] = await client`select count(*)::int as count from orders where user_id=${account.id} and order_number like 'BD-SIM-2026-%'`;
    assert.equal(count!.count, plan.sales.filter(s => s.customerKey === customer.key).length);
  }
  console.table(plan.customers.map(c => ({ name: c.name, email: c.email, zone: c.shippingZone, password: 'pelanggan' })));
  const rupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;
  const lines = ['# Data simulasi BagDaily September–November 2026', '',
    'Batch `SIM-GTNIC-2026`: 40 transaksi, 71 tas, 20 online dengan pengiriman dan 20 POS (8 terdaftar, 12 umum). Semua selesai dan lunas. Nomor BD-SIM-2026-* menandai data demonstrasi; nama, email dan alamat tampil sederhana sesuai permintaan pengguna.', '',
    `Nilai barang ${rupiah(expected.merchandise)} + ongkir ${rupiah(expected.shipping)} = ${rupiah(expected.total)}.`, '',
    '## Akun pelanggan', '', 'Password kelima akun: `pelanggan`. Password disimpan sebagai hash bcrypt di database. Nomor telepon dan alamat di bawah adalah data simulasi.', '',
    '| Nama | Email | Telepon | Zona | Alamat |', '|---|---|---|---|---|',
    ...plan.customers.map(c => `| ${c.name} | ${c.email} | ${c.phone} | ${c.shippingZone} | ${c.address} |`), '',
    '## Transaksi terverifikasi', '', '| Nomor | Tanggal WIB | Kanal | Pelanggan | Produk | Qty | Barang | Kurir / zona | Ongkir | Total |', '|---|---|---|---|---|---:|---:|---|---:|---:|',
    ...sales.map(s => `| ${s.order_number} | ${new Date(s.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} | ${s.channel} | ${s.email ?? 'Pelanggan umum'} | ${s.product_name_snapshot} | ${s.quantity} | ${rupiah(s.subtotal)} | ${s.courier ? `${s.courier} / ${s.shipping_zone}` : '—'} | ${rupiah(s.shipping_cost)} | ${rupiah(s.total)} |`), '',
    '## Stok dan pengujian', '',
    'Penjualan historis dicatat pada tanggal transaksi. Mutasi inventaris dicatat saat impor, dengan catatan batch dan nomor transaksi; riwayat stok lama tidak ditulis ulang. Restock persiapan hanya ditambahkan bila dibutuhkan untuk menutup penjualan simulasi dan menyisakan stok di atas batas minimum. Setiap penjualan memiliki satu mutasi pengurangan stok yang terhubung ke order.', '',
    'Dari backend/: `npm run demo:sales` untuk pratinjau, `npm run demo:sales -- --apply` untuk impor idempoten, dan `npm run demo:sales -- --check` untuk verifikasi baca saja. Impor ulang tidak menggandakan transaksi atau mereset password.', '',
    'Untuk memeriksa semua bulan di dashboard/laporan, pilih rentang 1 September–4 November 2026. Rentang bawaan web hanya 30 hari terakhir. Nilai laporan seluruh toko juga mencakup transaksi lama di luar batch ini.'];
  await writeFile(new URL('../../../database/demo/README.md', import.meta.url), `${lines.join('\n')}\n`);
  console.log('PASS: 40 orders / 71 units / 5 logins, 20 address-matched shipping rates, payments, 120 history events, account relationships and stock ledger.');
}
