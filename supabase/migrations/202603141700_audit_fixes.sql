-- ============================================================
-- AUDIT FIXES — Phase 2 / Phase 3 hardening
-- Migration: 202603141700_audit_fixes.sql
--
-- Fixes:
--   - Status guard trigger on reverse_load_candidates
--   - Null-guard on accept_reverse_candidate_v1
--   - run_matching_cycle_v1 RPC for real matching pipeline
--   - matching_runs.status enum alignment
--   - Composite index for batch member-count query
--
-- Rules: Additive only. Fully backward compatible.
-- ============================================================

-- ============================================================
-- SECTION 1: Status guard on reverse_load_candidates
-- ============================================================

DO $$ BEGIN
  CREATE TRIGGER trg_block_status_reverse_load_candidates
    BEFORE UPDATE ON reverse_load_candidates
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trg_block_direct_status_change();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 2: Composite index for batch member-count query
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_lpm_pool_batch
  ON load_pool_members(load_pool_id);

-- ============================================================
-- SECTION 3: Align matching_runs.status to enum
-- ============================================================

ALTER TABLE matching_runs
  ALTER COLUMN status TYPE matching_run_status
  USING status::matching_run_status;

-- ============================================================
-- SECTION 4: Guard accept_reverse_candidate_v1 against null shipment
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
-- SECTION 5: run_matching_cycle_v1 — full server-side pipeline
-- ============================================================

