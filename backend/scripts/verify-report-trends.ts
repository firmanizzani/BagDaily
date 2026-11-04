import assert from 'node:assert/strict';
import { client } from '../src/db/index.js';
const base=process.env.QA_API_URL || 'http://localhost:5190/api';
const origin=new URL(base).origin;
let checks=0;
try {
 const login=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'admin@bagdaily.com',password:'BagDaily123!'})});
 assert.equal(login.status,200);
 const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 async function get(path:string,expected=200) {
  const response=await fetch(base+path,{headers:{Origin:origin,Cookie:cookie},signal:AbortSignal.timeout(20000)});
  const body=await response.json();
  assert.equal(response.status,expected,JSON.stringify(body.error)); checks++; return body;
 }
 for(const filter of ['all=true','all=true&channel=online','all=true&channel=pos','from=2026-09-01T00:00:00%2B07:00&to=2026-10-01T00:00:00%2B07:00','from=2020-01-01T00:00:00Z&to=2020-02-01T00:00:00Z']) {
  const report=await get('/admin/reports/sales?'+filter);
  for(const interval of ['day','week','month']) {
   const trend=await get('/admin/reports/trends?'+filter+'&interval='+interval);
   assert.equal(trend.data.sales.reduce((sum:number,p:{revenue:number})=>sum+p.revenue,0),report.summary.totalSales,'Payment sum must not be multiplied by order items');
   assert.equal(trend.data.sales.reduce((sum:number,p:{units:number})=>sum+p.units,0),report.summary.totalProductsSold);
   assert.equal(trend.data.sales.reduce((sum:number,p:{transactions:number})=>sum+p.transactions,0),report.summary.totalTransactions);
   assert.equal(trend.data.monthly.reduce((sum:number,p:{quantity:number})=>sum+p.quantity,0),report.summary.totalProductsSold);
   checks+=4;
  }
  assert.equal(report.summary.merchandiseTotal+report.summary.shippingTotal-report.summary.pointsDiscount,report.summary.totalSales);
  for(const product of report.products) {assert(Number.isInteger(product.stock)); assert(Number.isInteger(product.minimumStock));}
 }
 await get('/admin/reports/trends?all=true&interval=invalid',400);
 const anonymous=await fetch(base+'/admin/reports/trends?all=true');assert.equal(anonymous.status,401);
 const [totals]=await client`select count(*)::int as orders,coalesce(sum(total),0)::bigint as paid from orders where payment_status='paid'`;
 const report=await get('/admin/reports/sales?all=true');
 assert.equal(report.summary.totalTransactions,totals.orders);assert.equal(report.summary.totalSales,Number(totals.paid));
 console.log(`PASS: ${checks} report API checks; payment totals, units, category months, intervals, channels, empty period, stock, validation and authentication reconcile.`);
} finally {await client.end();}
