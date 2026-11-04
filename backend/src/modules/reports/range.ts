import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { orders } from '../../db/schema/index.js';

export const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  channel: z.enum(['online', 'pos']).optional(),
  all: z.enum(['true']).optional(),
  compare: z.enum(['day', 'week', 'month', 'period']).default('month'),
}).superRefine((value, ctx) => {
  if (value.all && (value.from || value.to)) ctx.addIssue({ code: 'custom', message: 'All time cannot include date bounds' });
  if (value.from && value.to && value.from >= value.to) ctx.addIssue({ code: 'custom', message: 'End date must be after start date' });
}).transform((v) => {
  if (v.all) return { from: undefined, to: undefined, channel: v.channel, compare: v.compare };
  const to = v.to ?? new Date();
  const from = v.from ?? new Date(to.getTime() - 30 * 86400000);
  return { from, to, channel: v.channel, compare: v.compare };
});

export function paidRange(v: { from?: Date; to?: Date; channel?: string }) {
  const cond = [
    eq(orders.paymentStatus, sql.raw(`'paid'`)),
  ];
  if (v.from) cond.push(gte(orders.paidAt, v.from));
  if (v.to) cond.push(lt(orders.paidAt, v.to));
  if (v.channel) cond.push(eq(orders.channel, v.channel));
  return and(...cond)!;
}
