# BagDaily API contract

Base URL `/api`. JSON request keys and response fields use camelCase. IDs are UUIDs. Money is integer IDR. Dates are ISO 8601 UTC. All successful JSON responses: `{ "data": value }`; lists additionally include `pagination: {page,limit,total,totalPages}`. Errors: `{ "data": null, "error": { "code": string, "message": string, "details"?: unknown } }`.

## Authentication and browser integration

Use `fetch(url, {credentials:'include', ...})`. JWT lives only in HttpOnly Secure cookie `bagdaily_session`. Cookie SameSite=None in production (HTTPS required), Lax in development. Every POST/PATCH/DELETE must send exact configured frontend `Origin`; requests without trusted Origin fail, including login/register. No bearer token or client-provided role accepted. Roles: `pelanggan`, `kasir`, `admin`. Logout invalidates current JWT session version. GET `/auth/me` returns 401 without session.

## Objects

User: `{id,name,email,role,isActive,phone,address,createdAt,updatedAt}`. Never password hash.
Category: `{id,name,slug,createdAt,updatedAt}`.
Product: `{id,categoryId,sku,name,slug,description,material,price,stock,minimumStock,imagePath,imageUrl,isActive,createdAt,updatedAt,category?:Category}`. All products All Size, no variants. Missing images are null; render frontend placeholder.
Order: `{id,orderNumber,userId,cashierId,channel,status,subtotal,shippingCost,total,paymentMethod,paymentStatus,deliveryMethod,courier,shippingZone,shippingAddress,recipientName,recipientPhone,trackingNumber,paymentDeadline,paidAt,cashReceived,changeAmount,createdAt,updatedAt}`. Detail adds `items`, `history`, `cashierName`. Items snapshot `{id,orderId,productId,productNameSnapshot,skuSnapshot,quantity,unitPrice,subtotal}`. Receipt uses same order detail.

Channels `online`, `pos`. Statuses `awaiting_payment`, `awaiting_confirmation`, `confirmed`, `packed`, `shipped`, `completed`, `cancelled`. Payment statuses `unpaid`, `paid`. Delivery `shipping`, `pickup`. Methods `bank_transfer`, `qris`, `cash` (cash POS only). Couriers `JNE`, `J&T`, `SiCepat`. Zones `Jabodetabek`, `Jawa`, `Luar Jawa`.

## Public and auth

- GET `/health`: `{status:'ok'}`; liveness, no DB query.
- POST `/auth/register`: `{name,email,password}`; 201 user, sets session; role injection rejected.
- POST `/auth/login`: `{email,password}`; user, sets session.
- POST `/auth/logout`: authenticated; `{success:true}`.
- GET `/auth/me`: current user.
- PATCH `/auth/profile`: `{name?,phone?,address?,currentPassword?,password?}`; password change requires currentPassword.
- GET `/categories`: category list, no pagination.
- GET `/products`: `search`, `category` (slug or UUID), `sort=price_asc|price_desc|name|newest`, `availability=in_stock|out_of_stock|all`, `page=1`, `limit=12` (max100). Active products only.
- GET `/products/:id`: UUID or slug, active product.
- GET `/shipping/rates`: array `{id,courier,zone,rate,createdAt,updatedAt}`.

## Customer orders

- POST `/orders`: customer only; `{items:[{productId,quantity}],deliveryMethod,shippingRateId?,recipientName?,recipientPhone?,shippingAddress?}`. Shipping requires shippingRateId and recipient fields. Pickup ignores shipping fields. 201 order detail. Prices/shipping snapshotted server-side. No stock reservation or deduction. Duplicate product IDs rejected.
- GET `/orders/my`: own paginated orders; `page,limit,status?,search?,from?,to?`.
- GET `/orders/:id`: own order or cashier/admin; full order detail.
- POST `/orders/:id/simulate-payment`: own customer order; `{method:'bank_transfer'|'qris'}` plus required `Idempotency-Key` UUID header. Returns detail. Replay with same key/method returns original result; different key or payload after payment gives 409. Expired gives 409 `ORDER_EXPIRED`; shortage gives 409 `INSUFFICIENT_STOCK`. Stock and payment committed together.
- POST `/orders/:id/cancel`: own unpaid order; returns detail. No stock change.

## Cashier and admin

