import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const statusEnum = pgEnum('order_status', [
  'awaiting_payment',
  'awaiting_confirmation',
  'confirmed',
  'packed',
  'shipped',
  'completed',
  'cancelled',
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(),
  userId: uuid('user_id').references(() => users.id),
  cashierId: uuid('cashier_id').references(() => users.id),
  channel: text('channel').notNull(),
  status: statusEnum('status').notNull().default('awaiting_payment'),
  subtotal: integer('subtotal').notNull(),
  shippingCost: integer('shipping_cost').notNull().default(0),
  total: integer('total').notNull(),
  paymentMethod: text('payment_method'),
  paymentStatus: text('payment_status').notNull().default('unpaid'),
  deliveryMethod: text('delivery_method').notNull(),
  courier: text('courier'),
  shippingZone: text('shipping_zone'),
  shippingAddress: text('shipping_address'),
  recipientName: text('recipient_name'),
  recipientPhone: text('recipient_phone'),
  trackingNumber: text('tracking_number').unique(),
  paymentDeadline: timestamp('payment_deadline', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  cashReceived: integer('cash_received'),
  changeAmount: integer('change_amount'),
  idempotencyKey: uuid('idempotency_key').unique(),
  requestHash: text('request_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  money: check('order_money_valid', sql`${t.subtotal} > 0 and ${t.shippingCost} >= 0 and ${t.total} = ${t.subtotal} + ${t.shippingCost}`),
  channel: check('order_channel_valid', sql`${t.channel} in ('online','pos')`),
  payment: check('order_payment_valid', sql`${t.paymentStatus} in ('unpaid','paid') and ((${t.paymentStatus} = 'paid' and ${t.paidAt} is not null) or (${t.paymentStatus} = 'unpaid' and ${t.paidAt} is null))`),
  delivery: check('order_delivery_valid', sql`${t.deliveryMethod} in ('shipping','pickup') and (${t.deliveryMethod} != 'pickup' or (${t.shippingCost} = 0 and ${t.courier} is null and ${t.trackingNumber} is null))`),
  owner: index('orders_user_idx').on(t.userId),
  deadline: index('orders_deadline_idx').on(t.status, t.paymentDeadline),
  paid: index('orders_paid_idx').on(t.paidAt),
}));
