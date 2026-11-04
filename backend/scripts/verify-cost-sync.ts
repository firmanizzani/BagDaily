import assert from 'node:assert/strict';
import {client} from '../src/db/index.js';
try{
const [stats]=await client`select count(*)::int as products,min(cost_price)::int as min_cost,max(cost_price)::int as max_cost,min(price-cost_price)::int as min_profit,max(price-cost_price)::int as max_profit from products where sku like 'BD-%'`;
const [orders]=await client`select count(*)::int as count,sum(total)::bigint as total from orders where payment_status='paid'`;
const [items]=await client`select sum(quantity)::int as units,count(*)::int as item_rows,count(*) filter(where unit_cost is null)::int as missing from order_items i join orders o on o.id=i.order_id where o.payment_status='paid'`;
const [qa]=await client`select count(*)::int as count from users where email like 'qa-profit-%@example.test'`;
assert.equal(stats.products,18);assert.equal(stats.min_profit,30000);assert.equal(stats.max_profit,85000);assert.equal(items.missing,0);assert.equal(qa.count,0);assert.equal(orders.count,43);assert.equal(Number(orders.total),15601000);assert.equal(items.units,74);
console.log(JSON.stringify({catalog:stats,paidOrders:orders,paidItems:items,qaUsersRemaining:qa.count,verified:true}));
}finally{await client.end();}
