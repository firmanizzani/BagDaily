import { describe, it, expect, beforeAll } from 'vitest';
import postgres from 'postgres';

const dbUrl = process.env['DATABASE_URL'];
const hasDb = Boolean(dbUrl && !dbUrl.includes('your-project'));

describe.skipIf(!hasDb)('Live DB Concurrency Test: First Successful Payment Wins', () => {
  let sqlClient: postgres.Sql;

  beforeAll(async () => {
    sqlClient = postgres(dbUrl!, { max: 5, ssl: 'require' });
  });

  it('allows exactly 1 payment when 2 buyers race for 1 stock unit', async () => {
    const testSku = `CONCUR-TEST-${Date.now()}`;
    const [cat] = await sqlClient`select id from categories limit 1`;
    const [product] = await sqlClient`
      insert into products (category_id, sku, name, slug, description, material, price, stock, minimum_stock)
      values (${cat.id}, ${testSku}, 'Race Bag', ${'race-bag-' + Date.now()}, 'Test', 'Canvas', 100000, 1, 0)
      returning id
    `;
    const [userA] = await sqlClient`select id from users where role = 'pelanggan' limit 1`;
    const [orderA] = await sqlClient`
      insert into orders (order_number, user_id, channel, status, subtotal, shipping_cost, total, delivery_method, payment_deadline)
      values (${'RACE-A-' + Date.now()}, ${userA.id}, 'online', 'awaiting_payment', 100000, 0, 100000, 'pickup', now() + interval '15 minutes')
      returning id
    `;
    const [orderB] = await sqlClient`
      insert into orders (order_number, user_id, channel, status, subtotal, shipping_cost, total, delivery_method, payment_deadline)
      values (${'RACE-B-' + Date.now()}, ${userA.id}, 'online', 'awaiting_payment', 100000, 0, 100000, 'pickup', now() + interval '15 minutes')
      returning id
    `;
    await sqlClient`insert into order_items (order_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, subtotal) values (${orderA.id}, ${product.id}, 'Race Bag', ${testSku}, 1, 100000, 100000)`;
    await sqlClient`insert into order_items (order_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, subtotal) values (${orderB.id}, ${product.id}, 'Race Bag', ${testSku}, 1, 100000, 100000)`;

    const attemptPay = async (orderId: string, payKey: string) => {
      try {
        await sqlClient.begin(async tx => {
          const [updated] = await tx`
            update products set stock = stock - 1, updated_at = now()
            where id = ${product.id} and is_active = true and stock >= 1
            returning stock
          `;
          if (!updated) throw new Error('INSUFFICIENT_STOCK');
          await tx`insert into stock_movements (product_id, type, quantity, stock_before, stock_after, notes, reference_order_id) values (${product.id}, 'sale', -1, ${updated.stock + 1}, ${updated.stock}, 'Race pay', ${orderId})`;
          await tx`insert into payment_simulations (order_id, method, idempotency_key) values (${orderId}, 'qris', ${payKey})`;
          await tx`update orders set status = 'awaiting_confirmation', payment_status = 'paid', payment_method = 'qris', paid_at = now() where id = ${orderId}`;
        });
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: (err as Error).message };
      }
    };

    const keyA = 'a0000000-0000-0000-0000-000000000001';
    const keyB = 'b0000000-0000-0000-0000-000000000002';
    const [resA, resB] = await Promise.all([attemptPay(orderA.id, keyA), attemptPay(orderB.id, keyB)]);

    const wins = [resA, resB].filter(r => r.success).length;
    const fails = [resA, resB].filter(r => !r.success).length;
    expect(wins).toBe(1);
    expect(fails).toBe(1);

    const [finalProduct] = await sqlClient`select stock from products where id = ${product.id}`;
    expect(finalProduct.stock).toBe(0);

    const movements = await sqlClient`select count(*)::int as c from stock_movements where product_id = ${product.id}`;
    expect(movements[0].c).toBe(1);

    await sqlClient`delete from payment_simulations where order_id in (${orderA.id}, ${orderB.id})`;
    await sqlClient`delete from stock_movements where product_id = ${product.id}`;
    await sqlClient`delete from order_items where order_id in (${orderA.id}, ${orderB.id})`;
    await sqlClient`delete from orders where id in (${orderA.id}, ${orderB.id})`;
    await sqlClient`delete from products where id = ${product.id}`;
  });
});
