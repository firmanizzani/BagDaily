import { eq, sql } from 'drizzle-orm';
import { products, stockMovements } from '../../db/schema/index.js';
import { conflict } from '../../utils/errors.js';
import { hashObject } from '../../utils/misc.js';
import type { AdjustmentInput } from '../../utils/validation.js';
import { transaction } from '../orders/service.js';

export async function adjust(actor: string, key: string, input: AdjustmentInput) {
  const requestHash = hashObject({ actor, ...input });
  return transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
    const [previous] = await tx.select().from(stockMovements).where(eq(stockMovements.idempotencyKey, key));
    if (previous) {
      if (previous.requestHash !== requestHash) {
        conflict('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different request');
      }
      return previous;
    }
    const [current] = await tx.select().from(products).where(eq(products.id, input.productId)).for('update');
    if (!current) conflict('INVALID_STOCK', 'Produk tidak ditemukan.');
    if (input.expectedStock !== undefined && current.stock !== input.expectedStock) {
      conflict('STOCK_CHANGED', 'Stok telah berubah. Tutup formulir dan perbarui data sebelum menyesuaikan stok.');
    }
    const quantity = input.targetStock !== undefined ? input.targetStock - current.stock : input.quantity!;
    const stockAfter = current.stock + quantity;
    if (quantity === 0) conflict('STOCK_UNCHANGED', 'Stok akhir sama dengan stok saat ini. Tidak ada perubahan untuk disimpan.');
    if (stockAfter < 0 || stockAfter > 2147483647) conflict('INVALID_STOCK', 'Hasil penyesuaian stok di luar batas yang diizinkan.');
    const [product] = await tx.update(products).set({
      stock: stockAfter,
      updatedAt: new Date(),
    }).where(eq(products.id, input.productId)).returning();
    if (!product) conflict('INVALID_STOCK', 'Product missing or adjustment outside stock limits');
    const [movement] = await tx.insert(stockMovements).values({
      productId: input.productId,
      type: input.type,
      quantity,
      stockBefore: current.stock,
      stockAfter: product.stock,
      notes: input.notes,
      createdBy: actor,
      idempotencyKey: key,
      requestHash,
    }).returning();
    return movement;
  });
}
