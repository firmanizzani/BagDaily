import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';

export const paymentSimulations = pgTable('payment_simulations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().unique().references(() => orders.id),
  method: text('method').notNull(),
  status: text('status').notNull().default('completed'),
  idempotencyKey: uuid('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  valid: check('payment_values_valid', sql`${t.status} = 'completed' and ${t.method} in ('cash','bank_transfer','qris','debit','credit')`),
}));

export const payments = paymentSimulations;
