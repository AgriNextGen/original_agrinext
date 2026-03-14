-- ============================================================
-- PHASE: Unified Logistics Engine — Core Tables
-- Migration: 202603141100_phase_unified_logistics_engine.sql
--
-- Introduces the unified logistics domain layer:
--   10 new tables, 8 new enums, RLS policies, indexes, triggers.
--
-- Rules: Additive only. No existing table drops. No column drops.
--        No renames. Fully backward compatible.
--
-- Legacy tables (transport_requests, trips, transport_status_events)
-- remain untouched. Bridge triggers are in a separate migration.
-- ============================================================

-- ============================================================
-- SECTION 1: Enums
-- ============================================================

DO $$ BEGIN
  CREATE TYPE shipment_source_type AS ENUM ('farmer','buyer','vendor','admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shipment_type AS ENUM ('farm_produce','agri_input','general_goods','return_goods');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shipment_status AS ENUM ('draft','pending','pooled','booked','in_transit','delivered','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE load_pool_status AS ENUM ('open','filling','full','dispatched','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE unified_trip_status AS ENUM ('planned','assigned','accepted','en_route','pickup_done','in_transit','delivered','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trip_direction AS ENUM ('forward','return','mixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('tentative','confirmed','in_transit','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reverse_candidate_status AS ENUM ('identified','offered','accepted','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 2: route_clusters
-- ============================================================

CREATE TABLE IF NOT EXISTS route_clusters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_type    text NOT NULL CHECK (cluster_type IN ('district','taluk','village_cluster','market_corridor')),
  origin_district_id uuid REFERENCES geo_districts(id),
  dest_district_id   uuid REFERENCES geo_districts(id),
  origin_market_id   uuid REFERENCES geo_markets(id),
  dest_market_id     uuid REFERENCES geo_markets(id),
  label           text NOT NULL,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 3: shipment_requests
-- ============================================================

CREATE TABLE IF NOT EXISTS shipment_requests (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_source_type         shipment_source_type NOT NULL,
  source_actor_id             uuid NOT NULL REFERENCES auth.users(id),
  shipment_type               shipment_type NOT NULL DEFAULT 'farm_produce',
  pickup_location             text,
  drop_location               text,
  pickup_geo_lat              numeric,
  pickup_geo_long             numeric,
  drop_geo_lat                numeric,
  drop_geo_long               numeric,
  origin_district_id          uuid REFERENCES geo_districts(id),
  dest_district_id            uuid REFERENCES geo_districts(id),
  origin_market_id            uuid REFERENCES geo_markets(id),
  dest_market_id              uuid REFERENCES geo_markets(id),
  route_cluster_id            uuid REFERENCES route_clusters(id),
  pickup_time_window_start    timestamptz,
  pickup_time_window_end      timestamptz,
  delivery_time_window_start  timestamptz,
  delivery_time_window_end    timestamptz,
  weight_estimate_kg          numeric,
  volume_estimate_cbm         numeric,
  status                      shipment_status NOT NULL DEFAULT 'pending',
  priority                    smallint DEFAULT 0,
  notes                       text,
  legacy_transport_request_id uuid REFERENCES transport_requests(id),
  legacy_market_order_id      uuid REFERENCES market_orders(id),
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 4: shipment_items
-- ============================================================

CREATE TABLE IF NOT EXISTS shipment_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_request_id   uuid NOT NULL REFERENCES shipment_requests(id) ON DELETE CASCADE,
  product_name          text NOT NULL,
  category              text,
  quantity              numeric NOT NULL,
  unit                  text NOT NULL DEFAULT 'kg',
  weight_kg             numeric,
  legacy_crop_id        uuid REFERENCES crops(id),
  created_at            timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 5: load_pools + load_pool_members
-- ============================================================

CREATE TABLE IF NOT EXISTS load_pools (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_cluster_id      uuid REFERENCES route_clusters(id),
  origin_district_id    uuid REFERENCES geo_districts(id),
  dest_district_id      uuid REFERENCES geo_districts(id),
  total_weight_kg       numeric DEFAULT 0,
  total_volume_cbm      numeric DEFAULT 0,
  capacity_target_kg    numeric,
  status                load_pool_status NOT NULL DEFAULT 'open',
  dispatch_window_start timestamptz,
  dispatch_window_end   timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS load_pool_members (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_pool_id          uuid NOT NULL REFERENCES load_pools(id) ON DELETE CASCADE,
  shipment_request_id   uuid NOT NULL REFERENCES shipment_requests(id),
  added_at              timestamptz DEFAULT now(),
  UNIQUE(load_pool_id, shipment_request_id)
);

-- ============================================================
-- SECTION 6: unified_trips + trip_legs
-- ============================================================

CREATE TABLE IF NOT EXISTS unified_trips (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id          uuid REFERENCES vehicles(id),
  driver_id           uuid REFERENCES auth.users(id),
  transporter_id      uuid REFERENCES auth.users(id),
  trip_status         unified_trip_status NOT NULL DEFAULT 'planned',
  trip_direction      trip_direction NOT NULL DEFAULT 'forward',
  start_location      text,
  end_location        text,
  start_geo_lat       numeric,
  start_geo_long      numeric,
  end_geo_lat         numeric,
  end_geo_long        numeric,
  capacity_total_kg   numeric,
  capacity_used_kg    numeric DEFAULT 0,
  capacity_total_cbm  numeric,
  capacity_used_cbm   numeric DEFAULT 0,
  planned_start_at    timestamptz,
  planned_end_at      timestamptz,
  actual_start_at     timestamptz,
  actual_end_at       timestamptz,
  legacy_trip_id      uuid REFERENCES trips(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_legs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_trip_id       uuid NOT NULL REFERENCES unified_trips(id) ON DELETE CASCADE,
  sequence_order        smallint NOT NULL,
  leg_type              text NOT NULL DEFAULT 'pickup' CHECK (leg_type IN ('pickup','drop','waypoint')),
  location_name         text,
  geo_lat               numeric,
  geo_long              numeric,
  district_id           uuid REFERENCES geo_districts(id),
  shipment_request_id   uuid REFERENCES shipment_requests(id),
  estimated_arrival_at  timestamptz,
  actual_arrival_at     timestamptz,
  status                text DEFAULT 'pending',
  created_at            timestamptz DEFAULT now(),
  UNIQUE(unified_trip_id, sequence_order)
);

-- ============================================================
-- SECTION 7: vehicle_capacity_blocks
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicle_capacity_blocks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_trip_id       uuid NOT NULL REFERENCES unified_trips(id) ON DELETE CASCADE,
  remaining_weight_kg   numeric NOT NULL,
  remaining_volume_cbm  numeric,
  available_from        timestamptz,
  available_until       timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 8: reverse_load_candidates
-- ============================================================

CREATE TABLE IF NOT EXISTS reverse_load_candidates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_trip_id       uuid NOT NULL REFERENCES unified_trips(id) ON DELETE CASCADE,
  route_cluster_id      uuid REFERENCES route_clusters(id),
  origin_district_id    uuid REFERENCES geo_districts(id),
  dest_district_id      uuid REFERENCES geo_districts(id),
  available_capacity_kg  numeric,
  available_capacity_cbm numeric,
  candidate_score       numeric DEFAULT 0,
  status                reverse_candidate_status NOT NULL DEFAULT 'identified',
  expires_at            timestamptz,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 9: shipment_bookings
-- ============================================================

CREATE TABLE IF NOT EXISTS shipment_bookings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_request_id   uuid NOT NULL REFERENCES shipment_requests(id),
  unified_trip_id       uuid NOT NULL REFERENCES unified_trips(id),
  booking_status        booking_status NOT NULL DEFAULT 'tentative',
  confirmed_at          timestamptz,
  weight_allocated_kg   numeric,
  volume_allocated_cbm  numeric,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(shipment_request_id, unified_trip_id)
);

-- ============================================================
-- SECTION 10: Enable RLS on all new tables
-- ============================================================

ALTER TABLE route_clusters           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_pools               ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_pool_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_trips            ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_legs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_capacity_blocks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reverse_load_candidates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_bookings        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 11: RLS Policies
-- ============================================================

-- 11a. route_clusters — read by any authenticated, write by admin/rpc
CREATE POLICY rc_select ON route_clusters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY rc_insert ON route_clusters
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY rc_update ON route_clusters
  FOR UPDATE TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

-- 11b. shipment_requests — owner, assigned transporter, or admin
CREATE POLICY sr_select ON shipment_requests
  FOR SELECT TO authenticated
  USING (
    source_actor_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM shipment_bookings sb
      JOIN unified_trips ut ON ut.id = sb.unified_trip_id
      WHERE sb.shipment_request_id = shipment_requests.id
        AND ut.transporter_id = auth.uid()
    )
  );

CREATE POLICY sr_insert ON shipment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    source_actor_id = auth.uid()
    OR is_admin()
    OR current_setting('app.rpc', true) = 'true'
  );

CREATE POLICY sr_update ON shipment_requests
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR current_setting('app.rpc', true) = 'true'
  );

-- 11c. shipment_items — follows parent shipment_requests access
CREATE POLICY si_select ON shipment_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shipment_requests sr
      WHERE sr.id = shipment_items.shipment_request_id
        AND (sr.source_actor_id = auth.uid() OR is_admin())
    )
    OR current_setting('app.rpc', true) = 'true'
  );

CREATE POLICY si_insert ON shipment_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shipment_requests sr
      WHERE sr.id = shipment_items.shipment_request_id
        AND (sr.source_actor_id = auth.uid() OR is_admin())
    )
    OR current_setting('app.rpc', true) = 'true'
  );

