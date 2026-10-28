import { and, eq, sql } from 'drizzle-orm';
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
    const [product] = await tx.update(products).set({
      stock: sql`${products.stock} + ${input.quantity}`,
      updatedAt: new Date(),
    }).where(and(
      eq(products.id, input.productId),
      sql`${products.stock}::bigint + ${input.quantity} between 0 and 2147483647`,
    )).returning();
    if (!product) conflict('INVALID_STOCK', 'Product missing or adjustment outside stock limits');
    const [movement] = await tx.insert(stockMovements).values({
      productId: input.productId,
      type: input.type,
      quantity: input.quantity,
      stockBefore: product.stock - input.quantity,
      stockAfter: product.stock,
      notes: input.notes,
      createdBy: actor,
      idempotencyKey: key,
      requestHash,
    }).returning();
    return movement;
  });
}
