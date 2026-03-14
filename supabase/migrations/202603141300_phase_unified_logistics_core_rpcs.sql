-- ============================================================
-- PHASE: Unified Logistics Engine — Core RPCs
-- Migration: 202603141300_phase_unified_logistics_core_rpcs.sql
--
-- New RPCs for the unified logistics domain. These operate
-- exclusively on the new tables and do not touch legacy tables.
--
-- Rules: Additive only. No existing function changes.
-- ============================================================

-- ============================================================
-- 1. detect_route_cluster_v1
--
-- Finds or creates a route_clusters entry for a given
-- origin/dest district pair.
-- ============================================================

CREATE OR REPLACE FUNCTION public.detect_route_cluster_v1(
  p_origin_district_id uuid,
  p_dest_district_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_cluster_id uuid;
  v_label      text;
  v_origin_name text;
  v_dest_name   text;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT id INTO v_cluster_id
    FROM route_clusters
    WHERE cluster_type = 'district'
      AND origin_district_id = p_origin_district_id
      AND dest_district_id = p_dest_district_id
      AND is_active = true
    LIMIT 1;

  IF v_cluster_id IS NOT NULL THEN
    RETURN jsonb_build_object('route_cluster_id', v_cluster_id, 'created', false);
  END IF;

  SELECT name_en INTO v_origin_name FROM geo_districts WHERE id = p_origin_district_id;
  SELECT name_en INTO v_dest_name   FROM geo_districts WHERE id = p_dest_district_id;

  v_label := COALESCE(v_origin_name, 'Unknown') || ' → ' || COALESCE(v_dest_name, 'Unknown');

  INSERT INTO route_clusters (
    cluster_type, origin_district_id, dest_district_id, label, is_active
  ) VALUES (
    'district', p_origin_district_id, p_dest_district_id, v_label, true
  )
  RETURNING id INTO v_cluster_id;

  RETURN jsonb_build_object('route_cluster_id', v_cluster_id, 'label', v_label, 'created', true);
END;
$$;

-- ============================================================
-- 2. create_shipment_request_v1
--
-- Creates a shipment_requests + shipment_items from a JSON
-- payload. Auto-detects route cluster if districts provided.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_shipment_request_v1(
  p_params jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_shipment_id      uuid;
  v_route_cluster_id uuid;
  v_item             jsonb;
  v_origin_district  uuid;
  v_dest_district    uuid;
  v_cluster_result   jsonb;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  v_origin_district := (p_params->>'origin_district_id')::uuid;
  v_dest_district   := (p_params->>'dest_district_id')::uuid;

  IF v_origin_district IS NOT NULL AND v_dest_district IS NOT NULL THEN
    v_cluster_result := detect_route_cluster_v1(v_origin_district, v_dest_district);
    v_route_cluster_id := (v_cluster_result->>'route_cluster_id')::uuid;
  END IF;

  INSERT INTO shipment_requests (
    request_source_type,
    source_actor_id,
    shipment_type,
    pickup_location,
    drop_location,
    pickup_geo_lat,
    pickup_geo_long,
    drop_geo_lat,
    drop_geo_long,
    origin_district_id,
    dest_district_id,
    origin_market_id,
    dest_market_id,
    route_cluster_id,
    pickup_time_window_start,
    pickup_time_window_end,
    delivery_time_window_start,
    delivery_time_window_end,
    weight_estimate_kg,
    volume_estimate_cbm,
    status,
    priority,
    notes
  ) VALUES (
    (p_params->>'request_source_type')::shipment_source_type,
    (p_params->>'source_actor_id')::uuid,
    COALESCE((p_params->>'shipment_type')::shipment_type, 'farm_produce'::shipment_type),
    p_params->>'pickup_location',
    p_params->>'drop_location',
    (p_params->>'pickup_geo_lat')::numeric,
    (p_params->>'pickup_geo_long')::numeric,
    (p_params->>'drop_geo_lat')::numeric,
    (p_params->>'drop_geo_long')::numeric,
    v_origin_district,
    v_dest_district,
    (p_params->>'origin_market_id')::uuid,
    (p_params->>'dest_market_id')::uuid,
    v_route_cluster_id,
    (p_params->>'pickup_time_window_start')::timestamptz,
    (p_params->>'pickup_time_window_end')::timestamptz,
    (p_params->>'delivery_time_window_start')::timestamptz,
    (p_params->>'delivery_time_window_end')::timestamptz,
    (p_params->>'weight_estimate_kg')::numeric,
    (p_params->>'volume_estimate_cbm')::numeric,
    'pending'::shipment_status,
    COALESCE((p_params->>'priority')::smallint, 0),
    p_params->>'notes'
  )
  RETURNING id INTO v_shipment_id;

  IF p_params ? 'items' AND jsonb_array_length(p_params->'items') > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_params->'items')
    LOOP
      INSERT INTO shipment_items (
        shipment_request_id,
        product_name,
        category,
        quantity,
        unit,
        weight_kg,
        legacy_crop_id
      ) VALUES (
        v_shipment_id,
        v_item->>'product_name',
        v_item->>'category',
        (v_item->>'quantity')::numeric,
        COALESCE(v_item->>'unit', 'kg'),
        (v_item->>'weight_kg')::numeric,
        (v_item->>'legacy_crop_id')::uuid
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'shipment_request_id', v_shipment_id,
    'route_cluster_id', v_route_cluster_id
  );
END;
$$;

-- ============================================================
-- 3. create_load_pool_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_load_pool_v1(
  p_route_cluster_id    uuid,
  p_capacity_target_kg  numeric,
  p_dispatch_window     jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_pool_id          uuid;
  v_origin_district  uuid;
  v_dest_district    uuid;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  IF p_route_cluster_id IS NOT NULL THEN
    SELECT origin_district_id, dest_district_id
      INTO v_origin_district, v_dest_district
      FROM route_clusters
      WHERE id = p_route_cluster_id;
  END IF;

  INSERT INTO load_pools (
    route_cluster_id,
    origin_district_id,
    dest_district_id,
    capacity_target_kg,
    status,
    dispatch_window_start,
    dispatch_window_end
  ) VALUES (
    p_route_cluster_id,
    v_origin_district,
    v_dest_district,
    p_capacity_target_kg,
    'open'::load_pool_status,
    (p_dispatch_window->>'start')::timestamptz,
    (p_dispatch_window->>'end')::timestamptz
  )
  RETURNING id INTO v_pool_id;

  RETURN jsonb_build_object('load_pool_id', v_pool_id);
END;
$$;

-- ============================================================
-- 4. add_shipment_to_pool_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_shipment_to_pool_v1(
  p_shipment_request_id uuid,
  p_load_pool_id        uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_sr     record;
  v_pool   record;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_sr FROM shipment_requests WHERE id = p_shipment_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHIPMENT_NOT_FOUND'; END IF;

  IF v_sr.status NOT IN ('pending'::shipment_status, 'draft'::shipment_status) THEN
    RAISE EXCEPTION 'INVALID_SHIPMENT_STATUS: %', v_sr.status;
  END IF;

  SELECT * INTO v_pool FROM load_pools WHERE id = p_load_pool_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'POOL_NOT_FOUND'; END IF;

  IF v_pool.status NOT IN ('open'::load_pool_status, 'filling'::load_pool_status) THEN
    RAISE EXCEPTION 'POOL_NOT_ACCEPTING: %', v_pool.status;
  END IF;

  INSERT INTO load_pool_members (load_pool_id, shipment_request_id)
    VALUES (p_load_pool_id, p_shipment_request_id)
    ON CONFLICT (load_pool_id, shipment_request_id) DO NOTHING;

  UPDATE load_pools SET
    total_weight_kg  = total_weight_kg  + COALESCE(v_sr.weight_estimate_kg, 0),
    total_volume_cbm = total_volume_cbm + COALESCE(v_sr.volume_estimate_cbm, 0),
    status = CASE
      WHEN total_weight_kg + COALESCE(v_sr.weight_estimate_kg, 0) >= COALESCE(capacity_target_kg, 999999)
        THEN 'full'::load_pool_status
      ELSE 'filling'::load_pool_status
    END
  WHERE id = p_load_pool_id;

  UPDATE shipment_requests
    SET status = 'pooled'::shipment_status
    WHERE id = p_shipment_request_id;

  RETURN jsonb_build_object('success', true, 'load_pool_id', p_load_pool_id);
END;
$$;

-- ============================================================
-- 5. create_unified_trip_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_unified_trip_v1(
  p_params jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trip_id  uuid;
  v_leg      jsonb;
  v_seq      smallint := 0;
  v_cap_kg   numeric;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  v_cap_kg := (p_params->>'capacity_total_kg')::numeric;

  INSERT INTO unified_trips (
    vehicle_id,
    driver_id,
    transporter_id,
    trip_status,
    trip_direction,
    start_location,
    end_location,
    start_geo_lat,
    start_geo_long,
    end_geo_lat,
    end_geo_long,
    capacity_total_kg,
    capacity_total_cbm,
    planned_start_at,
    planned_end_at
  ) VALUES (
    (p_params->>'vehicle_id')::uuid,
    (p_params->>'driver_id')::uuid,
    (p_params->>'transporter_id')::uuid,
    COALESCE((p_params->>'trip_status')::unified_trip_status, 'planned'::unified_trip_status),
    COALESCE((p_params->>'trip_direction')::trip_direction, 'forward'::trip_direction),
    p_params->>'start_location',
    p_params->>'end_location',
    (p_params->>'start_geo_lat')::numeric,
    (p_params->>'start_geo_long')::numeric,
    (p_params->>'end_geo_lat')::numeric,
    (p_params->>'end_geo_long')::numeric,
    v_cap_kg,
    (p_params->>'capacity_total_cbm')::numeric,
    (p_params->>'planned_start_at')::timestamptz,
    (p_params->>'planned_end_at')::timestamptz
  )
  RETURNING id INTO v_trip_id;

  IF p_params ? 'legs' AND jsonb_array_length(p_params->'legs') > 0 THEN
    FOR v_leg IN SELECT * FROM jsonb_array_elements(p_params->'legs')
    LOOP
      v_seq := v_seq + 1;
      INSERT INTO trip_legs (
        unified_trip_id,
        sequence_order,
        leg_type,
        location_name,
        geo_lat,
        geo_long,
        district_id,
        shipment_request_id,
        estimated_arrival_at
      ) VALUES (
        v_trip_id,
        COALESCE((v_leg->>'sequence_order')::smallint, v_seq),
        COALESCE(v_leg->>'leg_type', 'pickup'),
        v_leg->>'location_name',
        (v_leg->>'geo_lat')::numeric,
        (v_leg->>'geo_long')::numeric,
        (v_leg->>'district_id')::uuid,
        (v_leg->>'shipment_request_id')::uuid,
        (v_leg->>'estimated_arrival_at')::timestamptz
      );
    END LOOP;
  END IF;

  IF v_cap_kg IS NOT NULL THEN
    INSERT INTO vehicle_capacity_blocks (
      unified_trip_id,
      remaining_weight_kg,
      remaining_volume_cbm,
      available_from,
      available_until
    ) VALUES (
      v_trip_id,
      v_cap_kg,
      (p_params->>'capacity_total_cbm')::numeric,
      (p_params->>'planned_start_at')::timestamptz,
      (p_params->>'planned_end_at')::timestamptz
    );
  END IF;

  RETURN jsonb_build_object('unified_trip_id', v_trip_id);
END;
$$;

-- ============================================================
-- 6. book_shipment_to_trip_v1
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
-- 7. find_reverse_load_candidates_v1
--
-- Scans pending shipment_requests near a trip's end location
-- and creates reverse_load_candidates entries.
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
      expires_at
    ) VALUES (
      p_unified_trip_id,
      v_sr.route_cluster_id,
      v_sr.origin_district_id,
      v_sr.dest_district_id,
      v_remaining_kg,
      v_score,
      'identified'::reverse_candidate_status,
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
