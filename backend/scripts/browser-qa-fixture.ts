// Temporary real-database fixture for browser QA. Never used by application code.
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { client } from '../src/db/index.js';

const statePath = new URL('../../.qa-session.json', import.meta.url);
const mode = process.argv[2];
try {
  if (mode === 'prepare') {
    try { await readFile(statePath); throw new Error('An existing QA session must be cleaned up first.'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const id = randomUUID();
    const sku = `QA-BROWSER-${id}`;
    const [category] = await client`select id from categories order by id limit 1`;
    if (!category) throw new Error('Seed a catalog category first');
    const [product] = await client`insert into products (id, category_id, sku, slug, name, description, material, price, stock, minimum_stock)
      values (${id}, ${category.id}, ${sku}, ${`qa-browser-${id}`}, 'Tas Uji Alur BagDaily', 'Data QA sementara untuk pengujian browser; akan dihapus setelah selesai.', 'Kanvas', 100000, 6, 5)
      returning id, slug, name, sku, stock`;
    await writeFile(statePath, JSON.stringify(product, null, 2));
    console.log('Created disposable browser fixture:', product);
  } else {
    const fixture = JSON.parse(await readFile(statePath, 'utf8')) as { id: string; sku: string };
    const [product] = await client`select id, sku from products where id=${fixture.id}`;
    if (!product || product.sku !== fixture.sku || !product.sku.startsWith('QA-BROWSER-')) throw new Error('QA fixture identity mismatch; refusing to mutate data.');
    if (mode === 'expire') {
      const rows = await client`update orders set payment_deadline=clock_timestamp()+interval '10 seconds'
        where id in (select order_id from order_items where product_id=${fixture.id}) and status='awaiting_payment' and payment_status='unpaid'
        returning id, status, payment_deadline`;
      console.log('Shortened only the QA unpaid order deadlines:', rows);
    } else if (mode === 'inspect') {
      console.log('Fixture stock:', await client`select name, stock, minimum_stock from products where id=${fixture.id}`);
      console.log('Fixture orders:', await client`select id, status, payment_status, channel, total from orders where id in (select order_id from order_items where product_id=${fixture.id}) order by created_at`);
      console.log('Fixture movements:', await client`select type, quantity, stock_before, stock_after from stock_movements where product_id=${fixture.id} order by created_at`);
    } else if (mode === 'cleanup') {
      await client.begin(async tx => {
        const ids = await tx`select distinct order_id from order_items where product_id=${fixture.id}`;
        for (const { order_id: orderId } of ids) {
          const [scope] = await tx`select count(*)::int as count from order_items where order_id=${orderId} and product_id<>${fixture.id}`;
          if (scope.count) throw new Error('QA order also contains a non-QA product; refusing cleanup.');
          await tx`delete from payment_simulations where order_id=${orderId}`;
          await tx`delete from order_status_history where order_id=${orderId}`;
          await tx`delete from stock_movements where reference_order_id=${orderId}`;
          await tx`delete from order_items where order_id=${orderId}`;
          await tx`delete from orders where id=${orderId}`;
        }
        await tx`delete from stock_movements where product_id=${fixture.id}`;
        await tx`delete from products where id=${fixture.id} and sku=${fixture.sku}`;
      });
      await unlink(statePath);
      console.log('Removed the verified QA product and its transactions; catalog products and real transactions preserved.');
    } else throw new Error('Use prepare, inspect, expire, or cleanup');
  }
} finally { await client.end({ timeout: 5 }); }
