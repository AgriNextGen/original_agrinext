-- Phase C4: State Machine RPC Enforcement
-- Creates update_trip_status_v1 and update_order_status_v1 RPCs
-- Drops direct UPDATE policies; all status changes go through RPCs

-- ============================================================
-- PART A: TRIP STATE MACHINE RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_trip_status_v1(
  p_trip_id uuid,
  p_new_status text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trip record;
  v_caller_id uuid := auth.uid();
  v_caller_role text := public.current_role();
  v_allowed text[];
  v_ts_col text;
  v_now timestamptz := now();
BEGIN
  -- Lock the row
  SELECT id, transporter_id, status, transport_request_id
  INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;

  -- Authorization: must be trip transporter or admin
  IF v_trip.transporter_id != v_caller_id AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: only assigned transporter or admin can update trip status';
  END IF;

  -- Admin-only cancel from any state
  IF p_new_status = 'cancelled' AND v_caller_role != 'admin'
     AND v_trip.status NOT IN ('assigned','en_route','arrived','picked_up','in_transit','issue') THEN
    RAISE EXCEPTION 'Only admin can cancel from status: %', v_trip.status;
  END IF;

  -- Transition validation
  v_allowed := CASE v_trip.status
    WHEN 'assigned'  THEN ARRAY['en_route','cancelled']
    WHEN 'en_route'  THEN ARRAY['arrived','cancelled']
    WHEN 'arrived'   THEN ARRAY['picked_up','cancelled']
    WHEN 'picked_up' THEN ARRAY['in_transit','delivered','cancelled','issue']
    WHEN 'in_transit' THEN ARRAY['delivered','cancelled','issue']
    WHEN 'issue'     THEN ARRAY['in_transit','delivered','cancelled']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_trip.status, p_new_status;
  END IF;

  -- Determine timestamp column to set
  v_ts_col := CASE p_new_status
    WHEN 'en_route'  THEN 'en_route_at'
    WHEN 'arrived'   THEN 'arrived_at'
    WHEN 'picked_up' THEN 'picked_up_at'
    WHEN 'delivered'  THEN 'delivered_at'
    WHEN 'cancelled'  THEN 'cancelled_at'
    ELSE NULL
  END;

  -- Update the trip row
  UPDATE public.trips
  SET status = p_new_status,
      updated_at = v_now,
      en_route_at   = CASE WHEN p_new_status = 'en_route'  THEN v_now ELSE en_route_at END,
      arrived_at    = CASE WHEN p_new_status = 'arrived'   THEN v_now ELSE arrived_at END,
      picked_up_at  = CASE WHEN p_new_status = 'picked_up' THEN v_now ELSE picked_up_at END,
      delivered_at  = CASE WHEN p_new_status = 'delivered'  THEN v_now ELSE delivered_at END,
      cancelled_at  = CASE WHEN p_new_status = 'cancelled'  THEN v_now ELSE cancelled_at END
  WHERE id = p_trip_id;

  -- Insert transport_status_event
  INSERT INTO public.transport_status_events (
    transport_request_id, trip_id, actor_id, actor_role,
    old_status, new_status, note
  ) VALUES (
    v_trip.transport_request_id, p_trip_id, v_caller_id,
    COALESCE(v_caller_role, 'unknown'),
    v_trip.status, p_new_status,
    COALESCE(p_metadata->>'note', NULL)
  );

  -- Audit log
  PERFORM public.insert_audit_log(
    'trip_status_change',
    'trips',
    p_trip_id,
    jsonb_build_object(
      'old_status', v_trip.status,
      'new_status', p_new_status,
      'metadata', p_metadata
    )
  );

  -- Return the result
  RETURN jsonb_build_object(
    'trip_id', p_trip_id,
    'old_status', v_trip.status,
    'new_status', p_new_status,
    'updated_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_trip_status_v1(uuid, text, jsonb) TO authenticated;

-- ============================================================
-- PART B: ORDER STATE MACHINE RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_order_status_v1(
  p_order_id uuid,
  p_new_status text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_order record;
  v_caller_id uuid := auth.uid();
  v_caller_role text := public.current_role();
  v_buyer_user_id uuid;
  v_allowed text[];
  v_now timestamptz := now();
BEGIN
  -- Lock the row
  SELECT id, buyer_id, farmer_id, status
  INTO v_order
  FROM public.market_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Resolve buyer_id -> user_id via buyers table
  SELECT user_id INTO v_buyer_user_id
  FROM public.buyers
  WHERE id = v_order.buyer_id;

  -- Authorization
  IF v_caller_role = 'admin' THEN
    -- admin can do anything
    NULL;
  ELSIF v_order.farmer_id = v_caller_id THEN
    -- farmer can update own sales (except cancel after shipped)
    NULL;
  ELSIF v_buyer_user_id = v_caller_id THEN
    -- buyer can cancel before shipped
    IF p_new_status = 'cancelled' AND v_order.status IN ('shipped','delivered','completed') THEN
      RAISE EXCEPTION 'Buyer cannot cancel after shipment';
    END IF;
  ELSE
    RAISE EXCEPTION 'Forbidden: only order farmer, buyer, or admin can update status';
  END IF;

  -- Transition validation
  v_allowed := CASE v_order.status
    WHEN 'placed'    THEN ARRAY['confirmed','cancelled']
    WHEN 'confirmed' THEN ARRAY['packed','cancelled']
    WHEN 'packed'    THEN ARRAY['shipped','cancelled']
    WHEN 'shipped'   THEN ARRAY['delivered']
    WHEN 'delivered' THEN ARRAY['completed']
    ELSE ARRAY[]::text[]
  END;

  -- Admin can cancel from any state
  IF p_new_status = 'cancelled' AND v_caller_role = 'admin' THEN
    -- always allowed for admin
    NULL;
  ELSIF NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid transition: % -> %', v_order.status, p_new_status;
  END IF;

  -- Update
  UPDATE public.market_orders
  SET status = p_new_status,
      updated_at = v_now
  WHERE id = p_order_id;

  -- Audit log
  PERFORM public.insert_audit_log(
    'order_status_change',
    'market_orders',
    p_order_id,
    jsonb_build_object(
      'old_status', v_order.status,
      'new_status', p_new_status,
      'metadata', p_metadata
    )
  );

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'old_status', v_order.status,
    'new_status', p_new_status,
    'updated_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_order_status_v1(uuid, text, jsonb) TO authenticated;

-- ============================================================
-- PART C: DROP DIRECT UPDATE POLICIES
-- ============================================================

-- Trips: remove admin direct UPDATE (all changes via RPC now)
DROP POLICY IF EXISTS trips_admin_update ON public.trips;

-- Market orders: remove admin direct UPDATE (all changes via RPC now)
DROP POLICY IF EXISTS market_orders_update ON public.market_orders;