-- 11d. load_pools — admin/rpc only for write, read by participants
CREATE POLICY lp_select ON load_pools
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM load_pool_members lpm
      JOIN shipment_requests sr ON sr.id = lpm.shipment_request_id
      WHERE lpm.load_pool_id = load_pools.id
        AND sr.source_actor_id = auth.uid()
    )
  );

CREATE POLICY lp_insert ON load_pools
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY lp_update ON load_pools
  FOR UPDATE TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

-- 11e. load_pool_members — admin/rpc write, read via pool access
CREATE POLICY lpm_select ON load_pool_members
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM shipment_requests sr
      WHERE sr.id = load_pool_members.shipment_request_id
        AND sr.source_actor_id = auth.uid()
    )
  );

CREATE POLICY lpm_insert ON load_pool_members
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

-- 11f. unified_trips — transporter/driver or admin
CREATE POLICY ut_select ON unified_trips
  FOR SELECT TO authenticated
  USING (
    transporter_id = auth.uid()
    OR driver_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM shipment_bookings sb
      JOIN shipment_requests sr ON sr.id = sb.shipment_request_id
      WHERE sb.unified_trip_id = unified_trips.id
        AND sr.source_actor_id = auth.uid()
    )
  );

CREATE POLICY ut_insert ON unified_trips
  FOR INSERT TO authenticated
  WITH CHECK (
    transporter_id = auth.uid()
    OR is_admin()
    OR current_setting('app.rpc', true) = 'true'
  );

