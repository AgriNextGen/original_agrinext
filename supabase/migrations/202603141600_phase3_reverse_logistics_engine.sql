-- ============================================================
-- PHASE 3: Reverse Logistics Engine
-- Migration: 202603141600_phase3_reverse_logistics_engine.sql
--
-- Introduces:
--   - shipment_request_id column on reverse_load_candidates
--   - Performance indexes for reverse matching
--   - RPCs: offer, accept, decline, expire, scan
--
-- Rules: Additive only. No existing table drops. No column drops.
--        Fully backward compatible with Phase 1 and Phase 2.
-- ============================================================

-- ============================================================
-- SECTION 1: Schema Changes
-- ============================================================

ALTER TABLE reverse_load_candidates
  ADD COLUMN IF NOT EXISTS shipment_request_id uuid REFERENCES shipment_requests(id);

-- ============================================================
-- SECTION 2: Performance Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_rlc_shipment_request
  ON reverse_load_candidates(shipment_request_id)
  WHERE shipment_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rlc_status_expires
  ON reverse_load_candidates(status, expires_at)
  WHERE status IN ('identified', 'offered');

CREATE INDEX IF NOT EXISTS idx_sr_status_type_origin
  ON shipment_requests(status, shipment_type, origin_district_id)
  WHERE status = 'pending';

-- ============================================================
-- SECTION 3: RPC — offer_reverse_candidate_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.offer_reverse_candidate_v1(
  p_candidate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_candidate record;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_candidate FROM reverse_load_candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CANDIDATE_NOT_FOUND'; END IF;

  IF v_candidate.status != 'identified' THEN
    RAISE EXCEPTION 'INVALID_STATUS: candidate must be identified to offer, got %', v_candidate.status;
  END IF;

  IF v_candidate.expires_at IS NOT NULL AND v_candidate.expires_at < now() THEN
    UPDATE reverse_load_candidates SET status = 'expired'::reverse_candidate_status WHERE id = p_candidate_id;
    RAISE EXCEPTION 'CANDIDATE_EXPIRED';
  END IF;

  UPDATE reverse_load_candidates
    SET status = 'offered'::reverse_candidate_status
    WHERE id = p_candidate_id;

  RETURN jsonb_build_object(
    'candidate_id', p_candidate_id,
    'status', 'offered',
    'unified_trip_id', v_candidate.unified_trip_id,
    'shipment_request_id', v_candidate.shipment_request_id
  );
END;
$$;

-- ============================================================
-- SECTION 4: RPC — accept_reverse_candidate_v1
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

  IF v_candidate.expires_at IS NOT NULL AND v_candidate.expires_at < now() THEN
    UPDATE reverse_load_candidates SET status = 'expired'::reverse_candidate_status WHERE id = p_candidate_id;
    RAISE EXCEPTION 'CANDIDATE_EXPIRED';
  END IF;

  v_weight_kg := 0;
  IF v_candidate.shipment_request_id IS NOT NULL THEN
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
  END IF;

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
-- SECTION 5: RPC — decline_reverse_candidate_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.decline_reverse_candidate_v1(
  p_candidate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_candidate record;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_candidate FROM reverse_load_candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CANDIDATE_NOT_FOUND'; END IF;

  IF v_candidate.status NOT IN ('identified', 'offered') THEN
    RAISE EXCEPTION 'INVALID_STATUS: candidate must be identified or offered to decline, got %', v_candidate.status;
  END IF;

  UPDATE reverse_load_candidates
    SET status = 'cancelled'::reverse_candidate_status
    WHERE id = p_candidate_id;

  RETURN jsonb_build_object(
    'candidate_id', p_candidate_id,
    'status', 'cancelled'
  );
END;
$$;

-- ============================================================
-- SECTION 6: RPC — expire_reverse_candidates_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.expire_reverse_candidates_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_expired_count integer;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  UPDATE reverse_load_candidates
    SET status = 'expired'::reverse_candidate_status
    WHERE status IN ('identified', 'offered')
      AND expires_at IS NOT NULL
      AND expires_at < now();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_count', v_expired_count
  );
END;
$$;

-- ============================================================
-- SECTION 7: RPC — scan_reverse_opportunities_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.scan_reverse_opportunities_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trip record;
  v_result jsonb;
  v_trips_scanned integer := 0;
  v_total_candidates integer := 0;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  FOR v_trip IN
    SELECT id FROM unified_trips
    WHERE trip_status IN ('delivered', 'completed')
      AND capacity_total_kg IS NOT NULL
      AND (capacity_total_kg - COALESCE(capacity_used_kg, 0)) > 100
    ORDER BY updated_at DESC
    LIMIT 50
  LOOP
    v_trips_scanned := v_trips_scanned + 1;
    BEGIN
      v_result := find_reverse_load_candidates_v1(v_trip.id);
      v_total_candidates := v_total_candidates + COALESCE((v_result->>'count')::integer, 0);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'trips_scanned', v_trips_scanned,
    'candidates_created', v_total_candidates
  );
