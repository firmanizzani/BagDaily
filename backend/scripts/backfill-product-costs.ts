import assert from 'node:assert/strict';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { client } from '../src/db/index.js';
const fixtures=JSON.parse((await readFile(new URL('../../database/demo/product-costs.json',import.meta.url),'utf8')).replace(/^\uFEFF/,'')) as Array<{sku:string;name:string;price:number;costPrice:number}>;
try {
 await client.begin(async tx=>{
  const products=await tx`select id,name,sku,price,stock,cost_price,cost_is_estimated from products order by id for update`;
  // Match by catalog name as well as SKU so a stale fixture never edits another bag.
  const selected=fixtures.map(f=>{
   const p=products.find(p=>p.name===f.name);assert(p,`Missing product: ${f.name}`);assert.equal(p.price,f.price,`Price changed: ${f.name}`);assert.equal(p.sku,f.sku,`SKU changed: ${f.name}`);
   assert(p.cost_price===null || p.cost_is_estimated,`Manual cost found: ${f.name}`);
   assert(f.costPrice>0 && f.costPrice<f.price);return {product:p,fixture:f};
  });
  for(const a of fixtures)for(const b of fixtures)if(a.price<b.price)assert(a.price-a.costPrice<b.price-b.costPrice);
  const ids=selected.map(s=>s.product.id);
  const items=await tx`select id,product_id,unit_cost,cost_is_estimated from order_items where product_id in ${tx(ids)} and (unit_cost is null or cost_is_estimated) for update`;
  await mkdir('uploads/backups',{recursive:true});
  const backupPath=`uploads/backups/product-cost-revision-${Date.now()}.json`;
  await writeFile(backupPath,JSON.stringify({products:selected.map(s=>s.product),items},null,2));
  for(const {product,fixture} of selected){
   await tx`update products set cost_price=${fixture.costPrice},cost_is_estimated=true,updated_at=now() where id=${product.id}`;
   await tx`update order_items set unit_cost=${fixture.costPrice},cost_is_estimated=true where product_id=${product.id} and (unit_cost is null or cost_is_estimated)`;
  }
  const after=await tx`select id,price,stock from products where id in ${tx(ids)}`;
  for(const row of after){const old=products.find(p=>p.id===row.id)!;assert.equal(row.price,old.price);assert.equal(row.stock,old.stock);}
  const remaining=await tx`select count(*)::int as count from order_items i join products p on p.id=i.product_id where i.product_id in ${tx(ids)} and i.cost_is_estimated and i.unit_cost is distinct from p.cost_price`;
  assert.equal(remaining[0].count,0);
  console.log(JSON.stringify({updatedProducts:selected.length,updatedItemSnapshots:items.length,backupPath,costs:fixtures.map(f=>({name:f.name,price:f.price,cost:f.costPrice,profit:f.price-f.costPrice}))},null,2));
 });
}finally{await client.end();}
