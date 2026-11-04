ALTER TABLE public.orders ADD COLUMN points_redeemed integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN points_earned integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN loyalty_processed_at timestamptz;
ALTER TABLE public.orders DROP CONSTRAINT order_money_valid;
ALTER TABLE public.orders ADD CONSTRAINT order_money_valid CHECK (subtotal > 0 AND shipping_cost >= 0 AND total >= 0 AND total = subtotal + shipping_cost - points_redeemed);
ALTER TABLE public.orders ADD CONSTRAINT order_loyalty_valid CHECK (points_redeemed >= 0 AND points_earned >= 0 AND (user_id IS NOT NULL OR (points_redeemed=0 AND points_earned=0)));
ALTER TABLE public.payment_simulations DROP CONSTRAINT payment_values_valid;
ALTER TABLE public.payment_simulations ADD CONSTRAINT payment_values_valid CHECK (status='completed' AND method IN ('cash','bank_transfer','qris','debit','credit','points'));

CREATE TABLE public.loyalty_accounts (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0,
  reserved bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_balance_valid CHECK (balance>=0 AND reserved>=0 AND reserved<=balance AND balance<=9007199254740991)
);
CREATE TABLE public.loyalty_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.loyalty_accounts(user_id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id), order_number text NOT NULL,
  kind text NOT NULL, points integer NOT NULL, balance_delta integer NOT NULL, reserved_delta integer NOT NULL,
  balance_after bigint NOT NULL, reserved_after bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_entry_valid CHECK (points>=0 AND kind IN ('earn','reserve','redeem','release') AND balance_after>=0 AND reserved_after>=0 AND reserved_after<=balance_after),
  CONSTRAINT loyalty_delta_valid CHECK (
    (kind='earn' AND balance_delta=points AND reserved_delta=0) OR
    (kind='reserve' AND balance_delta=0 AND reserved_delta=points) OR
    (kind='redeem' AND balance_delta=-points AND reserved_delta IN (0,-points)) OR
    (kind='release' AND balance_delta=0 AND reserved_delta=-points))
);
CREATE UNIQUE INDEX loyalty_order_kind_unique ON public.loyalty_ledger(order_id,kind);
CREATE INDEX loyalty_customer_idx ON public.loyalty_ledger(user_id,created_at);
INSERT INTO public.loyalty_accounts(user_id) SELECT id FROM public.users WHERE role='pelanggan';

CREATE OR REPLACE FUNCTION public.release_order_points(target_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $function$
DECLARE o public.orders%ROWTYPE; w public.loyalty_accounts%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=target_id FOR UPDATE;
  IF NOT FOUND OR o.payment_status<>'unpaid' OR o.points_redeemed=0 THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.loyalty_ledger WHERE order_id=o.id AND kind='reserve')
    OR EXISTS (SELECT 1 FROM public.loyalty_ledger WHERE order_id=o.id AND kind IN ('release','redeem')) THEN RETURN false; END IF;
  UPDATE public.loyalty_accounts SET reserved=reserved-o.points_redeemed,updated_at=clock_timestamp()
    WHERE user_id=o.user_id AND reserved>=o.points_redeemed RETURNING * INTO w;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loyalty reservation mismatch for %',o.id; END IF;
  INSERT INTO public.loyalty_ledger(user_id,order_id,order_number,kind,points,balance_delta,reserved_delta,balance_after,reserved_after)
    VALUES (o.user_id,o.id,o.order_number,'release',o.points_redeemed,0,-o.points_redeemed,w.balance,w.reserved);
  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.release_order_points(uuid) FROM public;

CREATE OR REPLACE FUNCTION public.cancel_expired_unpaid_orders(batch_size int DEFAULT 100)
RETURNS TABLE(order_id uuid,order_number text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $function$
DECLARE r record;
BEGIN
  FOR r IN SELECT o.id,o.order_number FROM public.orders o
    WHERE o.channel='online' AND o.status='awaiting_payment' AND o.payment_status='unpaid' AND o.payment_deadline<=clock_timestamp()
    ORDER BY o.payment_deadline,o.id LIMIT greatest(1,least(coalesce(batch_size,100),1000)) FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_order_points(r.id);
    UPDATE public.orders SET status='cancelled',updated_at=clock_timestamp() WHERE id=r.id;
    INSERT INTO public.order_status_history(order_id,previous_status,new_status,changed_by) VALUES(r.id,'awaiting_payment','cancelled',NULL);
    order_id:=r.id;order_number:=r.order_number;RETURN NEXT;
  END LOOP;
END;
$function$;
REVOKE ALL ON FUNCTION public.cancel_expired_unpaid_orders(integer) FROM public;
