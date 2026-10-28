import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { categories } from './categories.js';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  material: text('material').notNull(),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  minimumStock: integer('minimum_stock').notNull().default(5),
  imagePath: text('image_path'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  stockCheck: check('product_stock_nonnegative', sql`${t.stock} >= 0`),
  priceCheck: check('product_price_positive', sql`${t.price} > 0`),
  minimumCheck: check('product_minimum_nonnegative', sql`${t.minimumStock} >= 0`),
  categoryIndex: index('products_category_idx').on(t.categoryId),
}));
