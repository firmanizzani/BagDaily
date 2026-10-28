import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { products } from './products.js';
import { users } from './users.js';

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull(),
  stockBefore: integer('stock_before').notNull(),
  stockAfter: integer('stock_after').notNull(),
  notes: text('notes').notNull(),
  referenceOrderId: uuid('reference_order_id').references(() => orders.id),
  createdBy: uuid('created_by').references(() => users.id),
  idempotencyKey: uuid('idempotency_key').unique(),
  requestHash: text('request_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  saleUnique: uniqueIndex('movement_order_product_unique').on(t.referenceOrderId, t.productId),
  values: check('movement_values_valid', sql`${t.stockBefore} >= 0 and ${t.stockAfter} >= 0 and ${t.stockAfter} = ${t.stockBefore} + ${t.quantity} and ${t.quantity} != 0`),
  typeCheck: check('movement_type_valid', sql`${t.type} in ('sale','restock','correction') and (${t.type} != 'sale' or ${t.quantity} < 0) and (${t.type} != 'restock' or ${t.quantity} > 0)`),
  product: index('movement_product_idx').on(t.productId, t.createdAt),
}));