Both `kasir` and `admin` allowed:
- POST `/cashier/transactions`: `{items:[{productId,quantity}],cashReceived}` plus required `Idempotency-Key` UUID. 201 order detail, completed POS cash order. Repeated same key/payload returns same order; changed payload 409.
- GET `/cashier/transactions`: POS history paginated, `page,limit,search,from,to`.
- GET `/cashier/transactions/:id`: POS receipt detail.
- GET `/cashier/orders`: online orders paginated; `page,limit,status,search,from,to`.
- PATCH `/cashier/orders/:id/status`: `{status}`. Flow awaiting_confirmation→confirmed→packed→shipped→completed. Pickup packed→completed instead; cannot ship pickup. Same current status is safe replay. Automatic unique `BD-YYYYMMDD-UUID` tracking at shipping.

## Admin

All following require `admin`:
- GET `/admin/products`: same filters as public, includes inactive; `isActive=true|false` optional.
- POST `/admin/products`: `{categoryId,sku,name,slug,description,material,price,stock?,minimumStock?,isActive?}`. Defaults stock0/minimum5/active. Initial stock creates audited movement. 201 product.
- PATCH `/admin/products/:id`: same fields except stock (use adjustments); optional fields.
- DELETE `/admin/products/:id`: soft deactivate, returns product.
- POST `/admin/products/:id/image`: multipart field `image`, JPEG/PNG/WebP, max3MiB, MIME and magic bytes checked. Returns product. Replace supported.
- DELETE `/admin/products/:id/image`: clears image and removes Storage object; returns product.
- POST `/admin/categories`: `{name,slug}`; 201 category.
- PATCH `/admin/categories/:id`: `{name?,slug?}`.
- DELETE `/admin/categories/:id`: delete only if no linked products; `{success:true}`.
- GET `/admin/inventory`: paginated products with same product filters.
- POST `/admin/inventory/adjustments`: `{productId,type:'restock'|'correction',quantity,notes}` plus required `Idempotency-Key` UUID. Restock quantity positive; correction signed nonzero delta, not target stock. Returns movement. Replay safe; changed payload409.
- GET `/admin/inventory/movements`: paginated; `productId?,type?,page,limit`.
- GET `/admin/inventory/low-stock`: paginated active products stock<=minimumStock.
- GET `/admin/users`: paginated; `search?,role?,page,limit`.
- POST `/admin/users/cashier`: `{name,email,password}`; 201 user.
- PATCH `/admin/users/:id`: `{name?,role?,isActive?,password?}`. Cannot alter own role/active state; last active admin protected.
- GET `/admin/shipping/rates`: rates array.
- POST `/admin/shipping/rates`: `{courier,zone,rate}`; 201 rate, duplicate combination409.
- PATCH `/admin/shipping/rates/:id`: `{rate}`.

## Analytics (admin only, paid orders only)

Range query `from`, `to` ISO date or datetime; inclusive from, exclusive to. Defaults past30 days to now. Max366 days. `channel=online|pos` optional. Dates grouped Asia/Jakarta.
- GET `/admin/dashboard/overview`: `{totalSales,totalTransactions,activeProducts,lowStockProducts,onlineSales,posSales}`.
- GET `/admin/dashboard/sales-trend`: `interval=day|week`; array `{date,revenue,transactions}`.
- GET `/admin/dashboard/categories`: array `{categoryId,name,quantity,revenue}` (item revenue excludes shipping).
- GET `/admin/dashboard/top-products`: top5 `{productId,name,quantity,revenue}`.
- GET `/admin/dashboard/channels`: array `{channel,revenue,transactions}`.
- GET `/admin/dashboard/restock-recommendations`: array `{productId,name,stock,minimumStock,soldLast7Days,averageDailySales,next7DaysDemand,recommendedQuantity}`. `recommendedQuantity=max(0,ceil(soldLast7Days)-stock)`; historical seven-day paid sales, not AI prediction.
- GET `/admin/reports/sales`: paginated paid orders plus `summary:{totalSales,totalTransactions,onlineSales,posSales}`, `products:[{productId,name,quantity,revenue}]`; range/channel/page/limit filters.
- GET `/admin/reports/sales/export`: same range/channel, CSV download; maximum10000 orders, 422 if exceeded. CSV formula injection escaped.

Pagination defaults page1/limit12, max100. Validation400; unauthenticated401; role/ownership403 (unknown order404); not found404; conflicts409; upload413/400; throttled429. Error codes stable uppercase strings. No successful payment for out-of-stock order. Cancellation never restores unpaid stock. No refund endpoint; paid cancellations prohibited.