CREATE POLICY ut_update ON unified_trips
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR current_setting('app.rpc', true) = 'true'
  );

-- 11g. trip_legs — follows parent unified_trips access
CREATE POLICY tl_select ON trip_legs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unified_trips ut
      WHERE ut.id = trip_legs.unified_trip_id
        AND (ut.transporter_id = auth.uid() OR ut.driver_id = auth.uid() OR is_admin())
    )
    OR current_setting('app.rpc', true) = 'true'
  );

CREATE POLICY tl_insert ON trip_legs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY tl_update ON trip_legs
  FOR UPDATE TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

-- 11h. vehicle_capacity_blocks — follows parent unified_trips
CREATE POLICY vcb_select ON vehicle_capacity_blocks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unified_trips ut
      WHERE ut.id = vehicle_capacity_blocks.unified_trip_id
        AND (ut.transporter_id = auth.uid() OR is_admin())
    )
    OR current_setting('app.rpc', true) = 'true'
  );

CREATE POLICY vcb_insert ON vehicle_capacity_blocks
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY vcb_update ON vehicle_capacity_blocks
  FOR UPDATE TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

-- 11i. reverse_load_candidates — transporter or admin
CREATE POLICY rlc_select ON reverse_load_candidates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unified_trips ut
      WHERE ut.id = reverse_load_candidates.unified_trip_id
        AND (ut.transporter_id = auth.uid() OR is_admin())
    )
    OR current_setting('app.rpc', true) = 'true'
  );

CREATE POLICY rlc_insert ON reverse_load_candidates
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY rlc_update ON reverse_load_candidates
  FOR UPDATE TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

-- 11j. shipment_bookings — shipment owner, transporter, or admin
CREATE POLICY sb_select ON shipment_bookings
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM shipment_requests sr
      WHERE sr.id = shipment_bookings.shipment_request_id
        AND sr.source_actor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM unified_trips ut
      WHERE ut.id = shipment_bookings.unified_trip_id
        AND ut.transporter_id = auth.uid()
    )
  );

CREATE POLICY sb_insert ON shipment_bookings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR current_setting('app.rpc', true) = 'true');

CREATE POLICY sb_update ON shipment_bookings
  FOR UPDATE TO authenticated
  USING (is_admin() OR current_setting('app.rpc', true) = 'true');

