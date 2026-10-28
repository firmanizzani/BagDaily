import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const shippingRates = pgTable('shipping_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  courier: text('courier').notNull(),
  zone: text('zone').notNull(),
  rate: integer('rate').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pair: uniqueIndex('shipping_pair').on(t.courier, t.zone),
  rateCheck: check('shipping_rate_nonnegative', sql`${t.rate} >= 0`),
  courierCheck: check('shipping_courier_valid', sql`${t.courier} in ('JNE','J&T','SiCepat')`),
  zoneCheck: check('shipping_zone_valid', sql`${t.zone} in ('Jabodetabek','Jawa','Luar Jawa')`),
}));
