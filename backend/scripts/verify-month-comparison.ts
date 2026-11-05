import assert from 'node:assert/strict';
import {client} from '../src/db/index.js';
const base=process.env.QA_API_URL||'http://localhost:5190/api';
const origin=new URL(base).origin;
let checks=0;
try{
 const login=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'admin@bagdaily.com',password:'BagDaily123!'})});assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 async function get(path:string){const r=await fetch(base+path,{headers:{Cookie:cookie},signal:AbortSignal.timeout(25000)});const b=await r.json();assert.equal(r.status,200,JSON.stringify(b.error));checks++;return b;}
 for(const channel of ['','online','pos']){
  const params=new URLSearchParams({compare:'month',from:'2026-11-01T00:00:00+07:00',to:'2026-11-05T00:00:00+07:00',...(channel?{channel}:{})});
  const dashboard=(await get('/admin/dashboard/overview?'+params)).data;
  const report=(await get('/admin/reports/sales?'+params)).summary;
  const profit=(await get('/admin/reports/profit?'+params)).profitSummary;
  assert.deepEqual(dashboard.comparison,report.comparison);assert.deepEqual(report.comparison,profit.comparison);
  const c=report.comparison;
  assert.equal(c.from,new Date('2026-10-01T00:00:00+07:00').toISOString());assert.equal(c.to,new Date('2026-10-05T00:00:00+07:00').toISOString());
  const condition=channel?client`and channel=${channel}`:client``;
  const [previous]=await client`select coalesce(sum(total::bigint-shipping_cost),0)::bigint as net,count(*)::int as transactions,coalesce(sum(total),0)::bigint as paid from orders where payment_status='paid' and paid_at >= ${c.from}::timestamptz and paid_at < ${c.to}::timestamptz ${condition}`;
  const [items]=await client`select coalesce(sum(i.quantity),0)::bigint as units from order_items i join orders o on o.id=i.order_id where o.payment_status='paid' and o.paid_at >= ${c.from}::timestamptz and o.paid_at < ${c.to}::timestamptz ${channel?client`and o.channel=${channel}`:client``}`;
  const [cost]=await client`select coalesce(sum(i.unit_cost::bigint*i.quantity),0)::bigint as cost from order_items i join orders o on o.id=i.order_id where o.payment_status='paid' and o.status='completed' and o.paid_at >= ${c.from}::timestamptz and o.paid_at < ${c.to}::timestamptz ${channel?client`and o.channel=${channel}`:client``}`;
  const [completed]=await client`select coalesce(sum(total::bigint-shipping_cost),0)::bigint as net from orders where payment_status='paid' and status='completed' and paid_at >= ${c.from}::timestamptz and paid_at < ${c.to}::timestamptz ${condition}`;
  assert.equal(c.metrics.netProductSales,Number(previous.net));assert.equal(c.metrics.totalTransactions,previous.transactions);assert.equal(c.metrics.totalProductsSold,Number(items.units));assert.equal(c.metrics.averagePayment,previous.transactions?Math.round(Number(previous.paid)/previous.transactions):0);assert.equal(c.metrics.profit,Number(completed.net)-Number(cost.cost));
  assert.equal(dashboard.netProductSales,report.netProductSales);
 }
 assert.equal((await get('/admin/dashboard/overview?all=true')).data.comparison,null);
 assert.equal((await get('/admin/reports/sales?all=true')).summary.comparison,null);
 assert.equal((await get('/admin/reports/profit?all=true')).profitSummary.comparison,null);
 console.log(`PASS: ${checks} API requests with DB assertions: dashboard/report/profit comparison agreement, previous-month boundaries, channel isolation, net sales, units, average payments, completed-only profit and all-time state.`);
}finally{await client.end();}
