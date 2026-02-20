-- Phase 2: Logistics Engine (additive)
-- File: supabase/migrations/202602261200_phase_2_logistics_engine.sql

-- 1) Ensure status enum values (create or add values)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
    CREATE TYPE trip_status AS ENUM ('created','accepted','pickup_done','in_transit','delivered','completed','cancelled');
  ELSE
    BEGIN ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'created'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'accepted'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'pickup_done'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'in_transit'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'delivered'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'completed'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'cancelled'; EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transport_request_status') THEN
    CREATE TYPE transport_request_status AS ENUM ('open','accepted','in_progress','completed','cancelled','requested','assigned');
  ELSE
    BEGIN ALTER TYPE transport_request_status ADD VALUE IF NOT EXISTS 'open'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE transport_request_status ADD VALUE IF NOT EXISTS 'accepted'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE transport_request_status ADD VALUE IF NOT EXISTS 'in_progress'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE transport_request_status ADD VALUE IF NOT EXISTS 'completed'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE transport_request_status ADD VALUE IF NOT EXISTS 'cancelled'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE transport_request_status ADD VALUE IF NOT EXISTS 'requested'; EXCEPTION WHEN duplicate_object THEN END;
    BEGIN ALTER TYPE transport_request_status ADD VALUE IF NOT EXISTS 'assigned'; EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 2) Add columns to public.trips (additive)
ALTER TABLE IF EXISTS public.trips
  ADD COLUMN IF NOT EXISTS status trip_status DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS transport_request_id uuid,
  ADD COLUMN IF NOT EXISTS transporter_id uuid,
  ADD COLUMN IF NOT EXISTS pickup_proof_file_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_proof_file_id uuid,
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- add FK for proofs if public.files table exists
DO $$
BEGIN
  IF to_regclass('public.files') IS NOT NULL AND to_regclass('public.trips') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.trips ADD CONSTRAINT trips_pickup_proof_fkey FOREIGN KEY (pickup_proof_file_id) REFERENCES public.files(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER TABLE public.trips ADD CONSTRAINT trips_delivery_proof_fkey FOREIGN KEY (delivery_proof_file_id) REFERENCES public.files(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 3) Add columns to public.transport_requests (additive)
ALTER TABLE IF EXISTS public.transport_requests
  ADD COLUMN IF NOT EXISTS status transport_request_status DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS accepted_trip_id uuid,
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS transporter_id uuid,
  ADD COLUMN IF NOT EXISTS vehicle_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

-- add FK to trips if table exists
DO $$
BEGIN
  IF to_regclass('public.trips') IS NOT NULL AND to_regclass('public.transport_requests') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.transport_requests ADD CONSTRAINT tr_accepted_trip_fkey FOREIGN KEY (accepted_trip_id) REFERENCES public.trips(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 4) Ensure transport_status_events exists with required columns (add missing columns)
CREATE TABLE IF NOT EXISTS public.transport_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  transport_request_id uuid,
  status text NOT NULL,
  actor_id uuid NOT NULL,
  actor_role text NULL,
  proof_file_id uuid NULL,
  geo_lat numeric NULL,
  geo_long numeric NULL,
  note text NULL,
  old_status text NULL,
  new_status text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.files') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.transport_status_events ADD CONSTRAINT tse_proof_file_fkey FOREIGN KEY (proof_file_id) REFERENCES public.files(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_trips_transporter_status_updated ON public.trips (transporter_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_transport_request_id ON public.trips (transport_request_id);
CREATE INDEX IF NOT EXISTS idx_tr_requests_assigned_at_status ON public.transport_requests (assigned_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_tse_trip_created_at ON public.transport_status_events (trip_id, created_at DESC);

-- 6) Partial unique index to help prevent multiple active trips for same transport_request (non-cancelled)
CREATE UNIQUE INDEX IF NOT EXISTS uq_trips_transport_request_active ON public.trips (transport_request_id)
  WHERE status IS DISTINCT FROM 'cancelled';

-- 7) Enable RLS and policies
ALTER TABLE IF EXISTS public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transport_status_events ENABLE ROW LEVEL SECURITY;

-- transport_requests policies
CREATE POLICY IF NOT EXISTS tr_requests_select_owner_or_admin ON public.transport_requests
  FOR SELECT USING (
    is_admin()
    OR (auth.uid() IS NOT NULL AND farmer_id::text = auth.uid()::text)
    OR (auth.uid() IS NOT NULL AND transporter_id::text = auth.uid()::text)
    OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'agent' AND is_agent_assigned(farmer_id, auth.uid())))
  );

