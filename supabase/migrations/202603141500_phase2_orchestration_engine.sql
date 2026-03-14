-- ============================================================
-- PHASE 2: Logistics Orchestration Engine
-- Migration: 202603141500_phase2_orchestration_engine.sql
--
-- Introduces:
--   - logistics_events table (append-only event log)
--   - matching_runs table (orchestration run tracking)
--   - Performance indexes for orchestration queries
--   - RPC: get_orchestration_dashboard_v1
--
-- Rules: Additive only. No existing table drops. No column drops.
--        Fully backward compatible with Phase 1.
-- ============================================================

-- ============================================================
-- SECTION 1: Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE logistics_event_type AS ENUM (
    'shipment_created',
    'load_pool_created',
    'load_pool_filled',
    'trip_generated',
    'shipment_assigned',
    'capacity_allocated',
    'capacity_released',
    'matching_run_started',
    'matching_run_completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE matching_run_status AS ENUM ('running','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 2: logistics_events (append-only event log)
-- ============================================================

CREATE TABLE IF NOT EXISTS logistics_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  payload         jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE logistics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY le_select ON logistics_events
  FOR SELECT TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY le_insert ON logistics_events
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

-- ============================================================
-- SECTION 3: matching_runs (orchestration run tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS matching_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                text NOT NULL DEFAULT 'running',
  shipments_processed   integer NOT NULL DEFAULT 0,
  pools_created         integer NOT NULL DEFAULT 0,
  trips_generated       integer NOT NULL DEFAULT 0,
  bookings_created      integer NOT NULL DEFAULT 0,
  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  error_message         text,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE matching_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY mr_select ON matching_runs
  FOR SELECT TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY mr_insert ON matching_runs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY mr_update ON matching_runs
  FOR UPDATE TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

-- ============================================================
-- SECTION 4: Performance Indexes
-- ============================================================

-- Composite index for fast pending-shipment lookup by route cluster
CREATE INDEX IF NOT EXISTS idx_sr_status_route_cluster
  ON shipment_requests(status, route_cluster_id)
  WHERE status = 'pending';

-- Composite index for pool matching by status and route cluster
CREATE INDEX IF NOT EXISTS idx_lp_status_route_cluster
  ON load_pools(status, route_cluster_id)
  WHERE status IN ('open', 'filling');

-- Vehicle capacity and type index for matching
CREATE INDEX IF NOT EXISTS idx_vehicles_capacity_type
  ON vehicles(capacity_kg, vehicle_type);

-- Event log indexes
CREATE INDEX IF NOT EXISTS idx_le_type_created
  ON logistics_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_le_entity
  ON logistics_events(entity_type, entity_id);

-- Matching run indexes
CREATE INDEX IF NOT EXISTS idx_mr_status_started
  ON matching_runs(status, started_at DESC);

-- ============================================================
-- SECTION 5: RPC — get_orchestration_dashboard_v1
-- ============================================================

CREATE OR REPLACE FUNCTION get_orchestration_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_pending_shipments integer;
  v_active_pools integer;
  v_ready_pools integer;
  v_active_trips integer;
  v_total_bookings integer;
  v_recent_runs jsonb;
  v_pool_stats jsonb;
  v_trip_stats jsonb;
BEGIN
  SET LOCAL app.rpc = 'true';

  SELECT count(*) INTO v_pending_shipments
  FROM shipment_requests WHERE status = 'pending';

  SELECT count(*) INTO v_active_pools
  FROM load_pools WHERE status IN ('open', 'filling');

  SELECT count(*) INTO v_ready_pools
  FROM load_pools lp
  WHERE lp.status IN ('open', 'filling')
    AND lp.total_weight_kg >= COALESCE(lp.capacity_target_kg * 0.7, 200);

  SELECT count(*) INTO v_active_trips
  FROM unified_trips WHERE trip_status IN ('planned', 'assigned', 'accepted', 'en_route', 'in_transit');

  SELECT count(*) INTO v_total_bookings
  FROM shipment_bookings WHERE booking_status IN ('tentative', 'confirmed');

  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.started_at DESC), '[]'::jsonb)
  INTO v_recent_runs
  FROM (
    SELECT id, status, shipments_processed, pools_created,
           trips_generated, bookings_created, started_at, completed_at, error_message
    FROM matching_runs
    ORDER BY started_at DESC
    LIMIT 10
  ) r;

  SELECT jsonb_build_object(
    'by_status', COALESCE((
      SELECT jsonb_object_agg(status, cnt)
      FROM (SELECT status::text, count(*)::integer AS cnt FROM load_pools GROUP BY status) s
    ), '{}'::jsonb)
  ) INTO v_pool_stats;

  SELECT jsonb_build_object(
    'by_status', COALESCE((
      SELECT jsonb_object_agg(trip_status, cnt)
      FROM (SELECT trip_status::text, count(*)::integer AS cnt FROM unified_trips GROUP BY trip_status) s
    ), '{}'::jsonb)
  ) INTO v_trip_stats;

  v_result := jsonb_build_object(
    'pending_shipments', v_pending_shipments,
    'active_pools', v_active_pools,
    'ready_pools', v_ready_pools,
    'active_trips', v_active_trips,
    'total_bookings', v_total_bookings,
    'recent_runs', v_recent_runs,
    'pool_stats', v_pool_stats,
    'trip_stats', v_trip_stats
  );

  RETURN v_result;
END;
$$;
