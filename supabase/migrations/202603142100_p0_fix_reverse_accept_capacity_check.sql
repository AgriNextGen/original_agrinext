-- ============================================================
-- P0 FIX: accept_reverse_candidate_v1 — add capacity validation
-- Migration: 202603142100_p0_fix_reverse_accept_capacity_check.sql
--
-- Problem: accept_reverse_candidate_v1 updates capacity_used_kg on
--          unified_trips without checking whether the trip has
--          sufficient remaining capacity. A reverse load can be
--          accepted even when the trip is already full.
--
-- Fix: Add FOR UPDATE lock on unified_trips + capacity check that
--      mirrors book_shipment_to_trip_v1 before inserting the booking.
--
-- Rules: Additive only. Fully backward compatible.
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
  v_trip      record;
  v_booking_id uuid;
  v_weight_kg numeric;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_candidate FROM reverse_load_candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CANDIDATE_NOT_FOUND'; END IF;

  IF v_candidate.status != 'offered' THEN
    RAISE EXCEPTION 'INVALID_STATUS: candidate must be offered to accept, got %', v_candidate.status;
  END IF;

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

  -- Lock the trip row and validate remaining capacity
  SELECT * INTO v_trip FROM unified_trips
    WHERE id = v_candidate.unified_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRIP_NOT_FOUND: trip % does not exist', v_candidate.unified_trip_id;
  END IF;

  IF v_trip.capacity_total_kg IS NOT NULL
     AND (v_trip.capacity_used_kg + v_weight_kg) > v_trip.capacity_total_kg THEN
    RAISE EXCEPTION 'INSUFFICIENT_CAPACITY: need % kg, available % kg',
      v_weight_kg, (v_trip.capacity_total_kg - v_trip.capacity_used_kg);
  END IF;

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

  UPDATE vehicle_capacity_blocks
    SET remaining_weight_kg = GREATEST(remaining_weight_kg - v_weight_kg, 0)
    WHERE unified_trip_id = v_candidate.unified_trip_id;

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
