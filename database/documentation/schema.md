# BagDaily Database Schema Documentation

Target: Supabase PostgreSQL via Drizzle ORM.
Pooler compatibility: Transaction Mode on port 6543 (`prepare: false`, `max: 1` per serverless instance).

## Tables and Constraints

### 1. `users`
- `id` uuid PK default gen_random_uuid()
- `name` text NOT NULL
- `email` text NOT NULL UNIQUE
- `password_hash` text NOT NULL (bcrypt, 12 rounds)
- `role` user_role enum ('pelanggan', 'kasir', 'admin') NOT NULL DEFAULT 'pelanggan'
- `is_active` boolean NOT NULL DEFAULT true
- `session_version` integer NOT NULL DEFAULT 0 (incremented on logout or password change)
- `phone` text NULL
- `address` text NULL
- `created_at`, `updated_at` timestamptz NOT NULL DEFAULT now()

### 2. `categories`
- `id` uuid PK default gen_random_uuid()
- `name` text NOT NULL
- `slug` text NOT NULL UNIQUE
- `created_at`, `updated_at` timestamptz NOT NULL DEFAULT now()

### 3. `products`
- `id` uuid PK default gen_random_uuid()
- `category_id` uuid NOT NULL FK -> categories(id)
- `sku` text NOT NULL UNIQUE
- `name` text NOT NULL
- `slug` text NOT NULL UNIQUE
- `description` text NOT NULL
- `material` text NOT NULL
- `price` integer NOT NULL (IDR, constraint `price > 0`)
- `stock` integer NOT NULL DEFAULT 0 (constraint `stock >= 0`)
- `minimum_stock` integer NOT NULL DEFAULT 5 (constraint `minimum_stock >= 0`)
- `image_path` text NULL (Storage object path)
- `image_url` text NULL (Storage public URL)
- `is_active` boolean NOT NULL DEFAULT true
- `created_at`, `updated_at` timestamptz NOT NULL DEFAULT now()

### 4. `shipping_rates`
- `id` uuid PK default gen_random_uuid()
- `courier` text NOT NULL CHECK in ('JNE','J&T','SiCepat')
- `zone` text NOT NULL CHECK in ('Jabodetabek','Jawa','Luar Jawa')
- `rate` integer NOT NULL CHECK (rate >= 0)
- `created_at`, `updated_at` timestamptz NOT NULL DEFAULT now()
- UNIQUE (courier, zone)

### 5. `orders`
- `id` uuid PK default gen_random_uuid()
- `order_number` text NOT NULL UNIQUE (BD-UUID format)
- `user_id` uuid NULL FK -> users(id)
- `cashier_id` uuid NULL FK -> users(id)
- `channel` text NOT NULL CHECK in ('online','pos')
- `status` order_status enum ('awaiting_payment', 'awaiting_confirmation', 'confirmed', 'packed', 'shipped', 'completed', 'cancelled')
- `subtotal` integer NOT NULL CHECK (subtotal > 0)
- `shipping_cost` integer NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0)
- `total` integer NOT NULL CHECK (total = subtotal + shipping_cost)
- `payment_method` text NULL
- `payment_status` text NOT NULL DEFAULT 'unpaid' CHECK in ('unpaid','paid')
- `delivery_method` text NOT NULL CHECK in ('shipping','pickup')
- `courier` text NULL
- `shipping_zone` text NULL
- `shipping_address` text NULL
- `recipient_name` text NULL
- `recipient_phone` text NULL
- `tracking_number` text NULL UNIQUE
- `payment_deadline` timestamptz NULL
- `paid_at` timestamptz NULL
- `cash_received` integer NULL
- `change_amount` integer NULL
- `idempotency_key` uuid NULL UNIQUE
- `request_hash` text NULL
- `created_at`, `updated_at` timestamptz NOT NULL DEFAULT now()

### 6. `order_items`
- `id` uuid PK default gen_random_uuid()
- `order_id` uuid NOT NULL FK -> orders(id) ON DELETE CASCADE
- `product_id` uuid NOT NULL FK -> products(id)
- `product_name_snapshot` text NOT NULL
- `sku_snapshot` text NOT NULL
- `quantity` integer NOT NULL CHECK (quantity > 0)
- `unit_price` integer NOT NULL CHECK (unit_price > 0)
- `subtotal` integer NOT NULL CHECK (subtotal = quantity * unit_price)
- UNIQUE (order_id, product_id)

### 7. `stock_movements`
- `id` uuid PK default gen_random_uuid()
- `product_id` uuid NOT NULL FK -> products(id)
- `type` text NOT NULL CHECK in ('sale','restock','correction')
- `quantity` integer NOT NULL (negative for sale, positive for restock, signed for correction)
- `stock_before` integer NOT NULL CHECK (stock_before >= 0)
- `stock_after` integer NOT NULL CHECK (stock_after >= 0 and stock_after = stock_before + quantity)
- `notes` text NOT NULL
- `reference_order_id` uuid NULL FK -> orders(id)
- `created_by` uuid NULL FK -> users(id)
- `idempotency_key` uuid NULL UNIQUE
- `request_hash` text NULL
- `created_at` timestamptz NOT NULL DEFAULT now()
- UNIQUE (reference_order_id, product_id)

### 8. `payment_simulations`
- `id` uuid PK default gen_random_uuid()
- `order_id` uuid NOT NULL UNIQUE FK -> orders(id)
- `method` text NOT NULL CHECK in ('cash','bank_transfer','qris','debit','credit')
- `status` text NOT NULL DEFAULT 'completed' CHECK (status = 'completed')
- `idempotency_key` uuid NOT NULL UNIQUE
- `created_at`, `completed_at` timestamptz NOT NULL DEFAULT now()

### 9. `order_status_history`
- `id` uuid PK default gen_random_uuid()
- `order_id` uuid NOT NULL FK -> orders(id) ON DELETE CASCADE
- `previous_status` order_status NULL
- `new_status` order_status NOT NULL
- `changed_by` uuid NULL FK -> users(id)
- `created_at` timestamptz NOT NULL DEFAULT now()

## Concurrency and Invariants
1. No stock reservation.
2. Deductions are conditional: `stock = stock - qty WHERE id = $1 AND stock >= qty`.
3. Multi-item updates always sort product IDs in ascending order to prevent deadlocks.
4. Transient deadlocks (40P01 / 40001) are automatically retried up to 3 times with exponential jitter.
5. All POS orders require unique `idempotency_key`.
6. Payment simulation requires order row-lock `FOR UPDATE` before checking deadline and status.