CREATE POLICY IF NOT EXISTS tr_requests_insert_owner ON public.transport_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND farmer_id::text = auth.uid()::text);

CREATE POLICY IF NOT EXISTS tr_requests_update_rpc_or_admin ON public.transport_requests
  FOR UPDATE USING (is_admin()) WITH CHECK (current_setting('app.rpc','false') = 'true' OR is_admin());

-- trips policies
CREATE POLICY IF NOT EXISTS trips_select_owner_or_admin ON public.trips
  FOR SELECT USING (
    is_admin()
    OR (auth.uid() IS NOT NULL AND transporter_id::text = auth.uid()::text)
    OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.transport_requests tr WHERE tr.id = transport_request_id AND tr.farmer_id::text = auth.uid()::text))
  );

CREATE POLICY IF NOT EXISTS trips_insert_rpc_or_admin ON public.trips
  FOR INSERT USING (is_admin()) WITH CHECK (current_setting('app.rpc','false') = 'true' OR is_admin());

CREATE POLICY IF NOT EXISTS trips_update_rpc_or_admin ON public.trips
  FOR UPDATE USING (is_admin()) WITH CHECK (current_setting('app.rpc','false') = 'true' OR is_admin());

-- transport_status_events policies
CREATE POLICY IF NOT EXISTS tse_select ON public.transport_status_events
  FOR SELECT USING (
    is_admin()
    OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.trips t WHERE t.id = transport_status_events.trip_id AND t.transporter_id::text = auth.uid()::text))
    OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.transport_requests tr WHERE tr.id = transport_status_events.transport_request_id AND tr.farmer_id::text = auth.uid()::text))
  );

CREATE POLICY IF NOT EXISTS tse_insert_rpc_or_actor ON public.transport_status_events
  FOR INSERT USING (is_admin() OR current_setting('app.rpc','false') = 'true') WITH CHECK (is_admin() OR current_setting('app.rpc','false') = 'true');

-- 8) updated_at trigger helper
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.trips') IS NOT NULL THEN
    BEGIN
      DROP TRIGGER IF EXISTS trg_trips_touch ON public.trips;
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN
      CREATE TRIGGER trg_trips_touch BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF to_regclass('public.transport_requests') IS NOT NULL THEN
    BEGIN
      DROP TRIGGER IF EXISTS trg_tr_requests_touch ON public.transport_requests;
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN
      CREATE TRIGGER trg_tr_requests_touch BEFORE UPDATE ON public.transport_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 9) RPCs: accept_transport_load_v2, update_trip_status_v1, cancel_trip_v1, read RPCs
-- accept_transport_load_v2
CREATE OR REPLACE FUNCTION public.accept_transport_load_v2(
  p_transport_request_id uuid,
  p_vehicle_id uuid DEFAULT NULL,
  p_caller_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_req record;
  v_trip uuid;
  v_now timestamptz := now();
  v_request_id uuid := public.new_request_id_v1();
BEGIN
  PERFORM set_config('app.rpc','true',true);

  SELECT id, farmer_id, status, accepted_trip_id, transporter_id
    INTO v_req
    FROM public.transport_requests
    WHERE id = p_transport_request_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found';
  END IF;

  IF v_req.accepted_trip_id IS NOT NULL THEN
    IF v_req.transporter_id IS NOT NULL AND v_req.transporter_id::text = p_caller_id::text THEN
      RETURN jsonb_build_object('trip_id', v_req.accepted_trip_id, 'new_status', 'accepted', 'request_id', v_request_id);
    END IF;
    RAISE EXCEPTION 'ALREADY_ASSIGNED';
  END IF;

  IF v_req.status NOT IN ('open','requested') THEN
    RAISE EXCEPTION 'INVALID_STATUS: %', v_req.status;
  END IF;

  INSERT INTO public.trips (transport_request_id, transporter_id, status, request_id, assigned_at)
    VALUES (p_transport_request_id, p_caller_id, 'accepted', v_request_id, v_now)
    RETURNING id INTO v_trip;

  UPDATE public.transport_requests
    SET accepted_trip_id = v_trip, transporter_id = p_caller_id, vehicle_id = p_vehicle_id, status = 'accepted', assigned_at = v_now
    WHERE id = p_transport_request_id;

  INSERT INTO public.transport_status_events (trip_id, transport_request_id, status, actor_id, actor_role, old_status, new_status, note, created_at)
    VALUES (v_trip, p_transport_request_id, 'accepted', p_caller_id, 'transporter', v_req.status, 'accepted', 'Load accepted', v_now);

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, request_id, payload, created_at)
      VALUES (p_caller_id, 'LOAD_ACCEPTED', v_request_id, jsonb_build_object('trip_id', v_trip, 'transport_request_id', p_transport_request_id)::jsonb, v_now);
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, type)
      VALUES (v_req.farmer_id, 'Load accepted', 'A transporter accepted your transport request', false, 'pickup');
  END IF;

  RETURN jsonb_build_object('trip_id', v_trip, 'new_status', 'accepted', 'request_id', v_request_id);
