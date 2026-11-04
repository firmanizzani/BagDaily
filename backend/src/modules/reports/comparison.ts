import { db } from '../../db/index.js';
import { orders } from '../../db/schema/index.js';
import { sql } from 'drizzle-orm';
import { paidRange } from './range.js';
import { comparisonRange } from './comparison-rules.js';

export async function periodComparison(range: {from?:Date;to?:Date;channel?:string;compare?:'day'|'week'|'month'|'period'}) {
 const previous=comparisonRange(range);
 if(!previous)return null;
 const [totals]=await db.select({
  netProductSales:sql<number>`coalesce(sum(${orders.total}::bigint-${orders.shippingCost}),0)::bigint`.mapWith(Number),
  totalPaid:sql<number>`coalesce(sum(${orders.total}),0)::bigint`.mapWith(Number),
  totalTransactions:sql<number>`count(*)::int`,
  totalProductsSold:sql<number>`coalesce(sum((select coalesce(sum(i.quantity),0) from order_items i where i.order_id="orders"."id")),0)::bigint`.mapWith(Number),
  completedNet:sql<number>`coalesce(sum(case when ${orders.status}='completed' then ${orders.total}::bigint-${orders.shippingCost} else 0 end),0)::bigint`.mapWith(Number),
  completedCost:sql<number>`coalesce(sum(case when ${orders.status}='completed' then (select coalesce(sum(i.unit_cost::bigint*i.quantity),0) from order_items i where i.order_id="orders"."id") else 0 end),0)::bigint`.mapWith(Number),
  missingCost:sql<number>`coalesce(sum(case when ${orders.status}='completed' then (select count(*) from order_items i where i.order_id="orders"."id" and i.unit_cost is null) else 0 end),0)::bigint`.mapWith(Number),
 }).from(orders).where(paidRange(previous));
 return {kind:range.compare??'month',from:previous.from.toISOString(),to:previous.to.toISOString(),metrics:{
  netProductSales:totals.netProductSales,totalTransactions:totals.totalTransactions,totalProductsSold:totals.totalProductsSold,
  averagePayment:totals.totalTransactions?Math.round(totals.totalPaid/totals.totalTransactions):0,
  profit:totals.missingCost?null:totals.completedNet-totals.completedCost,
 }};
}
