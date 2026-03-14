-- ============================================================
-- P0 FIX: Booking Duplicate Guard + Capacity Concurrency + Expiry Persistence
-- Migration: 202603141800_p0_fix_booking_and_capacity.sql
--
-- Fixes:
--   1. book_shipment_to_trip_v1 — duplicate booking causes capacity double-count
--   2. accept_reverse_candidate_v1 — expired candidate status rolled back by exception
--   3. New RPCs: allocate_vehicle_capacity_v1 / release_vehicle_capacity_v1
--      for atomic, concurrency-safe capacity operations
--
-- Rules: Additive only. Fully backward compatible.
-- ============================================================

-- ============================================================
-- SECTION 1: Fix book_shipment_to_trip_v1 — guard against duplicate capacity inflation
-- ============================================================

CREATE OR REPLACE FUNCTION public.book_shipment_to_trip_v1(
  p_shipment_request_id uuid,
  p_unified_trip_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_sr          record;
  v_trip        record;
  v_booking_id  uuid;
  v_weight      numeric;
  v_volume      numeric;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_sr FROM shipment_requests WHERE id = p_shipment_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHIPMENT_NOT_FOUND'; END IF;

  IF v_sr.status NOT IN ('pending'::shipment_status, 'pooled'::shipment_status) THEN
    RAISE EXCEPTION 'INVALID_SHIPMENT_STATUS: %', v_sr.status;
  END IF;

  SELECT * INTO v_trip FROM unified_trips WHERE id = p_unified_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;

  IF v_trip.trip_status NOT IN ('planned'::unified_trip_status, 'assigned'::unified_trip_status) THEN
    RAISE EXCEPTION 'TRIP_NOT_BOOKABLE: %', v_trip.trip_status;
  END IF;

  v_weight := COALESCE(v_sr.weight_estimate_kg, 0);
  v_volume := COALESCE(v_sr.volume_estimate_cbm, 0);

  IF v_trip.capacity_total_kg IS NOT NULL
     AND (v_trip.capacity_used_kg + v_weight) > v_trip.capacity_total_kg THEN
    RAISE EXCEPTION 'INSUFFICIENT_CAPACITY: need % kg, available % kg',
      v_weight, (v_trip.capacity_total_kg - v_trip.capacity_used_kg);
  END IF;

  INSERT INTO shipment_bookings (
    shipment_request_id,
    unified_trip_id,
    booking_status,
    confirmed_at,
    weight_allocated_kg,
    volume_allocated_cbm
  ) VALUES (
    p_shipment_request_id,
    p_unified_trip_id,
    'confirmed'::booking_status,
    now(),
    v_weight,
    v_volume
  )
  ON CONFLICT (shipment_request_id, unified_trip_id) DO NOTHING
  RETURNING id INTO v_booking_id;

  -- Guard: if INSERT was a no-op (duplicate), skip all capacity updates
  IF v_booking_id IS NULL THEN
    SELECT id INTO v_booking_id FROM shipment_bookings
      WHERE shipment_request_id = p_shipment_request_id
        AND unified_trip_id = p_unified_trip_id;
    RETURN jsonb_build_object(
      'booking_id', v_booking_id,
      'capacity_used_kg', v_trip.capacity_used_kg,
      'capacity_remaining_kg',
        CASE WHEN v_trip.capacity_total_kg IS NOT NULL
          THEN v_trip.capacity_total_kg - v_trip.capacity_used_kg
          ELSE NULL END,
      'duplicate', true
    );
  END IF;

  UPDATE unified_trips SET
    capacity_used_kg  = capacity_used_kg  + v_weight,
    capacity_used_cbm = capacity_used_cbm + v_volume
  WHERE id = p_unified_trip_id;

  UPDATE vehicle_capacity_blocks SET
    remaining_weight_kg  = GREATEST(remaining_weight_kg - v_weight, 0),
    remaining_volume_cbm = CASE
      WHEN remaining_volume_cbm IS NOT NULL
        THEN GREATEST(remaining_volume_cbm - v_volume, 0)
      ELSE NULL
    END
  WHERE unified_trip_id = p_unified_trip_id;

  UPDATE shipment_requests
    SET status = 'booked'::shipment_status
    WHERE id = p_shipment_request_id;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'capacity_used_kg', v_trip.capacity_used_kg + v_weight,
    'capacity_remaining_kg', CASE
      WHEN v_trip.capacity_total_kg IS NOT NULL
        THEN v_trip.capacity_total_kg - v_trip.capacity_used_kg - v_weight
      ELSE NULL
    END
  );
END;
$$;

