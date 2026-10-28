import assert from "node:assert/strict";
const base = process.env.QA_API_URL || "http://localhost:5173/api";
let checks = 0;
async function get(path, status = 200) {
  const r = await fetch(base + path);
  assert.equal(r.status, status, path);
  checks++;
  return r.json();
}
assert.equal((await get("/health")).data.status, "ok");
const catalog = await get("/products?limit=100");
assert.equal(catalog.pagination.total, 18);
assert.equal(catalog.data.length, 18);
assert.ok(catalog.data.every((p) => p.price > 0 && p.stock >= 0));
assert.ok(catalog.data.every((p) => !("totalCount" in p)));
const last = await get("/products?page=2&limit=12");
assert.equal(last.data.length, 6);
assert.equal(last.pagination.total, 18);
const beyond = await get("/products?page=99&limit=12");
assert.equal(beyond.data.length, 0);
assert.equal(beyond.pagination.total, 18);
const empty = await get("/products?search=does-not-exist-qa");
assert.equal(empty.data.length, 0);
assert.equal(empty.pagination.total, 0);
const categories = (await get("/categories")).data;
assert.equal(categories.length, 3);
for (const c of categories) {
  const products = (await get(`/products?category=${c.slug}&limit=100`)).data;
  assert.equal(products.length, 6);
  assert.ok(products.every((p) => p.categoryId === c.id));
}
const search = (await get("/products?search=Zeno")).data;
assert.equal(search.length, 1);
assert.equal(search[0].name, "Zeno Laptop Pack");
assert.equal((await get("/products/zeno-laptop-pack")).data.id, search[0].id);
const sorted = (await get("/products?sort=price_asc&limit=100")).data;
assert.ok(sorted.every((p, i) => !i || p.price >= sorted[i - 1].price));
assert.equal((await get("/shipping/rates")).data.length, 9);
await get("/products?sort=invalid", 400);
await get("/auth/me", 401);
for (const p of [
  "/admin/products",
  "/admin/dashboard/overview",
  "/admin/categories",
  "/admin/inventory",
  "/admin/reports/sales",
  "/admin/users",
  "/admin/shipping/rates",
  "/cashier/orders",
  "/cashier/transactions",
])
  await get(p, 401);
console.log(
  `PASS: ${checks} real API requests through frontend proxy. Catalog, categories, search, sort, detail, shipping, validation, and protected routes verified. No data changed.`,
);
