-- RPC: Get trips with farmer and crop context (denormalized, single query)
-- Replaces N+1 pattern in useTrips hook
create or replace function public.get_trips_with_context(
  p_transporter_id uuid,
  p_status_filter text[] default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  from (
    select
      tr.id,
      tr.transport_request_id,
      tr.transporter_id,
      tr.status,
      tr.assigned_at,
      tr.en_route_at,
      tr.arrived_at,
      tr.picked_up_at,
      tr.in_transit_at,
      tr.delivered_at,
      tr.cancelled_at,
      tr.issue_code,
      tr.issue_notes,
      tr.pickup_proofs,
      tr.delivery_proofs,
      tr.pickup_otp_required,
      tr.pickup_otp_verified,
      tr.delivery_otp_required,
      tr.delivery_otp_verified,
      tr.actual_weight_kg,
      tr.created_at,
      tr.updated_at,
      json_build_object(
        'id', req.id,
        'farmer_id', req.farmer_id,
        'crop_id', req.crop_id,
        'quantity', req.quantity,
        'quantity_unit', req.quantity_unit,
        'pickup_location', req.pickup_location,
        'pickup_village', req.pickup_village,
        'preferred_date', req.preferred_date,
        'preferred_time', req.preferred_time,
        'drop_location', req.drop_location,
        'fare_estimate', req.fare_estimate,
        'notes', req.notes
      ) as transport_request,
      json_build_object(
        'full_name', pf.full_name,
        'village', pf.village,
        'district', pf.district,
        'phone', pf.phone
      ) as farmer,
      json_build_object(
        'crop_name', c.crop_name,
        'variety', c.variety
      ) as crop
    from public.trips tr
    join public.transport_requests req on req.id = tr.transport_request_id
    left join public.profiles pf on pf.id = req.farmer_id
    left join public.crops c on c.id = req.crop_id
    where tr.transporter_id = p_transporter_id
      and (p_status_filter is null or cardinality(p_status_filter) = 0 or tr.status = any(p_status_filter))
    order by tr.assigned_at desc
  ) t
  into result;
  return coalesce(result, '[]'::json);
end;
$$;

-- RPC: Get single trip with context
create or replace function public.get_trip_detail_with_context(p_trip_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select row_to_json(t)
  from (
    select
      tr.id,
      tr.transport_request_id,
      tr.transporter_id,
      tr.status,
      tr.assigned_at,
      tr.en_route_at,
      tr.arrived_at,
      tr.picked_up_at,
      tr.in_transit_at,
      tr.delivered_at,
      tr.cancelled_at,
      tr.issue_code,
      tr.issue_notes,
      tr.pickup_proofs,
      tr.delivery_proofs,
      tr.pickup_otp_required,
      tr.pickup_otp_verified,
      tr.delivery_otp_required,
      tr.delivery_otp_verified,
      tr.actual_weight_kg,
      tr.created_at,
      tr.updated_at,
      json_build_object(
        'id', req.id,
        'farmer_id', req.farmer_id,
        'crop_id', req.crop_id,
        'quantity', req.quantity,
        'quantity_unit', req.quantity_unit,
        'pickup_location', req.pickup_location,
        'pickup_village', req.pickup_village,
        'preferred_date', req.preferred_date,
        'preferred_time', req.preferred_time,
        'drop_location', req.drop_location,
        'fare_estimate', req.fare_estimate,
        'notes', req.notes
      ) as transport_request,
      json_build_object(
        'full_name', pf.full_name,
        'village', pf.village,
        'district', pf.district,
        'phone', pf.phone
      ) as farmer,
      json_build_object(
        'crop_name', c.crop_name,
        'variety', c.variety
      ) as crop
    from public.trips tr
    join public.transport_requests req on req.id = tr.transport_request_id
    left join public.profiles pf on pf.id = req.farmer_id
    left join public.crops c on c.id = req.crop_id
    where tr.id = p_trip_id
  ) t
  into result;
  return result;
end;
$$;

-- RPC: Get farmer orders with buyer and crop context (denormalized, single query)
create or replace function public.get_farmer_orders_with_context(p_farmer_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select coalesce(json_agg(row_to_json(t)), '[]'::json)
  from (
    select
      o.id,
      o.buyer_id,
      o.crop_id,
      o.quantity,
      o.quantity_unit,
      o.price_offered,
      o.status,
      o.payment_status,
      o.delivery_date,
      o.delivery_address,
      o.notes,
      o.created_at,
      o.updated_at,
      json_build_object(
        'name', b.name,
        'company_name', b.company_name,
        'phone', b.phone,
        'district', b.district
      ) as buyer,
      json_build_object(
        'crop_name', c.crop_name,
        'variety', c.variety
      ) as crop
    from public.market_orders o
    join public.buyers b on b.id = o.buyer_id
    left join public.crops c on c.id = o.crop_id
    where o.farmer_id = p_farmer_id
    order by o.created_at desc
  ) t
  into result;
  return coalesce(result, '[]'::json);
end;
$$;