END;
$$;

-- update_trip_status_v1
CREATE OR REPLACE FUNCTION public.update_trip_status_v1(
  p_trip_id uuid,
  p_new_status text,
  p_proof_file_id uuid DEFAULT NULL,
  p_geo_lat numeric DEFAULT NULL,
  p_geo_long numeric DEFAULT NULL,
  p_caller_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_trip record;
  v_now timestamptz := now();
  v_request_id uuid := public.new_request_id_v1();
  v_old_status text;
BEGIN
  PERFORM set_config('app.rpc','true',true);

  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;

  v_old_status := v_trip.status;

  IF NOT (is_admin() OR (p_caller_id::text = v_trip.transporter_id::text)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Validate transitions and proof requirements
  IF v_old_status = 'accepted' AND p_new_status = 'pickup_done' THEN
    IF p_proof_file_id IS NULL THEN RAISE EXCEPTION 'PROOF_REQUIRED: pickup'; END IF;
  ELSIF v_old_status = 'pickup_done' AND p_new_status = 'in_transit' THEN
    NULL;
  ELSIF v_old_status = 'in_transit' AND p_new_status = 'delivered' THEN
    IF p_proof_file_id IS NULL THEN RAISE EXCEPTION 'PROOF_REQUIRED: delivery'; END IF;
  ELSIF v_old_status = 'delivered' AND p_new_status = 'completed' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'INVALID_TRANSITION: % -> %', v_old_status, p_new_status;
  END IF;

  -- Proof ownership check
  IF p_proof_file_id IS NOT NULL AND to_regclass('public.files') IS NOT NULL THEN
    PERFORM 1 FROM public.files f WHERE f.id = p_proof_file_id AND (f.owner_user_id::text = p_caller_id::text OR is_admin());
    IF NOT FOUND THEN RAISE EXCEPTION 'PROOF_INVALID_OWNER'; END IF;
  END IF;

  -- Update trip and attach proofs
  IF p_new_status = 'pickup_done' THEN
    UPDATE public.trips SET status = 'pickup_done', pickup_proof_file_id = p_proof_file_id, updated_at = v_now WHERE id = p_trip_id;
  ELSIF p_new_status = 'in_transit' THEN
    UPDATE public.trips SET status = 'in_transit', updated_at = v_now WHERE id = p_trip_id;
  ELSIF p_new_status = 'delivered' THEN
    UPDATE public.trips SET status = 'delivered', delivery_proof_file_id = p_proof_file_id, updated_at = v_now WHERE id = p_trip_id;
  ELSIF p_new_status = 'completed' THEN
    UPDATE public.trips SET status = 'completed', updated_at = v_now WHERE id = p_trip_id;
  END IF;

  -- update transport_request status
  IF p_new_status IN ('pickup_done','in_transit') THEN
    UPDATE public.transport_requests SET status = 'in_progress' WHERE id = v_trip.transport_request_id;
  ELSIF p_new_status IN ('delivered','completed') THEN
    UPDATE public.transport_requests SET status = 'completed' WHERE id = v_trip.transport_request_id;
  END IF;

  -- insert transport_status_events
  INSERT INTO public.transport_status_events (trip_id, transport_request_id, status, actor_id, actor_role, proof_file_id, geo_lat, geo_long, old_status, new_status, created_at)
    VALUES (p_trip_id, v_trip.transport_request_id, p_new_status, p_caller_id, CASE WHEN is_admin() THEN 'admin' ELSE 'transporter' END, p_proof_file_id, p_geo_lat, p_geo_long, v_old_status, p_new_status, v_now);

  -- audit
  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, request_id, payload, created_at)
      VALUES (p_caller_id, 'TRIP_STATUS_UPDATED', v_request_id, jsonb_build_object('trip_id', p_trip_id, 'old_status', v_old_status, 'new_status', p_new_status, 'proof_file_id', p_proof_file_id, 'geo', jsonb_build_object('lat', p_geo_lat, 'long', p_geo_long))::jsonb, v_now);
  END IF;

  -- notifications
  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, type)
      VALUES ((SELECT farmer_id FROM public.transport_requests WHERE id = v_trip.transport_request_id), 'Trip update', format('Trip %s updated to %s', p_trip_id::text, p_new_status), false, 'shipment');
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', v_request_id);
END;
$$;

