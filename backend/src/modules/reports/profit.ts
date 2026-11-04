import { periodComparison } from './comparison.js';
import { profitFigures } from './profit-rules.js';
import { Router } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { orders } from '../../db/schema/index.js';
import { asyncRoute as a } from '../../utils/async.js';
import { paginated } from '../../utils/response.js';
import { pageSchema } from '../../utils/validation.js';
import { paidRange, rangeSchema } from '../dashboard/index.js';

async function report(query: unknown, exporting = false) {
 const range=rangeSchema.parse(query);
 const paging=pageSchema.parse(query);
 const completed=and(paidRange(range),eq(orders.status,'completed'));
 const perOrder=db.select({id:orders.id,orderNumber:orders.orderNumber,channel:orders.channel,paidAt:orders.paidAt,
  merchandise:orders.subtotal,pointsDiscount:orders.pointsRedeemed,totalPaid:orders.total,shipping:orders.shippingCost,
  netSales:sql<number>`(${orders.total}::bigint - ${orders.shippingCost})`.mapWith(Number).as('net_sales'),
  cost:sql<number>`(select coalesce(sum(i.unit_cost::bigint*i.quantity),0) from order_items i where i.order_id="orders"."id")`.mapWith(Number).as('cost'),
  missing:sql<number>`(select coalesce(sum(i.quantity),0) from order_items i where i.order_id="orders"."id" and i.unit_cost is null)`.mapWith(Number).as('missing'),
  estimated:sql<number>`(select coalesce(sum(i.quantity),0) from order_items i where i.order_id="orders"."id" and i.cost_is_estimated)`.mapWith(Number).as('estimated'),
 }).from(orders).where(completed).as('sale_costs');
 const [totals]=await db.select({
  totalPaid:sql<number>`coalesce(sum(${perOrder.totalPaid}),0)::bigint`.mapWith(Number),
  shipping:sql<number>`coalesce(sum(${perOrder.shipping}),0)::bigint`.mapWith(Number),
  transactions:sql<number>`count(*)::int`,
  merchandise:sql<number>`coalesce(sum(${perOrder.merchandise}),0)::bigint`.mapWith(Number),
  pointsDiscount:sql<number>`coalesce(sum(${perOrder.pointsDiscount}),0)::bigint`.mapWith(Number),
  netSales:sql<number>`coalesce(sum(${perOrder.netSales}),0)::bigint`.mapWith(Number),
  cost:sql<number>`coalesce(sum(${perOrder.cost}),0)::bigint`.mapWith(Number),
  missingCostUnits:sql<number>`coalesce(sum(${perOrder.missing}),0)::bigint`.mapWith(Number),
  estimatedCostUnits:sql<number>`coalesce(sum(${perOrder.estimated}),0)::bigint`.mapWith(Number),
 }).from(perOrder);
 const [pending]=await db.select({transactions:sql<number>`count(*)::int`}).from(orders).where(and(paidRange(range),sql`${orders.status} not in ('completed','cancelled')`));
 if(exporting && totals.transactions>10000) return null;
 const rows=await db.select().from(perOrder).orderBy(desc(perOrder.paidAt),desc(perOrder.id)).limit(exporting?10000:paging.limit).offset(exporting?0:(paging.page-1)*paging.limit);
 return {...paginated(rows.map(row=>({...row,...profitFigures(row.netSales,row.cost,row.missing)})),totals.transactions,paging.page,paging.limit),profitSummary:{comparison:exporting?null:await periodComparison(range),...totals,...profitFigures(totals.netSales,totals.cost,totals.missingCostUnits),pendingTransactions:pending.transactions}};
}
const router=Router();
router.get('/',a(async(req,res)=>{res.json(await report(req.query));}));
router.get('/export',a(async(req,res)=>{
 const result=await report(req.query,true);
 if(!result){res.status(422).json({error:{message:'Maksimal 10.000 transaksi. Persempit periode laporan.'}});return;}
 const esc=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
 const header=['order_number','channel','paid_at','total_paid','shipping','merchandise','points_discount','net_goods_sales','cost_of_goods','gross_profit','margin_percent','estimated_cost_units','missing_cost_units'];
 const csv=[header.join(','),...result.data.map(row=>[row.orderNumber,row.channel,row.paidAt?.toISOString(),row.totalPaid,row.shipping,row.merchandise,row.pointsDiscount,row.netSales,row.cost,row.profit,row.marginPercent,row.estimated,row.missing].map(esc).join(','))].join('\n');
 res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="bagdaily-profit.csv"');res.send(csv);
}));
export default router;
