-- Market orders: Add columns expected by get_farmer_orders_with_context and frontend
alter table public.market_orders add column if not exists quantity_unit text;
alter table public.market_orders add column if not exists price_offered numeric;
alter table public.market_orders add column if not exists payment_status text;
alter table public.market_orders add column if not exists delivery_date date;
alter table public.market_orders add column if not exists delivery_address text;
alter table public.market_orders add column if not exists notes text;

-- Trips: Add CHECK constraint for valid status values (aligned with update-trip-status Edge Function)
alter table public.trips drop constraint if exists trips_status_check;
alter table public.trips add constraint trips_status_check
  check (status in ('assigned', 'en_route', 'arrived', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'issue'));

-- farmer_update_order_status: Validates allowed transitions (farmer can confirm, ship, deliver, cancel, reject)
-- Plan: Order status — pending, confirmed, shipped, delivered, cancelled, rejected
create or replace function public.farmer_update_order_status(p_order_id uuid, p_new_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_allowed boolean := false;
begin
  select id, farmer_id, status into v_order
  from public.market_orders
  where id = p_order_id and farmer_id = auth.uid();
  if not found then
    raise exception 'Order not found or access denied';
  end if;

  -- Allowed transitions (farmer-owned orders)
  case v_order.status
    when 'pending', 'requested' then
      v_allowed := p_new_status in ('confirmed', 'cancelled', 'rejected');
    when 'confirmed' then
      v_allowed := p_new_status in ('shipped', 'cancelled');
    when 'shipped' then
      v_allowed := p_new_status = 'delivered';
    when 'delivered', 'cancelled', 'rejected' then
      v_allowed := false; -- terminal
    else
      v_allowed := p_new_status in ('confirmed', 'cancelled', 'rejected'); -- treat unknown as initial
  end case;

  if not v_allowed then
    raise exception 'Invalid transition from % to %', v_order.status, p_new_status;
  end if;

  update public.market_orders set status = p_new_status, updated_at = now() where id = p_order_id;
  return true;
end;
$$;
