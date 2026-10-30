import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { client } from "../src/db/index.js";

const base = process.env.QA_API_URL || "http://localhost:5173/api";
const origin = new URL(base).origin;
const cookies: Record<string, string> = {};
const fixtureIds: string[] = [];
let categoryId: string | undefined;
let checks = 0;
async function api(
  path: string,
  role = "",
  method = "GET",
  body?: unknown,
  key?: string,
  expected?: number,
) {
  const response = await fetch(base + path, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: {
      Origin: origin,
      ...(role ? { Cookie: cookies[role] } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (expected) assert.equal(response.status, expected, path);
  else
    assert.ok(
      response.ok,
      `${method} ${path}: ${response.status} ${JSON.stringify(result.error)}`,
    );
  checks++;
  return result;
}

try {
  for (const [role, email] of [
    ["admin", "admin@bagdaily.com"],
    ["kasir", "kasir@bagdaily.com"],
    ["pelanggan", "demo@bagdaily.com"],
  ]) {
    const response = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "BagDaily123!" }),
    });
    assert.equal(response.status, 200, `Demo ${role} login`);
    cookies[role] = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    checks++;
    assert.equal((await api("/auth/me", role)).data.role, role);
  }
  const before = (await api("/admin/dashboard/overview", "admin")).data;
  const stamp = Date.now();
  categoryId = (
    await api("/admin/categories", "admin", "POST", {
      name: "QA temporary category",
      slug: `qa-${stamp}`,
    })
  ).data.id;
  await api(`/admin/categories/${categoryId}`, "admin", "PATCH", {
    name: "QA revised category",
  });
  async function product(stock: number, suffix: string) {
    const row = (
      await api("/admin/products", "admin", "POST", {
        categoryId,
        name: "QA temporary bag",
        sku: `QA-${stamp}-${suffix}`,
        slug: `qa-${stamp}-${suffix}`,
        description: "Disposable integration fixture",
        material: "Canvas",
        price: 100000,
        stock,
        minimumStock: 2,
      })
    ).data;
    fixtureIds.push(row.id);
    return row;
  }
  const main = await product(3, "main");
  await api(`/admin/products/${main.id}`, "admin", "PATCH", {
    name: "QA verified bag",
  });
  assert.equal(
    (await api(`/products/${main.id}`)).data.name,
    "QA verified bag",
  );
  await api(`/admin/products/${main.id}`, "admin", "PATCH", {
    isActive: false,
  });
  await api(`/products/${main.id}`, "", "GET", undefined, undefined, 404);
  assert.ok(
    (await api("/admin/products?isActive=false", "admin")).data.some(
      (row: { id: string }) => row.id === main.id,
    ),
  );
  await api(`/admin/products/${main.id}`, "admin", "PATCH", { isActive: true });
  const form = new FormData();
  const bytes = await readFile(
    new URL("../../frontend/public/images/bagdaily-hero.png", import.meta.url),
  );
  form.set("image", new Blob([bytes], { type: "image/png" }), "qa-product.png");
  const uploaded = await fetch(`${base}/admin/products/${main.id}/image`, {
    method: "POST",
    headers: { Origin: origin, Cookie: cookies.admin },
    body: form,
  });
  const media = await uploaded.json();
  assert.equal(uploaded.status, 200, JSON.stringify(media.error));
  checks++;
  assert.ok(media.data.imageUrl);
  assert.equal(
    (await api(`/admin/products/${main.id}/image`, "admin", "DELETE")).data
      .imageUrl,
    null,
  );
  assert.ok(
    (await api("/admin/products?isActive=false", "admin")).data.every(
      (row: { isActive: boolean }) => !row.isActive,
    ),
  );
  const rates = (await api("/shipping/rates")).data;
  const order = (
    await api("/orders", "pelanggan", "POST", {
      items: [{ productId: main.id, quantity: 1 }],
      deliveryMethod: "shipping",
      shippingRateId: rates[0].id,
      recipientName: "QA simulation",
      recipientPhone: "08000000000",
      shippingAddress: "Alamat simulasi pengujian",
    })
  ).data;
  const paid = (
    await api(
      `/orders/${order.id}/simulate-payment`,
      "pelanggan",
      "POST",
      { method: "qris" },
      randomUUID(),
    )
  ).data;
  assert.equal(paid.status, "awaiting_confirmation");
  assert.equal((await api(`/products/${main.id}`)).data.stock, 2);
  assert.equal(
    (await api("/admin/dashboard/overview", "admin")).data.lowStockProducts,
    before.lowStockProducts + 1,
  );
  for (const status of ["packed", "shipped", "completed"]) {
    const updated = (
      await api(`/cashier/orders/${order.id}/status`, "kasir", "PATCH", {
        status,
      })
    ).data;
    assert.equal(updated.status, status);
    if (status === "shipped") assert.ok(updated.trackingNumber);
  }
  const key = randomUUID();
  const body = {
    items: [{ productId: main.id, quantity: 2 }],
    cashReceived: 250000,
  };
  const sale = (await api("/cashier/transactions", "kasir", "POST", body, key))
    .data;
  assert.equal(sale.total, 200000);
  assert.equal(sale.changeAmount, 50000);
  assert.equal(
    (await api("/cashier/transactions", "kasir", "POST", body, key)).data.id,
    sale.id,
  );
  assert.equal((await api(`/products/${main.id}`)).data.stock, 0);
  await api(
    "/cashier/transactions",
    "kasir",
    "POST",
    { items: [{ productId: main.id, quantity: 1 }], cashReceived: 100000 },
    randomUUID(),
    409,
  );
  await api(
    "/admin/inventory/adjustments",
    "admin",
    "POST",
    {
      productId: main.id,
      type: "restock",
      quantity: 3,
      notes: "QA fixture restock",
    },
    randomUUID(),
  );
  assert.equal((await api(`/products/${main.id}`)).data.stock, 3);
  const after = (await api("/admin/dashboard/overview", "admin")).data;
  assert.equal(after.totalSales, before.totalSales + paid.total + sale.total);
  assert.equal(after.lowStockProducts, before.lowStockProducts);
  for (const path of [
    "/admin/dashboard/sales-trend",
    "/admin/dashboard/categories",
    "/admin/dashboard/top-products",
    "/admin/dashboard/channels",
    "/admin/dashboard/restock-recommendations",
    "/admin/reports/sales",
    "/admin/users",
    "/admin/shipping/rates",
    "/cashier/orders",
    "/cashier/transactions",
  ])
    await api(path, path.startsWith("/admin") ? "admin" : "kasir");
  const csv = await fetch(`${base}/admin/reports/sales/export`, {
    headers: { Cookie: cookies.admin },
  });
  assert.equal(csv.status, 200);
  assert.ok(csv.headers.get("content-type")?.includes("text/csv"));
  await csv.text();
  checks++;
  await api("/admin/products", "pelanggan", "GET", undefined, undefined, 403);
  const race = await product(1, "race");
  const first = (
    await api("/orders", "pelanggan", "POST", {
      items: [{ productId: race.id, quantity: 1 }],
      deliveryMethod: "pickup",
    })
  ).data;
  const second = (
    await api("/orders", "pelanggan", "POST", {
      items: [{ productId: race.id, quantity: 1 }],
      deliveryMethod: "pickup",
    })
  ).data;
  async function racePayment(id: string) {
    const response = await fetch(`${base}/orders/${id}/simulate-payment`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: cookies.pelanggan,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({ method: "qris" }),
    });
    await response.json();
    checks++;
    return response.status;
  }
  assert.deepEqual(
    (await Promise.all([racePayment(first.id), racePayment(second.id)])).sort(),
    [200, 409],
  );
  assert.equal((await api(`/products/${race.id}`)).data.stock, 0);
  console.log(
    `PASS: ${checks} integration requests. Three demo logins, CRUD, shipping checkout/payment/fulfillment, tracking, POS/change/idempotency, stock/restock, reporting, roles, and concurrent last-unit purchase.`,
  );
} finally {
  for (const productId of fixtureIds)
    await client.begin(async (tx) => {
      const orderIds =
        await tx`select distinct order_id from order_items where product_id=${productId}`;
      for (const { order_id: id } of orderIds) {
        await tx`delete from payment_simulations where order_id=${id}`;
        await tx`delete from order_status_history where order_id=${id}`;
        await tx`delete from stock_movements where reference_order_id=${id}`;
        await tx`delete from order_items where order_id=${id}`;
        await tx`delete from orders where id=${id}`;
      }
      await tx`delete from stock_movements where product_id=${productId}`;
      await tx`delete from products where id=${productId}`;
    });
  if (categoryId) await client`delete from categories where id=${categoryId}`;
  console.log(
    "Temporary test data removed. The requested demo accounts remain available.",
  );
  await client.end({ timeout: 5 });
}
