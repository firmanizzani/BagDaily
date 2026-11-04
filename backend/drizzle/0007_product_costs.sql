ALTER TABLE products ADD COLUMN cost_price integer;
ALTER TABLE products ADD COLUMN cost_is_estimated boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD CONSTRAINT product_cost_nonnegative CHECK (cost_price IS NULL OR cost_price >= 0);
ALTER TABLE order_items ADD COLUMN unit_cost integer;
ALTER TABLE order_items ADD COLUMN cost_is_estimated boolean NOT NULL DEFAULT false;
ALTER TABLE order_items ADD CONSTRAINT item_cost_nonnegative CHECK (unit_cost IS NULL OR unit_cost >= 0);
