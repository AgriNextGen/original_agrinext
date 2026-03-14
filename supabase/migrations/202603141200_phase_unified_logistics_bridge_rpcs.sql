-- ============================================================
-- PHASE: Unified Logistics Engine — Bridge RPCs
-- Migration: 202603141200_phase_unified_logistics_bridge_rpcs.sql
--
-- Creates bridge functions and triggers that keep the new
-- unified logistics tables in sync with legacy transport_requests
-- and trips tables. This ensures backward compatibility:
-- every legacy INSERT/UPDATE automatically mirrors into the
-- unified domain.
--
-- Rules: Additive only. No existing table changes.
-- ============================================================

-- ============================================================
-- SECTION 1: bridge_transport_request_to_shipment_v1
--
-- Maps a legacy transport_requests row into:
--   shipment_requests + shipment_items
-- ============================================================

CREATE OR REPLACE FUNCTION public.bridge_transport_request_to_shipment_v1(
  p_transport_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tr           record;
  v_crop         record;
  v_shipment_id  uuid;
  v_now          timestamptz := now();
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_tr
    FROM transport_requests
    WHERE id = p_transport_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSPORT_REQUEST_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM shipment_requests
    WHERE legacy_transport_request_id = p_transport_request_id
  ) THEN
    SELECT id INTO v_shipment_id
      FROM shipment_requests
      WHERE legacy_transport_request_id = p_transport_request_id
      LIMIT 1;
    RETURN jsonb_build_object('shipment_request_id', v_shipment_id, 'already_exists', true);
  END IF;

  INSERT INTO shipment_requests (
    request_source_type,
    source_actor_id,
    shipment_type,
    pickup_location,
    drop_location,
    origin_district_id,
    dest_district_id,
    origin_market_id,
    dest_market_id,
    pickup_time_window_start,
    pickup_time_window_end,
    weight_estimate_kg,
    status,
    notes,
    legacy_transport_request_id,
    created_at,
    updated_at
  ) VALUES (
    'farmer'::shipment_source_type,
    v_tr.farmer_id,
    'farm_produce'::shipment_type,
    v_tr.pickup_location,
    v_tr.drop_location,
    v_tr.origin_district_id,
    v_tr.dest_district_id,
    v_tr.origin_market_id,
    v_tr.dest_market_id,
    v_tr.pickup_window_start,
    v_tr.pickup_window_end,
    v_tr.quantity,
    'pending'::shipment_status,
    v_tr.notes,
    p_transport_request_id,
    COALESCE(v_tr.created_at, v_now),
    v_now
  )
  RETURNING id INTO v_shipment_id;

  IF v_tr.crop_id IS NOT NULL THEN
    SELECT name, category INTO v_crop
      FROM crops
      WHERE id = v_tr.crop_id;

    INSERT INTO shipment_items (
      shipment_request_id,
      product_name,
      category,
      quantity,
      unit,
      weight_kg,
      legacy_crop_id,
      created_at
    ) VALUES (
      v_shipment_id,
      COALESCE(v_crop.name, 'Unknown Crop'),
      v_crop.category,
      v_tr.quantity,
      COALESCE(v_tr.quantity_unit, 'kg'),
      v_tr.quantity,
      v_tr.crop_id,
      v_now
    );
  ELSE
    INSERT INTO shipment_items (
      shipment_request_id,
      product_name,
      quantity,
      unit,
      weight_kg,
      created_at
    ) VALUES (
      v_shipment_id,
      'Farm Produce',
      v_tr.quantity,
      COALESCE(v_tr.quantity_unit, 'kg'),
      v_tr.quantity,
      v_now
    );
  END IF;

  RETURN jsonb_build_object('shipment_request_id', v_shipment_id, 'already_exists', false);
END;
$$;

-- ============================================================
-- SECTION 2: bridge_trip_to_unified_trip_v1
--
-- Maps a legacy trips row into:
--   unified_trips + trip_legs + shipment_bookings
-- ============================================================

