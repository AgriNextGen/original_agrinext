-- =============================================================
-- Phase 1A Migration 2: Unified update_trip_status_v1 RPC
-- Replaces conflicting overloaded versions with one authoritative
-- state machine and canonical status vocabulary.
-- =============================================================

BEGIN;

-- Fix status change audit trigger function to match current
-- audit.log_workflow_event_v1 signature (13 args).
CREATE OR REPLACE FUNCTION audit.on_status_change_minimal_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_req uuid := gen_random_uuid();
  v_actor uuid := NULL;
  v_table text := TG_TABLE_NAME;
  v_metadata jsonb;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    BEGIN
      v_actor := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_actor := NULL;
    END;

    v_metadata := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
    v_old := jsonb_build_object('status', OLD.status, 'updated_at', OLD.updated_at);
    v_new := jsonb_build_object('status', NEW.status, 'updated_at', NEW.updated_at);

    BEGIN
      PERFORM audit.log_workflow_event_v1(
        v_req, v_table, NEW.id, upper(v_table || '_STATUS_CHANGED'),
        v_actor, NULL, NULL, NULL, NULL, NULL, NULL, NULL, v_metadata
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      PERFORM audit.log_audit_log_v1(
        v_req, v_table, NEW.id, 'status_changed',
        v_actor, NULL, NULL, NULL, v_old, v_new, '{}'::jsonb
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Remove all conflicting/legacy versions first.
DROP FUNCTION IF EXISTS public.update_trip_status_v1(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.update_trip_status_v1(uuid, text, uuid, numeric, numeric, uuid);
DROP FUNCTION IF EXISTS public.update_trip_status_v1(uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS public.update_trip_status_v1_with_audit(uuid, text);

CREATE OR REPLACE FUNCTION public.update_trip_status_v1(
  p_trip_id uuid,
  p_new_status text,
  p_actor_user_id uuid,
  p_photo_url text DEFAULT NULL,
  p_latitude float DEFAULT NULL,
  p_longitude float DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip public.trips%ROWTYPE;
  v_current_status text;
  v_actor_role text;
  v_now timestamptz := now();
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  IF p_new_status NOT IN (
    'created', 'accepted', 'pickup_done', 'in_transit',
    'delivered', 'completed', 'cancelled'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATUS',
      'message', 'Unknown status value: ' || coalesce(p_new_status, '<null>')
    );
  END IF;

  SELECT *
  INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'Trip not found: ' || p_trip_id
    );
  END IF;

  v_current_status := v_trip.status;

  IF NOT (
    public.is_admin()
    OR (v_trip.transporter_id IS NOT NULL AND v_trip.transporter_id = p_actor_user_id)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'message', 'Only assigned transporter or admin can update trip status'
    );
  END IF;

  IF NOT (
    (v_current_status = 'created'     AND p_new_status IN ('accepted', 'cancelled'))
    OR (v_current_status = 'accepted'    AND p_new_status IN ('pickup_done', 'cancelled'))
    OR (v_current_status = 'pickup_done' AND p_new_status IN ('in_transit', 'cancelled'))
    OR (v_current_status = 'in_transit'  AND p_new_status IN ('delivered', 'cancelled'))
    OR (v_current_status = 'delivered'   AND p_new_status = 'completed')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TRANSITION',
      'message', 'Cannot transition from ' || v_current_status || ' to ' || p_new_status
    );
  END IF;

  IF p_new_status IN ('pickup_done', 'delivered') THEN
    IF p_photo_url IS NULL OR btrim(p_photo_url) = '' OR p_latitude IS NULL OR p_longitude IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'PROOF_REQUIRED',
        'message', p_new_status || ' requires photo_url, latitude, and longitude'
      );
    END IF;
  END IF;

  UPDATE public.trips
  SET
    status = p_new_status,
    updated_at = v_now,
    picked_up_at = CASE WHEN p_new_status = 'pickup_done' THEN v_now ELSE picked_up_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN v_now ELSE delivered_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN v_now ELSE cancelled_at END,
    pickup_proofs = CASE
      WHEN p_new_status = 'pickup_done' THEN
        coalesce(pickup_proofs, '{}'::jsonb) || jsonb_build_object(
          'photo_url', p_photo_url,
          'latitude', p_latitude,
          'longitude', p_longitude,
          'captured_at', v_now,
          'notes', p_notes
        )
      ELSE pickup_proofs
    END,
    delivery_proofs = CASE
      WHEN p_new_status = 'delivered' THEN
        coalesce(delivery_proofs, '{}'::jsonb) || jsonb_build_object(
          'photo_url', p_photo_url,
          'latitude', p_latitude,
          'longitude', p_longitude,
          'captured_at', v_now,
          'notes', p_notes
        )
      ELSE delivery_proofs
    END
  WHERE id = p_trip_id;

  v_actor_role := CASE
    WHEN public.is_admin() THEN 'admin'
    WHEN v_trip.transporter_id = p_actor_user_id THEN 'transporter'
    ELSE 'unknown'
  END;

  INSERT INTO public.transport_status_events (
    trip_id,
    transport_request_id,
    actor_id,
    actor_role,
    old_status,
    new_status,
    status,
    geo_lat,
    geo_long,
    note,
    created_at
  ) VALUES (
    p_trip_id,
    v_trip.transport_request_id,
    p_actor_user_id,
    v_actor_role,
    v_current_status,
    p_new_status,
    p_new_status,
    p_latitude,
    p_longitude,
    p_notes,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'previous_status', v_current_status,
    'new_status', p_new_status,
    'transitioned_at', v_now
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INTERNAL_ERROR',
      'message', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_trip_status_v1(uuid, text, uuid, text, float, float, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_trip_status_v1(uuid, text, uuid, text, float, float, text) TO authenticated;

COMMIT;
