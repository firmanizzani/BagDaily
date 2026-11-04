import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {client} from '../src/db/index.js';
const base=process.env.QA_API_URL||'http://localhost:5190/api';
const origin=new URL(base).origin;
const cookies:Record<string,string>={};
const fixtureUser=randomUUID(),fixtureProduct=randomUUID();
const orderIds:string[]=[];
let checks=0;
async function api(path:string,role='admin',method='GET',body?:unknown,key?:string,expected=200){
 const response=await fetch(base+path,{method,headers:{Origin:origin,...(cookies[role]?{Cookie:cookies[role]}:{}),...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
 const result=await response.json();assert.equal(response.status,expected,`${path}: ${JSON.stringify(result.error)}`);checks++;return result;
}
try {
 for(const role of ['admin','kasir','demo']){
  const response=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:role==='demo'?'demo@bagdaily.com':`${role}@bagdaily.com`,password:'BagDaily123!'})});assert.equal(response.status,200);
  cookies[role]=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 }
 for(const filter of ['all=true','all=true&channel=online','all=true&channel=pos','from=2020-01-01T00:00:00Z&to=2020-02-01T00:00:00Z']){
  const result=await api('/admin/reports/profit?'+filter+'&limit=100');const s=result.profitSummary;
  assert.equal(s.profit,s.totalPaid-s.shipping-s.cost);assert.equal(s.netSales,s.merchandise-s.pointsDiscount);
  assert.equal(result.data.reduce((n:number,r:{profit:number})=>n+r.profit,0),s.profit);
 }
 const [dbTotals]=await client`select sum(o.total)::bigint as total_paid,sum(o.shipping_cost)::bigint as shipping,(select sum(i.unit_cost::bigint*i.quantity) from order_items i join orders oo on oo.id=i.order_id where oo.payment_status='paid' and oo.status='completed') as cost from orders o where o.payment_status='paid' and o.status='completed'`;
 const before=(await api('/admin/reports/profit?all=true&limit=100')).profitSummary;
 assert.equal(before.totalPaid,Number(dbTotals.total_paid));assert.equal(before.cost,Number(dbTotals.cost));
 const publicProducts=await api('/products?limit=100','');assert(publicProducts.data.every((p:object)=>!('costPrice' in p)&&!('costIsEstimated' in p)));
 const [category]=await client`select id from categories limit 1`;
 const [admin]=await client`select password_hash from users where email='admin@bagdaily.com'`;
 await client`insert into users(id,name,email,password_hash,role) values(${fixtureUser},'QA profit member',${`qa-profit-${fixtureUser}@example.test`},${admin.password_hash},'pelanggan')`;
 const login=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:`qa-profit-${fixtureUser}@example.test`,password:'BagDaily123!'})});assert.equal(login.status,200);cookies.qa=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 await client`insert into products(id,category_id,sku,name,slug,description,material,price,stock,cost_price) values(${fixtureProduct},${category.id},${`QA-${fixtureProduct}`},'QA profit fixture',${`qa-${fixtureProduct}`},'Disposable fixture','QA',140000,10,102000)`;
 const pos=await api('/cashier/transactions','kasir','POST',{items:[{productId:fixtureProduct,quantity:1}],customerId:fixtureUser,paymentMethod:'cash',cashReceived:140000},randomUUID(),201);orderIds.push(pos.data.id);
 const [posItem]=await client`select unit_cost from order_items where order_id=${pos.data.id}`;assert.equal(posItem.unit_cost,102000);
 assert(!('unitCost' in pos.data.items[0]));
 await api(`/admin/products/${fixtureProduct}`,'admin','PATCH',{costPrice:110000});
 const [unchanged]=await client`select unit_cost from order_items where order_id=${pos.data.id}`;assert.equal(unchanged.unit_cost,102000);
 const [rate]=await client`select id,rate from shipping_rates order by rate limit 1`;
 const online=await api('/orders','qa','POST',{items:[{productId:fixtureProduct,quantity:1}],pointsToRedeem:1000,deliveryMethod:'shipping',shippingRateId:rate.id,recipientName:'QA profit',recipientPhone:'081234567890',shippingAddress:'Jl. Pengujian 1, Jakarta'},undefined,201);orderIds.push(online.data.id);
 assert(!('unitCost' in online.data.items[0]));assert.equal(online.data.total,140000+rate.rate-1000);
 await api(`/orders/${online.data.id}/simulate-payment`,'qa','POST',{method:'qris'},randomUUID());
 let after=(await api('/admin/reports/profit?all=true&limit=100')).profitSummary;
 assert.equal(after.profit-before.profit,38000,'Paid online must wait for completion');
 await api(`/admin/orders/${online.data.id}/status`,'admin','PATCH',{status:'packed'});
 await api(`/admin/orders/${online.data.id}/status`,'admin','PATCH',{status:'shipped'});
 await api(`/orders/${online.data.id}/receive`,'qa','POST');
 const report=await api('/admin/reports/profit?all=true&limit=100');after=report.profitSummary;
 const row=report.data.find((r:{id:string})=>r.id===online.data.id);
 assert.equal(row.cost,110000);assert.equal(row.profit,29000);assert.equal(after.profit-before.profit,67000);
 const missing=await api('/cashier/transactions','kasir','POST',{items:[{productId:fixtureProduct,quantity:1}],paymentMethod:'cash',cashReceived:140000},randomUUID(),201);orderIds.push(missing.data.id);
 await client`update order_items set unit_cost=null where order_id=${missing.data.id}`;
 assert.equal((await api('/admin/reports/profit?all=true')).profitSummary.profit,null,'Missing modal must not inflate profit');
 await api('/admin/reports/profit?all=true','demo','GET',undefined,undefined,403);
 const csv=await fetch(base+'/admin/reports/profit/export?all=true',{headers:{Cookie:cookies.admin}});assert.equal(csv.status,200);assert((await csv.text()).includes('gross_profit'));
 console.log(`PASS: ${checks} API checks plus DB assertions: profit reconciliation, shipping, points counted once, completion gate, cost snapshots, missing costs, CSV and admin-only privacy.`);
}finally{
 await client.begin(async tx=>{
  if(orderIds.length){
   await tx`delete from loyalty_ledger where order_id in ${tx(orderIds)}`;
   await tx`delete from payment_simulations where order_id in ${tx(orderIds)}`;
   await tx`delete from order_status_history where order_id in ${tx(orderIds)}`;
   await tx`delete from stock_movements where reference_order_id in ${tx(orderIds)}`;
   await tx`delete from order_items where order_id in ${tx(orderIds)}`;
   await tx`delete from orders where id in ${tx(orderIds)}`;
  }
  await tx`delete from products where id=${fixtureProduct}`;
  await tx`delete from users where id=${fixtureUser}`;
 });
 await client.end();
}