CREATE OR REPLACE FUNCTION public.bridge_trip_to_unified_trip_v1(
  p_trip_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trip            record;
  v_tr              record;
  v_unified_trip_id uuid;
  v_shipment_id     uuid;
  v_status_map      unified_trip_status;
  v_now             timestamptz := now();
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_trip
    FROM trips
    WHERE id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRIP_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unified_trips
    WHERE legacy_trip_id = p_trip_id
  ) THEN
    SELECT id INTO v_unified_trip_id
      FROM unified_trips
      WHERE legacy_trip_id = p_trip_id
      LIMIT 1;
    RETURN jsonb_build_object('unified_trip_id', v_unified_trip_id, 'already_exists', true);
  END IF;

  SELECT * INTO v_tr
    FROM transport_requests
    WHERE id = v_trip.transport_request_id;

  v_status_map := CASE v_trip.status
    WHEN 'created'     THEN 'planned'::unified_trip_status
    WHEN 'assigned'    THEN 'assigned'::unified_trip_status
    WHEN 'accepted'    THEN 'accepted'::unified_trip_status
    WHEN 'pickup_done' THEN 'pickup_done'::unified_trip_status
    WHEN 'in_transit'  THEN 'in_transit'::unified_trip_status
    WHEN 'delivered'   THEN 'delivered'::unified_trip_status
    WHEN 'completed'   THEN 'completed'::unified_trip_status
    WHEN 'cancelled'   THEN 'cancelled'::unified_trip_status
    ELSE 'planned'::unified_trip_status
  END;

  INSERT INTO unified_trips (
    vehicle_id,
    driver_id,
    transporter_id,
    trip_status,
    trip_direction,
    start_location,
    end_location,
    capacity_total_kg,
    legacy_trip_id,
    created_at,
    updated_at
  ) VALUES (
    v_trip.vehicle_id,
    v_trip.transporter_id,
    v_trip.transporter_id,
    v_status_map,
    'forward'::trip_direction,
    COALESCE(v_tr.pickup_location, ''),
    COALESCE(v_tr.drop_location, ''),
    CASE WHEN v_trip.vehicle_id IS NOT NULL THEN
      (SELECT capacity_kg FROM vehicles WHERE id = v_trip.vehicle_id)
    ELSE NULL END,
    p_trip_id,
    COALESCE(v_trip.created_at, v_now),
    v_now
  )
  RETURNING id INTO v_unified_trip_id;

  IF v_tr.id IS NOT NULL THEN
    INSERT INTO trip_legs (unified_trip_id, sequence_order, leg_type, location_name, status)
      VALUES (v_unified_trip_id, 1, 'pickup', v_tr.pickup_location, 'pending');

    INSERT INTO trip_legs (unified_trip_id, sequence_order, leg_type, location_name, status)
      VALUES (v_unified_trip_id, 2, 'drop', v_tr.drop_location, 'pending');
  END IF;

  SELECT id INTO v_shipment_id
    FROM shipment_requests
    WHERE legacy_transport_request_id = v_trip.transport_request_id
    LIMIT 1;

  IF v_shipment_id IS NOT NULL THEN
    INSERT INTO shipment_bookings (
      shipment_request_id,
      unified_trip_id,
      booking_status,
      confirmed_at,
      weight_allocated_kg,
      created_at,
      updated_at
    ) VALUES (
      v_shipment_id,
      v_unified_trip_id,
      'confirmed'::booking_status,
      v_now,
      v_tr.quantity,
      v_now,
      v_now
    )
    ON CONFLICT (shipment_request_id, unified_trip_id) DO NOTHING;

    UPDATE shipment_requests
      SET status = 'booked'::shipment_status
      WHERE id = v_shipment_id
        AND status IN ('pending'::shipment_status, 'pooled'::shipment_status);
  END IF;

  RETURN jsonb_build_object('unified_trip_id', v_unified_trip_id, 'already_exists', false);
END;
$$;

