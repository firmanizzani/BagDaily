-- Installed by migration 0004 and npm run db:cron; safe to run again.
create or replace function public.cancel_expired_unpaid_orders(batch_size int default 100)
returns table (order_id uuid, order_number text)
language sql
security invoker
set search_path = pg_catalog, public
as $function$
  with due as (
    select o.id from public.orders o
    where o.channel = 'online'
      and o.status = 'awaiting_payment'
      and o.payment_status = 'unpaid'
      and o.payment_deadline <= clock_timestamp()
    order by o.payment_deadline, o.id
    limit greatest(1, least(coalesce(batch_size, 100), 1000))
    for update skip locked
  ), cancelled as (
    update public.orders o
    set status = 'cancelled', updated_at = clock_timestamp()
    from due
    where o.id = due.id
      and o.status = 'awaiting_payment'
      and o.payment_status = 'unpaid'
    returning o.id, o.order_number
  ), recorded as (
    insert into public.order_status_history (order_id, previous_status, new_status, changed_by)
    select id, 'awaiting_payment', 'cancelled', null from cancelled
  )
  select id, order_number from cancelled;
$function$;
-- Unpaid orders never reserve or deduct stock. No stock movement is needed.
revoke all on function public.cancel_expired_unpaid_orders(integer) from public;
