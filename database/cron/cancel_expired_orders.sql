-- Install migration 0005 first. This file updates expiry and reservation release together.
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