-- cancel_trip_v1
CREATE OR REPLACE FUNCTION public.cancel_trip_v1(
  p_trip_id uuid,
  p_reason text,
  p_caller_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_trip record;
  v_req record;
  v_now timestamptz := now();
  v_request_id uuid := public.new_request_id_v1();
BEGIN
  PERFORM set_config('app.rpc','true',true);
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;

  SELECT * INTO v_req FROM public.transport_requests WHERE id = v_trip.transport_request_id FOR UPDATE;

  -- authorization: transporter pre-pickup, farmer pre-pickup, admin anytime
  IF is_admin() THEN
    NULL;
  ELSIF p_caller_id::text = v_trip.transporter_id::text AND v_trip.status IN ('accepted') THEN
    -- transporter cancel before pickup
    UPDATE public.trips SET status = 'cancelled', cancelled_by = p_caller_id, cancelled_reason = p_reason, updated_at = v_now WHERE id = p_trip_id;
    UPDATE public.transport_requests SET accepted_trip_id = NULL, transporter_id = NULL, vehicle_id = NULL, status = 'open' WHERE id = v_trip.transport_request_id;
  ELSIF p_caller_id::text = v_req.farmer_id::text AND v_trip.status IN ('accepted') THEN
    -- farmer cancels pre-pickup -> request cancelled
    UPDATE public.trips SET status = 'cancelled', cancelled_by = p_caller_id, cancelled_reason = p_reason, updated_at = v_now WHERE id = p_trip_id;
    UPDATE public.transport_requests SET status = 'cancelled' WHERE id = v_trip.transport_request_id;
  ELSE
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO public.transport_status_events (trip_id, transport_request_id, status, actor_id, actor_role, note, old_status, new_status, created_at)
    VALUES (p_trip_id, v_trip.transport_request_id, 'cancelled', p_caller_id, CASE WHEN is_admin() THEN 'admin' ELSE 'actor' END, p_reason, v_trip.status, 'cancelled', v_now);

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, request_id, payload, created_at)
      VALUES (p_caller_id, 'TRIP_CANCELLED', v_request_id, jsonb_build_object('trip_id', p_trip_id, 'reason', p_reason)::jsonb, v_now);
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, type)
      VALUES (v_req.farmer_id, 'Trip cancelled', format('Trip %s was cancelled: %s', p_trip_id::text, p_reason), false, 'shipment');
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', v_request_id);
END;
$$;

-- Read RPCs (get_trips_with_context_v2, get_trip_detail_with_context_v1)
CREATE OR REPLACE FUNCTION public.get_trips_with_context_v2(p_transporter_id uuid DEFAULT auth.uid(), p_limit int DEFAULT 50)
RETURNS TABLE (
  trip_id uuid,
  transport_request_id uuid,
  status trip_status,
  transporter_id uuid,
  assigned_at timestamptz,
  updated_at timestamptz,
  latest_event jsonb
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT t.id, t.transport_request_id, t.status, t.transporter_id, t.assigned_at, t.updated_at,
    (SELECT jsonb_agg(jsonb_build_object('status', e.status, 'created_at', e.created_at, 'actor_id', e.actor_id) ORDER BY e.created_at DESC) FROM public.transport_status_events e WHERE e.trip_id = t.id LIMIT 10) AS latest_event
  FROM public.trips t
  WHERE (p_transporter_id IS NULL OR t.transporter_id = p_transporter_id)
  ORDER BY t.updated_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_trip_detail_with_context_v1(p_trip_id uuid)
RETURNS TABLE (
  trip_row jsonb,
  transport_request_row jsonb,
  events jsonb
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT to_jsonb(t.*), to_jsonb(tr.*),
    (SELECT jsonb_agg(jsonb_build_object('id', e.id, 'status', e.status, 'actor_id', e.actor_id, 'proof_file_id', e.proof_file_id, 'geo', jsonb_build_object('lat', e.geo_lat, 'long', e.geo_long), 'created_at', e.created_at) ORDER BY e.created_at ASC) FROM public.transport_status_events e WHERE e.trip_id = t.id)
  FROM public.trips t
  LEFT JOIN public.transport_requests tr ON tr.id = t.transport_request_id
  WHERE t.id = p_trip_id;
$$;

-- end migration

