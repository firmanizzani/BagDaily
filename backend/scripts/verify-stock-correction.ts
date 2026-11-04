import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { client, db } from '../src/db/index.js';
import { categories, products, stockMovements, users } from '../src/db/schema/index.js';
import { adjust } from '../src/modules/inventory/service.js';

// Isolated disposable product; never alters existing catalog stock.
const id = randomUUID();
try {
  const [category] = await db.select().from(categories).limit(1);
  const [actor] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  assert(category && actor);
  await db.insert(products).values({ id, categoryId: category.id, sku: `QA-${id}`, slug: `qa-${id}`, name: 'QA stock correction', description: 'Disposable verification fixture', material: 'QA', price: 1000, stock: 13, isActive: false });
  const key = randomUUID();
  const input = { productId: id, type: 'correction' as const, targetStock: 3, expectedStock: 13, notes: 'QA: set stock to 3' };
  const first = await adjust(actor.id, key, input);
  assert.equal(first.stockBefore, 13);
  assert.equal(first.stockAfter, 3);
  assert.equal(first.quantity, -10);
  assert.equal((await adjust(actor.id, key, input)).id, first.id);
  await assert.rejects(adjust(actor.id, randomUUID(), { ...input, targetStock: 2 }), /Stok telah berubah/);
  const restock = await adjust(actor.id, randomUUID(), { productId: id, type: 'restock', quantity: 4, notes: 'QA: add 4' });
  assert.equal(restock.stockAfter, 7);
  const results = await Promise.allSettled([1, 2].map(targetStock => adjust(actor.id, randomUUID(), { ...input, expectedStock: 7, targetStock })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const [current] = await db.select().from(products).where(eq(products.id, id));
  const zero = await adjust(actor.id, randomUUID(), { ...input, expectedStock: current.stock, targetStock: 0 });
  assert.equal(zero.stockAfter, 0);
  await assert.rejects(adjust(actor.id, randomUUID(), { ...input, expectedStock: 0, targetStock: 0 }), /Tidak ada perubahan/);
  const movements = await db.select().from(stockMovements).where(eq(stockMovements.productId, id));
  assert.equal(movements.length, 4);
  console.log('PASS: absolute correction, zero stock, restock, retry, stale-stock protection, concurrency and movement history.');
} finally {
  await db.delete(stockMovements).where(eq(stockMovements.productId, id));
  await db.delete(products).where(eq(products.id, id));
  await client.end();
}
