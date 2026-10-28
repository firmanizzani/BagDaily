import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
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
  subtotal: integer('subtotal').notNull(),
}, (t) => ({
  item: uniqueIndex('order_product_unique').on(t.orderId, t.productId),
  values: check('item_values_valid', sql`${t.quantity} > 0 and ${t.unitPrice} > 0 and ${t.subtotal} = ${t.quantity} * ${t.unitPrice}`),
}));