END;
$$;

-- ============================================================
-- SECTION 8: Update find_reverse_load_candidates_v1 to persist shipment_request_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_reverse_load_candidates_v1(
  p_unified_trip_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trip          record;
  v_sr            record;
  v_candidate_id  uuid;
  v_candidates    jsonb := '[]'::jsonb;
  v_score         numeric;
  v_remaining_kg  numeric;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_trip FROM unified_trips WHERE id = p_unified_trip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;

  v_remaining_kg := COALESCE(v_trip.capacity_total_kg, 0) - COALESCE(v_trip.capacity_used_kg, 0);

  IF v_remaining_kg <= 0 THEN
    RETURN jsonb_build_object('candidates', '[]'::jsonb, 'message', 'No remaining capacity');
  END IF;

  FOR v_sr IN
    SELECT sr.id, sr.origin_district_id, sr.dest_district_id,
           sr.weight_estimate_kg, sr.route_cluster_id
      FROM shipment_requests sr
      WHERE sr.status = 'pending'::shipment_status
        AND sr.origin_district_id IS NOT NULL
        AND (
          sr.origin_district_id IN (
            SELECT tl.district_id FROM trip_legs tl
              WHERE tl.unified_trip_id = p_unified_trip_id
                AND tl.leg_type = 'drop'
          )
          OR sr.origin_district_id = (
            SELECT gd.id FROM geo_districts gd
              JOIN trip_legs tl ON tl.district_id = gd.id
              WHERE tl.unified_trip_id = p_unified_trip_id
                AND tl.leg_type = 'drop'
              LIMIT 1
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM reverse_load_candidates rlc
            WHERE rlc.shipment_request_id = sr.id
              AND rlc.unified_trip_id = p_unified_trip_id
              AND rlc.status IN ('identified', 'offered', 'accepted')
        )
      ORDER BY sr.weight_estimate_kg DESC NULLS LAST
      LIMIT 20
  LOOP
    v_score := CASE
      WHEN v_sr.weight_estimate_kg IS NOT NULL AND v_remaining_kg > 0
        THEN LEAST(v_sr.weight_estimate_kg / v_remaining_kg, 1.0) * 100
      ELSE 50
    END;

    INSERT INTO reverse_load_candidates (
      unified_trip_id,
      route_cluster_id,
      origin_district_id,
      dest_district_id,
      available_capacity_kg,
      candidate_score,
      status,
      shipment_request_id,
      expires_at
    ) VALUES (
      p_unified_trip_id,
      v_sr.route_cluster_id,
      v_sr.origin_district_id,
      v_sr.dest_district_id,
      v_remaining_kg,
      v_score,
      'identified'::reverse_candidate_status,
      v_sr.id,
      now() + interval '24 hours'
    )
    RETURNING id INTO v_candidate_id;

    v_candidates := v_candidates || jsonb_build_object(
      'candidate_id', v_candidate_id,
      'shipment_request_id', v_sr.id,
      'score', v_score,
      'weight_estimate_kg', v_sr.weight_estimate_kg
    );
  END LOOP;

  RETURN jsonb_build_object(
    'candidates', v_candidates,
    'count', jsonb_array_length(v_candidates),
    'remaining_capacity_kg', v_remaining_kg
  );
END;
$$;