CREATE OR REPLACE FUNCTION public.run_matching_cycle_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_run_id uuid;
  v_start timestamptz := clock_timestamp();
  v_shipments_processed integer := 0;
  v_pools_created integer := 0;
  v_trips_generated integer := 0;
  v_bookings_created integer := 0;
  v_reverse_candidates integer := 0;
  v_cluster record;
  v_pool_id uuid;
  v_sr record;
  v_pool record;
  v_vehicle record;
  v_trip_result jsonb;
  v_book_result jsonb;
  v_reverse_result jsonb;
  v_errors text[] := '{}';
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  -- Create matching run record
  INSERT INTO matching_runs (status) VALUES ('running'::matching_run_status)
    RETURNING id INTO v_run_id;

  -- Log start event
  INSERT INTO logistics_events (event_type, entity_type, entity_id, payload)
    VALUES ('matching_run_started', 'matching_run', v_run_id, '{}'::jsonb);

  -- Step 1: Count pending shipments
  SELECT count(*) INTO v_shipments_processed
    FROM shipment_requests
    WHERE status = 'pending'::shipment_status
      AND route_cluster_id IS NOT NULL;

  -- Step 2: For each route cluster with pending shipments, create a pool
  FOR v_cluster IN
    SELECT route_cluster_id, count(*) AS cnt,
           sum(COALESCE(weight_estimate_kg, 0)) AS total_kg
      FROM shipment_requests
      WHERE status = 'pending'::shipment_status
        AND route_cluster_id IS NOT NULL
      GROUP BY route_cluster_id
      HAVING sum(COALESCE(weight_estimate_kg, 0)) >= 200
  LOOP
    BEGIN
      -- Check if an open pool already exists for this cluster
      SELECT id INTO v_pool_id
        FROM load_pools
        WHERE route_cluster_id = v_cluster.route_cluster_id
          AND status IN ('open', 'filling')
        ORDER BY created_at DESC
        LIMIT 1;

      IF v_pool_id IS NULL THEN
        INSERT INTO load_pools (route_cluster_id, origin_district_id, dest_district_id,
                                total_weight_kg, total_volume_cbm, capacity_target_kg, status)
          SELECT v_cluster.route_cluster_id, rc.origin_district_id, rc.dest_district_id,
                 0, 0, 10000, 'open'
            FROM route_clusters rc WHERE rc.id = v_cluster.route_cluster_id
          RETURNING id INTO v_pool_id;

        IF v_pool_id IS NOT NULL THEN
          v_pools_created := v_pools_created + 1;
        END IF;
      END IF;

      IF v_pool_id IS NOT NULL THEN
        -- Add pending shipments to the pool
        FOR v_sr IN
          SELECT id, COALESCE(weight_estimate_kg, 0) AS wkg
            FROM shipment_requests
            WHERE status = 'pending'::shipment_status
              AND route_cluster_id = v_cluster.route_cluster_id
            ORDER BY weight_estimate_kg DESC NULLS LAST
            LIMIT 20
        LOOP
          BEGIN
            INSERT INTO load_pool_members (load_pool_id, shipment_request_id)
              VALUES (v_pool_id, v_sr.id)
              ON CONFLICT (load_pool_id, shipment_request_id) DO NOTHING;

            UPDATE load_pools
              SET total_weight_kg = total_weight_kg + v_sr.wkg,
                  status = 'filling'
              WHERE id = v_pool_id;

            UPDATE shipment_requests
              SET status = 'pooled'::shipment_status
              WHERE id = v_sr.id AND status = 'pending'::shipment_status;
          EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, 'pool_add: ' || SQLERRM);
          END;
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'cluster: ' || SQLERRM);
    END;
  END LOOP;

  -- Step 3: Find dispatch-ready pools and generate trips
  FOR v_pool IN
    SELECT lp.id, lp.total_weight_kg, lp.route_cluster_id,
           lp.dispatch_window_start, lp.dispatch_window_end
      FROM load_pools lp
      WHERE lp.status IN ('open', 'filling')
        AND lp.total_weight_kg >= 200
        AND (lp.total_weight_kg::numeric / GREATEST(COALESCE(lp.capacity_target_kg, 10000), 1)) >= 0.7
        AND EXISTS (SELECT 1 FROM load_pool_members lpm WHERE lpm.load_pool_id = lp.id)
  LOOP
    BEGIN
      -- Find smallest vehicle that fits
      SELECT id, transporter_id, capacity_kg INTO v_vehicle
        FROM vehicles
        WHERE capacity_kg >= v_pool.total_weight_kg
        ORDER BY capacity_kg ASC
        LIMIT 1;

      IF v_vehicle.id IS NOT NULL THEN
        v_trip_result := create_unified_trip_v1(jsonb_build_object(
          'vehicle_id', v_vehicle.id,
          'transporter_id', v_vehicle.transporter_id,
          'trip_direction', 'forward',
          'capacity_total_kg', v_vehicle.capacity_kg
        ));

        IF v_trip_result IS NOT NULL AND v_trip_result->>'unified_trip_id' IS NOT NULL THEN
          v_trips_generated := v_trips_generated + 1;

          -- Book pool members to the trip
          FOR v_sr IN
            SELECT lpm.shipment_request_id
              FROM load_pool_members lpm
              WHERE lpm.load_pool_id = v_pool.id
          LOOP
            BEGIN
              v_book_result := book_shipment_to_trip_v1(
                v_sr.shipment_request_id,
                (v_trip_result->>'unified_trip_id')::uuid
              );
              IF v_book_result IS NOT NULL THEN
                v_bookings_created := v_bookings_created + 1;
              END IF;
            EXCEPTION WHEN OTHERS THEN
              v_errors := array_append(v_errors, 'booking: ' || SQLERRM);
            END;
          END LOOP;

          -- Update pool status
          UPDATE load_pools SET status = 'dispatched' WHERE id = v_pool.id;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'trip_gen: ' || SQLERRM);
    END;
  END LOOP;

  -- Step 4: Reverse logistics scan
  BEGIN
    v_reverse_result := scan_reverse_opportunities_v1();
    v_reverse_candidates := COALESCE((v_reverse_result->>'candidates_created')::integer, 0);
  EXCEPTION WHEN OTHERS THEN
    v_errors := array_append(v_errors, 'reverse: ' || SQLERRM);
  END;

  -- Step 5: Complete the run
  UPDATE matching_runs
    SET status = 'completed'::matching_run_status,
        shipments_processed = v_shipments_processed,
        pools_created = v_pools_created,
        trips_generated = v_trips_generated,
        bookings_created = v_bookings_created,
        completed_at = clock_timestamp()
    WHERE id = v_run_id;

  -- Log completion event
  INSERT INTO logistics_events (event_type, entity_type, entity_id, payload)
    VALUES ('matching_run_completed', 'matching_run', v_run_id,
      jsonb_build_object(
        'shipments_processed', v_shipments_processed,
        'pools_created', v_pools_created,
        'trips_generated', v_trips_generated,
        'bookings_created', v_bookings_created,
        'reverse_candidates', v_reverse_candidates,
        'errors', to_jsonb(v_errors),
        'duration_ms', EXTRACT(MILLISECOND FROM clock_timestamp() - v_start)::integer
      )
    );

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'shipments_processed', v_shipments_processed,
    'pools_created', v_pools_created,
    'trips_generated', v_trips_generated,
    'bookings_created', v_bookings_created,
    'reverse_candidates', v_reverse_candidates,
    'errors', to_jsonb(v_errors),
    'duration_ms', EXTRACT(MILLISECOND FROM clock_timestamp() - v_start)::integer
  );
END;
$$;
