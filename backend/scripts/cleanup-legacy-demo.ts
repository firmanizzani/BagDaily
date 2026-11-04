// Explicit maintenance requested by the owner: three exact orders + one price correction.
// Inventory history is preserved; deleted paid sales receive balancing stock corrections.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { client } from '../src/db/index.js';

const targets = [
  { id: 'dc01b9df-f2af-40c4-98a9-1f4343548809', number: 'BD-85967d92-b112-40e5-bc4b-0818d5998ebc', total: 344000 },
  { id: 'e63b6fb4-2af5-46e8-a118-cad8abc21bb9', number: 'BD-50239326-e119-4e8b-b7f6-1cf09fbf3fa2', total: 254000 },
  { id: 'e3525150-ccbc-45f8-bf8d-ba6a92dc3f0e', number: 'BD-cd0b2106-97de-4630-9699-c6d10316a69d', total: 169000 },
];
const repriceId = '4dd8141a-d7e6-49ad-9daa-03a331a455d7';
const ids = targets.map(target => target.id);
try {
  if (!process.argv.includes('--apply')) {
    console.table(await client`select id, order_number, status, payment_status, total from orders where id in ${client([...ids, repriceId])}`);
    console.log('Preview only. Use --apply for the explicitly requested cleanup.');
  } else {
    await client.begin(async tx => {
      await tx`select pg_advisory_xact_lock(hashtextextended('cleanup-legacy-demo-2026-11-04', 0))`;
      const orders = await tx`select * from orders where id in ${tx([...ids, repriceId])} order by id for update`;
      const items = await tx`select * from order_items where order_id in ${tx([...ids, repriceId])}`;
      const movements = await tx`select * from stock_movements where reference_order_id in ${tx(ids)} order by product_id`;
      const payments = await tx`select * from payment_simulations where order_id in ${tx([...ids, repriceId])}`;
      const history = await tx`select * from order_status_history where order_id in ${tx([...ids, repriceId])}`;
      const productIds = [...new Set(items.map(item => item.product_id))];
      const products = await tx`select id, name, sku, stock, price from products where id in ${tx(productIds)} order by id for update`;
      const [admin] = await tx`select id from users where email='admin@bagdaily.com' and role='admin'`;
      assert.ok(admin);
      const directory = new URL('../uploads/maintenance/', import.meta.url);
      await mkdir(directory, { recursive: true });
      await writeFile(new URL(`legacy-before-${Date.now()}.json`, directory), JSON.stringify({ orders, items, payments, movements, history, products }, null, 2));
      for (const target of targets) {
        const order = orders.find(row => row.id === target.id);
        if (!order) { console.log(`Already absent: ${target.number}`); continue; }
        assert.equal(order.order_number, target.number); assert.equal(order.total, target.total); assert.equal(order.channel, 'online');
        const sales = movements.filter(row => row.reference_order_id === order.id && row.type === 'sale');
        const orderItems = items.filter(row => row.order_id === order.id);
        if (order.payment_status === 'unpaid') assert.equal(sales.length, 0, 'Unpaid order unexpectedly deducted stock');
        else {
          assert.equal(sales.length, orderItems.length);
          for (const sale of sales) {
            const item = orderItems.find(row => row.product_id === sale.product_id);
            assert.ok(item); assert.equal(sale.quantity, -item.quantity);
            const [product] = await tx`update products set stock=stock+${item.quantity}, updated_at=clock_timestamp() where id=${item.product_id} returning stock`;
            await tx`insert into stock_movements (product_id, type, quantity, stock_before, stock_after, notes, created_by, idempotency_key)
              values (${item.product_id}, 'correction', ${item.quantity}, ${product.stock-item.quantity}, ${product.stock}, ${`Pemulihan stok setelah penghapusan pesanan ${order.order_number} sesuai permintaan pemilik; riwayat penjualan lama dipertahankan`}, ${admin.id}, ${randomUUID()})`;
          }
        }
        await tx`update stock_movements set reference_order_id=null, notes=notes || ${` | Pesanan ${order.order_number} dihapus atas permintaan pemilik; stok dipulihkan melalui koreksi terpisah.`} where reference_order_id=${order.id}`;
        await tx`delete from payment_simulations where order_id=${order.id}`;
        await tx`delete from order_status_history where order_id=${order.id}`;
        await tx`delete from order_items where order_id=${order.id}`;
        await tx`delete from orders where id=${order.id}`;
        console.log(`Removed ${order.order_number}; paid item stock restored where applicable.`);
      }
      const order = orders.find(row => row.id === repriceId);
      assert.ok(order && order.order_number === 'BD-b97d4f51-4557-47e5-a358-5759c48f764e');
      const [owner] = await tx`select email from users where id=${order.user_id}`;
      assert.equal(owner.email, 'demo@bagdaily.com');
      const item = items.find(row => row.order_id === repriceId && row.sku_snapshot === 'BD-SLG-003');
      assert.ok(item && [279000, 230000].includes(item.unit_price));
      const product = products.find(row => row.id === item.product_id);
      assert.ok(product); assert.equal(product.price, 230000);
      await tx`update order_items set unit_price=${product.price}, subtotal=quantity*${product.price} where id=${item.id}`;
      const [amount] = await tx`select sum(subtotal)::int as subtotal from order_items where order_id=${repriceId}`;
      await tx`update orders set subtotal=${amount.subtotal}, total=${amount.subtotal}+shipping_cost,
        change_amount=case when payment_method='cash' and cash_received is not null then cash_received-(${amount.subtotal}+shipping_cost) else change_amount end,
        updated_at=clock_timestamp() where id=${repriceId}`;
      console.log('Repriced the existing Kiro item to Rp230000; shipping unchanged at Rp15000, total Rp245000.');
    });
    const [remaining] = await client`select count(*)::int as count from orders where id in ${client(ids)}`;
    assert.equal(remaining.count, 0);
    const [batch] = await client`select count(*)::int as count, sum(total)::int as total from orders where order_number like 'BD-SIM-2026-%'`;
    assert.equal(batch.count, 40); assert.equal(batch.total, 15018000);
    const [repriced] = await client`select o.subtotal, o.shipping_cost, o.total, i.unit_price from orders o join order_items i on i.order_id=o.id where o.id=${repriceId} and i.sku_snapshot='BD-SLG-003'`;
    assert.equal(repriced.unit_price, 230000); assert.equal(repriced.total, 245000);
    console.log('PASS: requested orders absent, 40-order batch preserved, Kiro item and total corrected.');
    console.table(await client`select name,stock from products where sku in ('BD-TTB-006','BD-RNS-004','BD-SLG-003') order by name`);
    console.table(await client`select count(*)::int as transactions,sum(total)::int as revenue from orders where payment_status='paid'`);
  }
} finally { await client.end({ timeout: 5 }); }
