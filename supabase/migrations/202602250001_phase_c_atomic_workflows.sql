-- Phase C: Atomic workflows and status write lock
-- 1) Trigger function to block direct status updates unless RPC flag is set OR admin
CREATE OR REPLACE FUNCTION public.block_status_update_unless_rpc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      -- allow when RPC flag is set
      BEGIN
        IF current_setting('app.rpc', true) = 'true' THEN
          RETURN NEW;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- ignore
      END;

      IF public.is_admin() THEN
        RETURN NEW;
      END IF;

      RAISE EXCEPTION 'Direct status updates are not allowed. Use RPC.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to relevant tables (idempotent)
DROP TRIGGER IF EXISTS trg_block_status_update_trips ON public.trips;
CREATE TRIGGER trg_block_status_update_trips
BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.block_status_update_unless_rpc();

DROP TRIGGER IF EXISTS trg_block_status_update_transport_requests ON public.transport_requests;
CREATE TRIGGER trg_block_status_update_transport_requests
BEFORE UPDATE ON public.transport_requests
FOR EACH ROW EXECUTE FUNCTION public.block_status_update_unless_rpc();

DROP TRIGGER IF EXISTS trg_block_status_update_market_orders ON public.market_orders;
CREATE TRIGGER trg_block_status_update_market_orders
BEFORE UPDATE ON public.market_orders
FOR EACH ROW EXECUTE FUNCTION public.block_status_update_unless_rpc();

