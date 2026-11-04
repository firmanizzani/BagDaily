import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { products } from './products.js';

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  productNameSnapshot: text('product_name_snapshot').notNull(),
  skuSnapshot: text('sku_snapshot').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
  unitCost: integer('unit_cost'),
  costIsEstimated: boolean('cost_is_estimated').notNull().default(false),
  subtotal: integer('subtotal').notNull(),
}, (t) => ({
  item: uniqueIndex('order_product_unique').on(t.orderId, t.productId),
  costCheck: check('item_cost_nonnegative', sql`${t.unitCost} is null or ${t.unitCost} >= 0`),
  values: check('item_values_valid', sql`${t.quantity} > 0 and ${t.unitPrice} > 0 and ${t.subtotal} = ${t.quantity} * ${t.unitPrice}`),
}));
