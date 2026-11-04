# Membership implementation

Every registered customer is a member. Online and POS share one wallet. Anonymous POS sales do not earn or redeem points.

- Earn floor(final payment total / 100) only after a completed sale: 1%, including shipping, after points discount. Online payment spends redeemed points but does not credit rewards until goods are received and the order is completed. POS credits on successful completion. One point is Rp1. No expiry or membership tiers.
- Spending points is optional and off initially. The customer/cashier can choose an integer amount up to available points and total bill. Fully points-funded orders are supported, earn zero new points, and use payment method `points`.
- Online checkout reserves the chosen points. Payment spends the reservation; cancellation and database-driven expiry release it. Concurrent payments cannot spend the same available balance. No stock is reserved at checkout.
- Wallet and ledger writes occur in the same PostgreSQL transaction as payment, order and inventory. Unique order/kind entries and payment idempotency prevent duplicate rewards.
- Existing completed paid purchases linked to customers receive points once through a resumable, idempotent backfill. Unfinished online purchases do not qualify yet. Old monetary amounts and stock remain unchanged.

## Database

`loyalty_accounts`: one row per user, balance, reserved balance, timestamps. Available = balance minus reserved. Nonnegative and safe-integer constraints.

`loyalty_ledger`: earn/reserve/redeem/release entries with signed balance/reservation deltas, snapshots, order reference and unique `(order_id, kind)`. Orders gain `points_redeemed`, `points_earned`, `loyalty_processed_at`. The order-money constraint incorporates the points discount.

## Backend

One loyalty module owns reserve/settle/backfill and wallet reads. Order checkout, online payment and POS call it. A database release function is shared by manual cancellation and pg_cron expiry. Authenticated customer, cashier and admin routes expose only balances/history appropriate to the caller.

## Frontend

Shared point selector in checkout and POS: toggle, available balance, editable amount, discount, estimated new points. Fully covered bills have explicit points-payment confirmation. Member page shows available/held balances and paginated ledger. Receipts, order details, admin customer views and CSV show earned/redeemed points. Reports retain final paid totals and separately label point discounts.

## Verification

Test online and POS earning/redemption, anonymous POS, full-points payment, rounding, insufficient balance, stale/concurrent requests, double submission, expiry/manual cancellation releases, historical backfill reruns, role isolation, ledger/wallet reconciliation, report totals and receipts. Use disposable fixtures; clean them with compensating wallet updates so demo balances remain unchanged. Apply migration, backfill and verify against the connected database, then inspect desktop/mobile UI.
