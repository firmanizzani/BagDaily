import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { orders, statusEnum } from './orders.js';
import { users } from './users.js';

export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  previousStatus: statusEnum('previous_status'),
  newStatus: statusEnum('new_status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  order: index('history_order_idx').on(t.orderId),
}));

export const history = orderStatusHistory;