-- ============================================================
-- SECTION 2: Fix accept_reverse_candidate_v1 — persist expiry before returning error
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_reverse_candidate_v1(
  p_candidate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_candidate record;
  v_booking_id uuid;
  v_weight_kg numeric;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_candidate FROM reverse_load_candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CANDIDATE_NOT_FOUND'; END IF;

  IF v_candidate.status != 'offered' THEN
    RAISE EXCEPTION 'INVALID_STATUS: candidate must be offered to accept, got %', v_candidate.status;
  END IF;

  -- Expiry check: persist the status change and return structured error
  -- (previous version raised an exception which rolled back the UPDATE)
  IF v_candidate.expires_at IS NOT NULL AND v_candidate.expires_at < now() THEN
    UPDATE reverse_load_candidates
      SET status = 'expired'::reverse_candidate_status
      WHERE id = p_candidate_id;
    RETURN jsonb_build_object(
      'candidate_id', p_candidate_id,
      'status', 'expired',
      'error', 'CANDIDATE_EXPIRED',
      'booking_id', NULL,
      'weight_allocated_kg', 0,
      'unified_trip_id', v_candidate.unified_trip_id,
      'shipment_request_id', v_candidate.shipment_request_id
    );
  END IF;

  IF v_candidate.shipment_request_id IS NULL THEN
    RAISE EXCEPTION 'MISSING_SHIPMENT: candidate has no linked shipment';
  END IF;

  SELECT COALESCE(weight_estimate_kg, 0) INTO v_weight_kg
    FROM shipment_requests WHERE id = v_candidate.shipment_request_id;

  INSERT INTO shipment_bookings (
    shipment_request_id, unified_trip_id, booking_status,
    confirmed_at, weight_allocated_kg
  ) VALUES (
    v_candidate.shipment_request_id, v_candidate.unified_trip_id,
    'confirmed'::booking_status, now(), v_weight_kg
  )
  RETURNING id INTO v_booking_id;

  UPDATE unified_trips
    SET capacity_used_kg = capacity_used_kg + v_weight_kg
    WHERE id = v_candidate.unified_trip_id;

  UPDATE shipment_requests
    SET status = 'booked'::shipment_status
    WHERE id = v_candidate.shipment_request_id;

  UPDATE reverse_load_candidates
    SET status = 'accepted'::reverse_candidate_status
    WHERE id = p_candidate_id;

  RETURN jsonb_build_object(
    'candidate_id', p_candidate_id,
    'status', 'accepted',
    'booking_id', v_booking_id,
    'weight_allocated_kg', v_weight_kg,
    'unified_trip_id', v_candidate.unified_trip_id,
    'shipment_request_id', v_candidate.shipment_request_id
  );
END;
$$;

-- ============================================================
-- SECTION 3: allocate_vehicle_capacity_v1 — atomic capacity allocation
-- ============================================================

CREATE OR REPLACE FUNCTION public.allocate_vehicle_capacity_v1(
  p_trip_id    uuid,
  p_weight_kg  numeric,
  p_volume_cbm numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_block_id         uuid;
  v_new_weight       numeric;
  v_new_volume       numeric;
  v_rows_affected    integer;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  -- Atomic conditional update: deducts capacity only if sufficient
  UPDATE vehicle_capacity_blocks
    SET remaining_weight_kg  = remaining_weight_kg - p_weight_kg,
        remaining_volume_cbm = CASE
          WHEN remaining_volume_cbm IS NOT NULL
            THEN remaining_volume_cbm - p_volume_cbm
          ELSE NULL
        END
    WHERE unified_trip_id = p_trip_id
      AND remaining_weight_kg >= p_weight_kg
      AND (remaining_volume_cbm IS NULL OR remaining_volume_cbm >= p_volume_cbm)
    RETURNING id, remaining_weight_kg, remaining_volume_cbm
      INTO v_block_id, v_new_weight, v_new_volume;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    -- Check whether the block exists at all
    SELECT id INTO v_block_id FROM vehicle_capacity_blocks
      WHERE unified_trip_id = p_trip_id LIMIT 1;

    IF v_block_id IS NULL THEN
      RAISE EXCEPTION 'NO_CAPACITY_BLOCK: no capacity block found for trip %', p_trip_id;
    ELSE
      RAISE EXCEPTION 'INSUFFICIENT_CAPACITY: requested % kg but insufficient remaining', p_weight_kg;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'block_id', v_block_id,
    'trip_id', p_trip_id,
    'weight_allocated_kg', p_weight_kg,
    'volume_allocated_cbm', p_volume_cbm,
    'remaining_weight_kg', v_new_weight,
    'remaining_volume_cbm', v_new_volume
  );
END;
$$;

-- ============================================================
-- SECTION 4: release_vehicle_capacity_v1 — atomic capacity release
-- ============================================================

CREATE OR REPLACE FUNCTION public.release_vehicle_capacity_v1(
  p_trip_id    uuid,
  p_weight_kg  numeric,
  p_volume_cbm numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_block_id    uuid;
  v_new_weight  numeric;
  v_new_volume  numeric;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  UPDATE vehicle_capacity_blocks
    SET remaining_weight_kg  = remaining_weight_kg + p_weight_kg,
        remaining_volume_cbm = CASE
          WHEN remaining_volume_cbm IS NOT NULL
            THEN remaining_volume_cbm + p_volume_cbm
          ELSE NULL
        END
    WHERE unified_trip_id = p_trip_id
    RETURNING id, remaining_weight_kg, remaining_volume_cbm
      INTO v_block_id, v_new_weight, v_new_volume;

  IF v_block_id IS NULL THEN
    RAISE EXCEPTION 'NO_CAPACITY_BLOCK: no capacity block found for trip %', p_trip_id;
  END IF;

  RETURN jsonb_build_object(
    'block_id', v_block_id,
    'trip_id', p_trip_id,
    'weight_released_kg', p_weight_kg,
    'volume_released_cbm', p_volume_cbm,
    'remaining_weight_kg', v_new_weight,
    'remaining_volume_cbm', v_new_volume
  );
END;
$$;
