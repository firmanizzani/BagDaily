import assert from 'node:assert/strict';
const base=process.env.QA_API_URL||'http://localhost:5190/api';
const login=await fetch(base+'/auth/login',{method:'POST',headers:{Origin:new URL(base).origin,'Content-Type':'application/json'},body:JSON.stringify({email:'admin@bagdaily.com',password:'BagDaily123!'})});assert.equal(login.status,200);
const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
async function get(path:string){const r=await fetch(base+path,{headers:{Cookie:cookie},signal:AbortSignal.timeout(20000)});const b=await r.json();assert.equal(r.status,200,JSON.stringify(b.error));return b;}
for(const [kind,from,to,previousFrom,previousTo] of [
 ['day','2026-11-04','2026-11-05','2026-11-03','2026-11-04'],
 ['week','2026-11-02','2026-11-05','2026-10-26','2026-10-29'],
 ['month','2026-11-01','2026-11-05','2026-10-01','2026-10-05'],
 ['period','2026-11-02','2026-11-05','2026-10-30','2026-11-02'],
]){
 const p=new URLSearchParams({from:from+'T00:00:00+07:00',to:to+'T00:00:00+07:00',compare:kind});
 const overview=(await get('/admin/dashboard/overview?'+p)).data;
 const report=(await get('/admin/reports/sales?'+p)).summary;
 const profit=(await get('/admin/reports/profit?'+p)).profitSummary;
 const c=overview.comparison;assert.equal(c.kind,kind);assert.equal(c.from,new Date(previousFrom+'T00:00:00+07:00').toISOString());assert.equal(c.to,new Date(previousTo+'T00:00:00+07:00').toISOString());assert.deepEqual(report.comparison,c);assert.deepEqual(profit.comparison,c);
 const previous=new URLSearchParams({from:c.from,to:c.to});
 const previousSales=(await get('/admin/reports/sales?'+previous)).summary;
 const previousProfit=(await get('/admin/reports/profit?'+previous)).profitSummary;
 assert.equal(c.metrics.netProductSales,previousSales.netProductSales);assert.equal(c.metrics.totalTransactions,previousSales.totalTransactions);assert.equal(c.metrics.totalProductsSold,previousSales.totalProductsSold);assert.equal(c.metrics.profit,previousProfit.profit);
 console.log(`PASS ${kind}: comparison dates and dashboard/report/profit values agree with baseline transactions.`);
}