-- ============================================================
-- SECTION 3: sync_legacy_trip_status_v1
--
-- Syncs status changes from legacy trips to unified_trips,
-- shipment_bookings, and shipment_requests.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_legacy_trip_status_v1(
  p_trip_id uuid,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_unified_trip_id uuid;
  v_shipment_id     uuid;
  v_new_trip_status unified_trip_status;
  v_new_booking     booking_status;
  v_new_shipment    shipment_status;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT id INTO v_unified_trip_id
    FROM unified_trips
    WHERE legacy_trip_id = p_trip_id;

  IF v_unified_trip_id IS NULL THEN
    RETURN;
  END IF;

  v_new_trip_status := CASE p_new_status
    WHEN 'created'     THEN 'planned'::unified_trip_status
    WHEN 'assigned'    THEN 'assigned'::unified_trip_status
    WHEN 'accepted'    THEN 'accepted'::unified_trip_status
    WHEN 'pickup_done' THEN 'pickup_done'::unified_trip_status
    WHEN 'in_transit'  THEN 'in_transit'::unified_trip_status
    WHEN 'delivered'   THEN 'delivered'::unified_trip_status
    WHEN 'completed'   THEN 'completed'::unified_trip_status
    WHEN 'cancelled'   THEN 'cancelled'::unified_trip_status
    ELSE 'planned'::unified_trip_status
  END;

  UPDATE unified_trips
    SET trip_status = v_new_trip_status
    WHERE id = v_unified_trip_id;

  v_new_booking := CASE p_new_status
    WHEN 'accepted'    THEN 'confirmed'::booking_status
    WHEN 'pickup_done' THEN 'in_transit'::booking_status
    WHEN 'in_transit'  THEN 'in_transit'::booking_status
    WHEN 'delivered'   THEN 'delivered'::booking_status
    WHEN 'completed'   THEN 'delivered'::booking_status
    WHEN 'cancelled'   THEN 'cancelled'::booking_status
    ELSE NULL
  END;

  IF v_new_booking IS NOT NULL THEN
    UPDATE shipment_bookings
      SET booking_status = v_new_booking
      WHERE unified_trip_id = v_unified_trip_id;
  END IF;

  v_new_shipment := CASE p_new_status
    WHEN 'pickup_done' THEN 'in_transit'::shipment_status
    WHEN 'in_transit'  THEN 'in_transit'::shipment_status
    WHEN 'delivered'   THEN 'delivered'::shipment_status
    WHEN 'completed'   THEN 'completed'::shipment_status
    WHEN 'cancelled'   THEN 'cancelled'::shipment_status
    ELSE NULL
  END;

  IF v_new_shipment IS NOT NULL THEN
    FOR v_shipment_id IN
      SELECT sb.shipment_request_id
        FROM shipment_bookings sb
        WHERE sb.unified_trip_id = v_unified_trip_id
    LOOP
      UPDATE shipment_requests
        SET status = v_new_shipment
        WHERE id = v_shipment_id;
    END LOOP;
  END IF;
END;
$$;

-- ============================================================
-- SECTION 4: Triggers on legacy tables
--
-- These fire AFTER INSERT/UPDATE so they don't interfere
-- with existing RPC logic or status guards.
-- ============================================================

-- 4a. After INSERT on transport_requests → bridge to shipment
CREATE OR REPLACE FUNCTION trg_bridge_transport_request_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM bridge_transport_request_to_shipment_v1(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'bridge_transport_request failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bridge_tr_to_shipment ON transport_requests;
CREATE TRIGGER trg_bridge_tr_to_shipment
  AFTER INSERT ON transport_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_bridge_transport_request_after_insert();

-- 4b. After INSERT on trips → bridge to unified_trip
CREATE OR REPLACE FUNCTION trg_bridge_trip_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM bridge_trip_to_unified_trip_v1(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'bridge_trip failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bridge_trip_to_unified ON trips;
CREATE TRIGGER trg_bridge_trip_to_unified
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trg_bridge_trip_after_insert();

-- 4c. After UPDATE on trips.status → sync to unified
CREATE OR REPLACE FUNCTION trg_sync_trip_status_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM sync_legacy_trip_status_v1(NEW.id, NEW.status);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_legacy_trip_status failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trip_status ON trips;
CREATE TRIGGER trg_sync_trip_status
  AFTER UPDATE ON trips
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trg_sync_trip_status_after_update();
