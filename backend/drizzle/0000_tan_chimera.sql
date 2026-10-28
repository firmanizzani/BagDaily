CREATE TYPE "public"."user_role" AS ENUM('pelanggan', 'kasir', 'admin');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('awaiting_payment', 'awaiting_confirmation', 'confirmed', 'packed', 'shipped', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"previous_status" "order_status",
	"new_status" "order_status" NOT NULL,
	"changed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"subtotal" integer NOT NULL,
	CONSTRAINT "item_values_valid" CHECK ("order_items"."quantity" > 0 and "order_items"."unit_price" > 0 and "order_items"."subtotal" = "order_items"."quantity" * "order_items"."unit_price")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid,
	"cashier_id" uuid,
	"channel" text NOT NULL,
	"status" "order_status" DEFAULT 'awaiting_payment' NOT NULL,
	"subtotal" integer NOT NULL,
	"shipping_cost" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"payment_method" text,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"delivery_method" text NOT NULL,
	"courier" text,
	"shipping_zone" text,
	"shipping_address" text,
	"recipient_name" text,
	"recipient_phone" text,
	"tracking_number" text,
	"payment_deadline" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"cash_received" integer,
	"change_amount" integer,
	"idempotency_key" uuid,
	"request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_tracking_number_unique" UNIQUE("tracking_number"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "order_money_valid" CHECK ("orders"."subtotal" > 0 and "orders"."shipping_cost" >= 0 and "orders"."total" = "orders"."subtotal" + "orders"."shipping_cost"),
	CONSTRAINT "order_channel_valid" CHECK ("orders"."channel" in ('online','pos')),
	CONSTRAINT "order_payment_valid" CHECK ("orders"."payment_status" in ('unpaid','paid') and (("orders"."payment_status" = 'paid' and "orders"."paid_at" is not null) or ("orders"."payment_status" = 'unpaid' and "orders"."paid_at" is null))),
	CONSTRAINT "order_delivery_valid" CHECK ("orders"."delivery_method" in ('shipping','pickup') and ("orders"."delivery_method" != 'pickup' or ("orders"."shipping_cost" = 0 and "orders"."courier" is null and "orders"."tracking_number" is null)))
);
--> statement-breakpoint
CREATE TABLE "payment_simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_simulations_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "payment_simulations_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payment_values_valid" CHECK ("payment_simulations"."status" = 'completed' and "payment_simulations"."method" in ('cash','bank_transfer','qris'))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"material" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"minimum_stock" integer DEFAULT 5 NOT NULL,
	"image_path" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_stock_nonnegative" CHECK ("products"."stock" >= 0),
	CONSTRAINT "product_price_positive" CHECK ("products"."price" > 0),
	CONSTRAINT "product_minimum_nonnegative" CHECK ("products"."minimum_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shipping_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"courier" text NOT NULL,
	"zone" text NOT NULL,
	"rate" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_rate_nonnegative" CHECK ("shipping_rates"."rate" >= 0),
	CONSTRAINT "shipping_courier_valid" CHECK ("shipping_rates"."courier" in ('JNE','J&T','SiCepat')),
	CONSTRAINT "shipping_zone_valid" CHECK ("shipping_rates"."zone" in ('Jabodetabek','Jawa','Luar Jawa'))
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"stock_before" integer NOT NULL,
	"stock_after" integer NOT NULL,
	"notes" text NOT NULL,
	"reference_order_id" uuid,
	"created_by" uuid,
	"idempotency_key" uuid,
	"request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "movement_values_valid" CHECK ("stock_movements"."stock_before" >= 0 and "stock_movements"."stock_after" >= 0 and "stock_movements"."stock_after" = "stock_movements"."stock_before" + "stock_movements"."quantity" and "stock_movements"."quantity" != 0),
	CONSTRAINT "movement_type_valid" CHECK ("stock_movements"."type" in ('sale','restock','correction') and ("stock_movements"."type" != 'sale' or "stock_movements"."quantity" < 0) and ("stock_movements"."type" != 'restock' or "stock_movements"."quantity" > 0))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'pelanggan' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"phone" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashier_id_users_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_simulations" ADD CONSTRAINT "payment_simulations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reference_order_id_orders_id_fk" FOREIGN KEY ("reference_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "history_order_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_product_unique" ON "order_items" USING btree ("order_id","product_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_deadline_idx" ON "orders" USING btree ("status","payment_deadline");--> statement-breakpoint
CREATE INDEX "orders_paid_idx" ON "orders" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_pair" ON "shipping_rates" USING btree ("courier","zone");--> statement-breakpoint
CREATE UNIQUE INDEX "movement_order_product_unique" ON "stock_movements" USING btree ("reference_order_id","product_id");--> statement-breakpoint
CREATE INDEX "movement_product_idx" ON "stock_movements" USING btree ("product_id","created_at");