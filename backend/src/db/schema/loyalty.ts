import { sql } from 'drizzle-orm';
import { bigint, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { orders } from './orders.js';

export const loyaltyAccounts = pgTable('loyalty_accounts', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  reserved: bigint('reserved', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({ valid: check('loyalty_balance_valid', sql`${t.balance} >= 0 and ${t.reserved} >= 0 and ${t.reserved} <= ${t.balance} and ${t.balance} <= 9007199254740991`) })).enableRLS();

export const loyaltyLedger = pgTable('loyalty_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => loyaltyAccounts.userId, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  orderNumber: text('order_number').notNull(),
  kind: text('kind').notNull(),
  points: integer('points').notNull(),
  balanceDelta: integer('balance_delta').notNull(),
  reservedDelta: integer('reserved_delta').notNull(),
  balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
  reservedAfter: bigint('reserved_after', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ({
  orderKind: uniqueIndex('loyalty_order_kind_unique').on(t.orderId, t.kind),
  customer: index('loyalty_customer_idx').on(t.userId, t.createdAt),
  valid: check('loyalty_entry_valid', sql`${t.points} >= 0 and ${t.kind} in ('earn','reserve','redeem','release') and ${t.balanceAfter} >= 0 and ${t.reservedAfter} >= 0 and ${t.reservedAfter} <= ${t.balanceAfter}`),
  delta: check('loyalty_delta_valid', sql`(${t.kind}='earn' and ${t.balanceDelta}=${t.points} and ${t.reservedDelta}=0) or (${t.kind}='reserve' and ${t.balanceDelta}=0 and ${t.reservedDelta}=${t.points}) or (${t.kind}='redeem' and ${t.balanceDelta}=-${t.points} and ${t.reservedDelta} in (0,-${t.points})) or (${t.kind}='release' and ${t.balanceDelta}=0 and ${t.reservedDelta}=-${t.points})`),
})).enableRLS();