-- 2) Transition validation helpers
CREATE OR REPLACE FUNCTION public.assert_valid_trip_transition(old_status text, new_status text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF old_status = new_status THEN
    RETURN;
  END IF;
  IF old_status = 'created' AND new_status NOT IN ('accepted','cancelled') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  ELSIF old_status = 'accepted' AND new_status NOT IN ('en_route','cancelled') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  ELSIF old_status = 'en_route' AND new_status NOT IN ('arrived','cancelled') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  ELSIF old_status = 'arrived' AND new_status NOT IN ('picked_up','cancelled') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  ELSIF old_status = 'picked_up' AND new_status NOT IN ('in_transit','delivered','cancelled','issue') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  ELSIF old_status = 'in_transit' AND new_status NOT IN ('delivered','cancelled','issue') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_valid_order_transition(old_status text, new_status text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF old_status = new_status THEN RETURN; END IF;
  IF old_status = 'pending' AND new_status NOT IN ('accepted','rejected','cancelled') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF old_status = 'accepted' AND new_status NOT IN ('packed','cancelled') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF old_status = 'packed' AND new_status NOT IN ('dispatched','cancelled') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF old_status = 'dispatched' AND new_status NOT IN ('delivered','cancelled') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_valid_transport_request_transition(old_status text, new_status text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF old_status = new_status THEN RETURN; END IF;
  IF old_status = 'requested' AND new_status NOT IN ('accepted','cancelled') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  IF old_status = 'accepted' AND new_status NOT IN ('en_route','cancelled') THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
END;
$$;

-- 3) accept_transport_load_v1 RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.accept_transport_load_v1(p_transport_request_id uuid, p_vehicle_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  existing_trip RECORD;
  new_trip_id uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  IF NOT (public.is_admin() OR current_role() = 'logistics') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO req FROM public.transport_requests WHERE id = p_transport_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF req.status NOT IN ('requested','open') THEN
    -- Already accepted?
    SELECT id INTO existing_trip FROM public.trips WHERE transport_request_id = p_transport_request_id LIMIT 1;
    IF found THEN
      RETURN jsonb_build_object('trip_id', existing_trip.id, 'new_status', req.status);
    END IF;
    RAISE EXCEPTION 'ALREADY_ASSIGNED';
  END IF;

  -- verify vehicle ownership if provided
  IF p_vehicle_id IS NOT NULL THEN
    IF NOT public.is_admin() THEN
      PERFORM 1 FROM public.vehicles WHERE id = p_vehicle_id AND transporter_id = auth.uid();
      IF NOT FOUND THEN
        RAISE EXCEPTION 'VEHICLE_NOT_OWNED';
      END IF;
    END IF;
  END IF;

  -- create trip
  INSERT INTO public.trips (transport_request_id, transporter_id, vehicle_id, status, created_at, updated_at)
  VALUES (p_transport_request_id, auth.uid(), p_vehicle_id, 'accepted', now(), now())
  RETURNING id INTO new_trip_id;

  UPDATE public.transport_requests SET status = 'accepted', updated_at = now() WHERE id = p_transport_request_id;

  INSERT INTO public.transport_status_events (transport_request_id, trip_id, actor_id, actor_role, old_status, new_status, created_at)
  VALUES (p_transport_request_id, new_trip_id, auth.uid(), current_role(), req.status, 'accepted', now());

  -- notify farmer
  IF req.farmer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, created_at)
    VALUES (req.farmer_id, 'Load accepted', 'Your load has been accepted by a transporter', false, now());
  END IF;

  RETURN jsonb_build_object('trip_id', new_trip_id, 'new_status', 'accepted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_transport_load_v1(uuid, uuid) TO authenticated;

-- 4) update_trip_status_v1 RPC
CREATE OR REPLACE FUNCTION public.update_trip_status_v1(p_trip_id uuid, p_new_status text, p_proof_url text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  old_status text;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO t FROM public.trips WHERE id = p_trip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  old_status := t.status;
  IF old_status = p_new_status THEN
    RETURN jsonb_build_object('trip_id', p_trip_id, 'status', old_status);
  END IF;

  PERFORM public.assert_valid_trip_transition(old_status, p_new_status);

  -- authorization: transporter assigned or admin
  IF NOT (public.is_admin() OR t.transporter_id = auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- proof checks
  IF p_new_status IN ('picked_up','delivered') AND (p_proof_url IS NULL OR length(p_proof_url)=0) THEN
    RAISE EXCEPTION 'PROOF_REQUIRED';
  END IF;

  UPDATE public.trips SET status = p_new_status, updated_at = now() WHERE id = p_trip_id;

  INSERT INTO public.transport_status_events (transport_request_id, trip_id, actor_id, actor_role, old_status, new_status, proof_url, metadata, created_at)
  VALUES (t.transport_request_id, p_trip_id, auth.uid(), current_role(), old_status, p_new_status, p_proof_url, p_metadata, now());

  -- sync transport_request status where appropriate
  IF p_new_status = 'delivered' THEN
    UPDATE public.transport_requests SET status = 'delivered', updated_at = now() WHERE id = t.transport_request_id;
  ELSIF p_new_status = 'picked_up' THEN
    UPDATE public.transport_requests SET status = 'picked_up', updated_at = now() WHERE id = t.transport_request_id;
  ELSIF p_new_status = 'en_route' THEN
    UPDATE public.transport_requests SET status = 'en_route', updated_at = now() WHERE id = t.transport_request_id;
  END IF;

  RETURN jsonb_build_object('trip_id', p_trip_id, 'status', p_new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_trip_status_v1(uuid, text, text, jsonb) TO authenticated;

-- 5) farmer_update_order_status_v1 RPC
CREATE OR REPLACE FUNCTION public.farmer_update_order_status_v1(p_order_id uuid, p_new_status text, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ord RECORD;
  old_status text;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO ord FROM public.market_orders WHERE id = p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  old_status := ord.status;
  IF old_status = p_new_status THEN RETURN jsonb_build_object('order_id', p_order_id, 'status', old_status); END IF;

  PERFORM public.assert_valid_order_transition(old_status, p_new_status);

  -- Authorization: ensure caller is the farmer owning the listing/order or admin
  IF NOT (public.is_admin() OR ord.farmer_id = auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.market_orders SET status = p_new_status, updated_at = now(), note = p_note WHERE id = p_order_id;

  INSERT INTO public.order_status_events (order_id, actor_id, old_status, new_status, note, created_at)
  VALUES (p_order_id, auth.uid(), old_status, p_new_status, p_note, now());

  -- notify buyer
  IF ord.buyer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, created_at)
    VALUES (ord.buyer_id, 'Order update', 'Your order status changed', false, now());
  END IF;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', p_new_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.farmer_update_order_status_v1(uuid, text, text) TO authenticated;

-- End of migration

