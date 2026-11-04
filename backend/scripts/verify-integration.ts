import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { client } from "../src/db/index.js";

const base = process.env.QA_API_URL || "http://localhost:5173/api";
const origin = new URL(base).origin;
const cookies: Record<string, string> = {};
const fixtureIds: string[] = [];
const fixtureUsers: string[] = [];
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
  const dateFilters = new URLSearchParams({ from: new Date(Date.now() - 86400000).toISOString(), to: new Date(Date.now() + 86400000).toISOString(), limit: '100' });
  for (const [path, role] of [['/admin/orders', 'admin'], ['/orders/my', 'pelanggan']]) {
    const filtered = await api(`${path}?${dateFilters}`, role);
    assert.ok(filtered.data.some((row: { id: string }) => row.id === order.id), `${path} date-filtered order`);
  }
  assert.equal((await api(`/products/${main.id}`)).data.stock, 2);
  assert.equal(
    (await api("/admin/dashboard/overview", "admin")).data.lowStockProducts,
    before.lowStockProducts + 1,
  );
  for (const status of ["packed", "shipped", "completed"]) {
    const updated = (
      await api(`/admin/orders/${order.id}/status`, "admin", "PATCH", {
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
  const recommendation = (await api('/admin/dashboard/restock-recommendations', 'admin')).data.find((row: { productId: string }) => row.productId === main.id);
  assert.equal(recommendation.soldLast7Days, 3);
  assert.equal(recommendation.targetStock, 3);
  assert.equal(recommendation.recommendedQuantity, 3);
  assert.equal(recommendation.daysOfStock, 0);
  const expiredOrder = (await api('/orders', 'pelanggan', 'POST', {
    items: [{ productId: main.id, quantity: 1 }], deliveryMethod: 'pickup',
  })).data;
  await client`update orders set payment_deadline=clock_timestamp()-interval '1 minute' where id=${expiredOrder.id}`;
  await api(`/orders/${expiredOrder.id}/simulate-payment`, 'pelanggan', 'POST', { method: 'qris' }, randomUUID(), 409);
  // Parallel workers must produce one state change and exactly one history entry.
  await Promise.all([
    client`select * from public.cancel_expired_unpaid_orders(200)`,
    client`select * from public.cancel_expired_unpaid_orders(200)`,
  ]);
  assert.equal((await api(`/orders/${expiredOrder.id}`, 'pelanggan')).data.status, 'cancelled');
  const [cancellation] = await client`select count(*)::int as count from order_status_history where order_id=${expiredOrder.id} and new_status='cancelled'`;
  assert.equal(cancellation.count, 1);
  assert.equal((await api(`/products/${main.id}`)).data.stock, 0);
  assert.equal((await api(`/orders/${order.id}`, 'pelanggan')).data.status, 'completed');
  await api('/admin/dashboard/restock-recommendations', 'kasir', 'GET', undefined, undefined, 403);
  await api('/admin/dashboard/restock-recommendations', 'pelanggan', 'GET', undefined, undefined, 403);
  await api('/admin/orders', 'kasir', 'GET', undefined, undefined, 403);
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
  assert.equal((await api('/admin/dashboard/restock-recommendations', 'admin')).data.find((row: { productId: string }) => row.productId === main.id).recommendedQuantity, 0);
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
    "/admin/orders",
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
  const customerProduct = await product(6, 'customers');
  const customer = (await api('/auth/me', 'pelanggan')).data;
  const cashier = (await api('/auth/me', 'kasir')).data;
  const customerStats = (await api(`/admin/customers/${customer.id}/orders`, 'admin')).customer;
  const generalBefore = (await api('/admin/customers/general-summary', 'admin')).data;
  const found = (await api('/cashier/customers?search=demo%40bagdaily.com', 'kasir')).data;
  assert.ok(found.some((row: { id: string }) => row.id === customer.id));
  assert.ok(found.every((row: Record<string, unknown>) => Object.keys(row).every(key => ['id', 'name', 'email', 'phone'].includes(key))));
  await api('/cashier/customers?search=de', 'pelanggan', 'GET', undefined, undefined, 403);
  await api('/cashier/customers?search=d', 'kasir', 'GET', undefined, undefined, 400);
  await api('/admin/customers/general-summary', 'kasir', 'GET', undefined, undefined, 403);
  const customerKey = randomUUID();
  const customerBody = { items: [{ productId: customerProduct.id, quantity: 1 }], cashReceived: 100000, customerId: customer.id };
  const linked = (await api('/cashier/transactions', 'kasir', 'POST', customerBody, customerKey)).data;
  assert.equal(linked.userId, customer.id);
  assert.equal(linked.customerName, customer.name);
  assert.equal((await api('/cashier/transactions', 'kasir', 'POST', customerBody, customerKey)).data.id, linked.id);
  await api('/cashier/transactions', 'kasir', 'POST', { ...customerBody, customerId: undefined }, customerKey, 409);
  const linkedHistory = await api(`/admin/customers/${customer.id}/orders?channel=pos&limit=100`, 'admin');
  assert.ok(linkedHistory.data.some((row: { id: string }) => row.id === linked.id));
  assert.equal(linkedHistory.customer.totalOrders, customerStats.totalOrders + 1);
  assert.equal(linkedHistory.customer.totalSpend, customerStats.totalSpend + linked.total);
  assert.deepEqual((await api('/admin/customers/general-summary', 'admin')).data, generalBefore);
  const guest = (await api('/cashier/transactions', 'kasir', 'POST', { ...customerBody, customerId: undefined }, randomUUID())).data;
  assert.equal(guest.userId, null);
  const generalAfter = (await api('/admin/customers/general-summary', 'admin')).data;
  assert.equal(generalAfter.transactions, generalBefore.transactions + 1);
  assert.equal(generalAfter.totalSpend, generalBefore.totalSpend + guest.total);
  const customerAfterGuest = (await api(`/admin/customers/${customer.id}/orders`, 'admin')).customer;
  assert.equal(customerAfterGuest.totalOrders, linkedHistory.customer.totalOrders);
  assert.equal(customerAfterGuest.totalSpend, linkedHistory.customer.totalSpend);
  const dates = new URLSearchParams({ from: new Date(Date.now()-86400000).toISOString(), to: new Date(Date.now()+86400000).toISOString(), limit: '100' });
  const guestRows = (await api(`/cashier/transactions?${dates}&customer=general`, 'kasir')).data;
  assert.ok(guestRows.some((row: { id: string }) => row.id === guest.id));
  assert.ok(guestRows.every((row: { userId: string | null }) => row.userId === null));
  const linkedRows = (await api(`/cashier/transactions?${dates}&customer=registered`, 'kasir')).data;
  assert.ok(linkedRows.some((row: { id: string }) => row.id === linked.id));
  assert.ok(linkedRows.every((row: { userId: string | null }) => row.userId !== null));
  for (const invalidCustomer of [randomUUID(), cashier.id]) {
    await api('/cashier/transactions', 'kasir', 'POST', { ...customerBody, customerId: invalidCustomer }, randomUUID(), 409);
  }
  const inactive = (await api('/auth/register', '', 'POST', { name: 'QA inactive customer', email: `qa-customer-${stamp}@example.test`, password: `Qa-${randomUUID()}!` })).data;
  fixtureUsers.push(inactive.id);
  await client`update users set is_active=false where id=${inactive.id}`;
  assert.equal((await api(`/cashier/customers?search=qa-customer-${stamp}`, 'kasir')).data.length, 0);
  await api('/cashier/transactions', 'kasir', 'POST', { ...customerBody, customerId: inactive.id }, randomUUID(), 409);
  assert.equal((await api(`/products/${customerProduct.id}`)).data.stock, 4);
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
  for (const id of fixtureUsers) await client`delete from users where id=${id}`;
  console.log(
    "Temporary test data removed. The requested demo accounts remain available.",
  );
  await client.end({ timeout: 5 });
}
