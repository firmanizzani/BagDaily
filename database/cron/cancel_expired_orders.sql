create or replace function cancel_expired_unpaid_orders(batch_size int default 100)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
as $$
declare
  r record;
begin
  for r in
    select o.id, o.order_number
    from orders o
    where o.status = 'awaiting_payment'
      and o.payment_status = 'unpaid'
      and o.payment_deadline is not null
      and o.payment_deadline < clock_timestamp()
    order by o.payment_deadline asc
    limit batch_size
    for update skip locked
  loop
    update orders
    set status = 'cancelled',
        updated_at = clock_timestamp()
    where id = r.id
      and status = 'awaiting_payment'
      and payment_status = 'unpaid';

    insert into order_status_history (order_id, previous_status, new_status, changed_by)
    values (r.id, 'awaiting_payment', 'cancelled', null);

    order_id := r.id;
    order_number := r.order_number;
    return next;
  end loop;
end;
$$;

-- Setup in Supabase Dashboard SQL Editor or migration:
-- select cron.schedule(
--   'cancel-expired-orders-every-minute',
--   '* * * * *',
--   $$select * from cancel_expired_unpaid_orders(200);$$
-- );