-- ============================================================
-- SECTION 12: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_rc_origin_dest ON route_clusters(origin_district_id, dest_district_id);
CREATE INDEX IF NOT EXISTS idx_rc_active ON route_clusters(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sr_source_actor ON shipment_requests(source_actor_id);
CREATE INDEX IF NOT EXISTS idx_sr_status ON shipment_requests(status);
CREATE INDEX IF NOT EXISTS idx_sr_route_cluster ON shipment_requests(route_cluster_id);
CREATE INDEX IF NOT EXISTS idx_sr_origin_dest ON shipment_requests(origin_district_id, dest_district_id);
CREATE INDEX IF NOT EXISTS idx_sr_legacy_tr ON shipment_requests(legacy_transport_request_id) WHERE legacy_transport_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sr_legacy_mo ON shipment_requests(legacy_market_order_id) WHERE legacy_market_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_si_shipment ON shipment_items(shipment_request_id);

CREATE INDEX IF NOT EXISTS idx_lp_status ON load_pools(status);
CREATE INDEX IF NOT EXISTS idx_lp_route_cluster ON load_pools(route_cluster_id);

CREATE INDEX IF NOT EXISTS idx_lpm_pool ON load_pool_members(load_pool_id);
CREATE INDEX IF NOT EXISTS idx_lpm_shipment ON load_pool_members(shipment_request_id);

CREATE INDEX IF NOT EXISTS idx_ut_transporter ON unified_trips(transporter_id);
CREATE INDEX IF NOT EXISTS idx_ut_driver ON unified_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_ut_status ON unified_trips(trip_status);
CREATE INDEX IF NOT EXISTS idx_ut_vehicle ON unified_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ut_legacy_trip ON unified_trips(legacy_trip_id) WHERE legacy_trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tl_trip ON trip_legs(unified_trip_id);
CREATE INDEX IF NOT EXISTS idx_tl_shipment ON trip_legs(shipment_request_id);

CREATE INDEX IF NOT EXISTS idx_vcb_trip ON vehicle_capacity_blocks(unified_trip_id);

CREATE INDEX IF NOT EXISTS idx_rlc_trip ON reverse_load_candidates(unified_trip_id);
CREATE INDEX IF NOT EXISTS idx_rlc_status ON reverse_load_candidates(status);
CREATE INDEX IF NOT EXISTS idx_rlc_cluster ON reverse_load_candidates(route_cluster_id);

CREATE INDEX IF NOT EXISTS idx_sb_shipment ON shipment_bookings(shipment_request_id);
CREATE INDEX IF NOT EXISTS idx_sb_trip ON shipment_bookings(unified_trip_id);
CREATE INDEX IF NOT EXISTS idx_sb_status ON shipment_bookings(booking_status);

-- ============================================================
-- SECTION 13: updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_route_clusters_updated_at
    BEFORE UPDATE ON route_clusters
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_shipment_requests_updated_at
    BEFORE UPDATE ON shipment_requests
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_load_pools_updated_at
    BEFORE UPDATE ON load_pools
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_unified_trips_updated_at
    BEFORE UPDATE ON unified_trips
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_vehicle_capacity_blocks_updated_at
    BEFORE UPDATE ON vehicle_capacity_blocks
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_reverse_load_candidates_updated_at
    BEFORE UPDATE ON reverse_load_candidates
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_shipment_bookings_updated_at
    BEFORE UPDATE ON shipment_bookings
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 14: Status-change guard triggers
-- Prevent direct status updates; must go through RPCs.
-- ============================================================

CREATE OR REPLACE FUNCTION trg_block_direct_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF current_setting('app.rpc', true) IS DISTINCT FROM 'true'
       AND NOT is_admin() THEN
      RAISE EXCEPTION 'Direct status updates are blocked. Use the appropriate RPC.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_block_status_shipment_requests
    BEFORE UPDATE ON shipment_requests
    FOR EACH ROW EXECUTE FUNCTION trg_block_direct_status_change();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_block_status_unified_trips
    BEFORE UPDATE ON unified_trips
    FOR EACH ROW
    WHEN (OLD.trip_status IS DISTINCT FROM NEW.trip_status)
    EXECUTE FUNCTION trg_block_direct_status_change();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_block_status_shipment_bookings
    BEFORE UPDATE ON shipment_bookings
    FOR EACH ROW
    WHEN (OLD.booking_status IS DISTINCT FROM NEW.booking_status)
    EXECUTE FUNCTION trg_block_direct_status_change();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
