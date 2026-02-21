-- accept_transport_load: Atomic accept of transport request (trip + status event + farmer notification)
-- Caller must have role 'logistics' (checked by edge function before invoking)
create or replace function public.accept_transport_load(
  p_transport_request_id uuid,
  p_vehicle_id uuid default null,
  p_caller_id uuid default auth.uid()
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_trip_id uuid;
  v_now timestamptz := now();
  v_result json;
begin
  select id, farmer_id, status, assigned_trip_id
  into v_request
  from public.transport_requests
  where id = p_transport_request_id
  for update;

  if not found then
    raise exception 'Transport request not found';
  end if;
  if v_request.assigned_trip_id is not null then
    raise exception 'ALREADY_ASSIGNED: This load has already been accepted';
  end if;
  if v_request.status != 'requested' then
    raise exception 'Invalid status: % (expected requested)', v_request.status;
  end if;

  insert into public.trips (
    transport_request_id,
    transporter_id,
    status,
    assigned_at
  )
  values (
    p_transport_request_id,
    p_caller_id,
    'assigned',
    v_now
  )
  returning id into v_trip_id;

  update public.transport_requests
  set
    assigned_trip_id = v_trip_id,
    transporter_id = p_caller_id,
    vehicle_id = p_vehicle_id,
    status = 'assigned',
    assigned_at = v_now
  where id = p_transport_request_id
    and status = 'requested'
    and assigned_trip_id is null;

  if not found then
    raise exception 'Concurrency conflict: load was accepted by another transporter';
  end if;

  insert into public.transport_status_events (
    transport_request_id,
    trip_id,
    actor_id,
    actor_role,
    old_status,
    new_status,
    note
  )
  values (
    p_transport_request_id,
    v_trip_id,
    p_caller_id,
    'transporter',
    'requested',
    'assigned',
    'Load accepted'
  );

  insert into public.notifications (
    user_id,
    title,
    message,
    is_read,
    type
  )
  values (
    v_request.farmer_id,
    'Load accepted',
    'A transporter has accepted your transport request.',
    false,
    'pickup'
  );

  select json_build_object(
    'trip_id', v_trip_id,
    'new_status', 'assigned'
  ) into v_result;
  return v_result;
end;
$$;
