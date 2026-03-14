-- ============================================================
-- PHASE: Unified Logistics Engine — Detail & Item RPCs
-- Migration: 202603141400_phase_unified_logistics_detail_rpcs.sql
--
-- Adds RPCs to consolidate N+1 query patterns:
--   1. get_shipment_detail_v1 — single-call shipment + items + bookings
--   2. get_unified_trip_detail_v1 — single-call trip + legs + bookings
--   3. add_shipment_items_v1 — add items to existing shipment via RPC
--
-- Rules: Additive only. No existing function changes.
-- ============================================================

-- ============================================================
-- 1. get_shipment_detail_v1
--
-- Returns a shipment with its items and bookings in one call.
-- Eliminates the 3-query pattern in the Edge Function.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_shipment_detail_v1(
  p_shipment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_shipment jsonb;
  v_items    jsonb;
  v_bookings jsonb;
BEGIN
  SELECT to_jsonb(sr.*) INTO v_shipment
    FROM shipment_requests sr
    WHERE sr.id = p_shipment_id;

  IF v_shipment IS NULL THEN
    RAISE EXCEPTION 'SHIPMENT_NOT_FOUND';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(si.*) ORDER BY si.created_at), '[]'::jsonb)
    INTO v_items
    FROM shipment_items si
    WHERE si.shipment_request_id = p_shipment_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sb.*) ORDER BY sb.created_at), '[]'::jsonb)
    INTO v_bookings
    FROM shipment_bookings sb
    WHERE sb.shipment_request_id = p_shipment_id;

  RETURN v_shipment || jsonb_build_object('items', v_items, 'bookings', v_bookings);
END;
$$;

-- ============================================================
-- 2. get_unified_trip_detail_v1
--
-- Returns a unified trip with its legs and bookings in one call.
-- Legs are ordered by sequence_order.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_unified_trip_detail_v1(
  p_trip_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_trip     jsonb;
  v_legs     jsonb;
  v_bookings jsonb;
BEGIN
  SELECT to_jsonb(ut.*) INTO v_trip
    FROM unified_trips ut
    WHERE ut.id = p_trip_id;

  IF v_trip IS NULL THEN
    RAISE EXCEPTION 'TRIP_NOT_FOUND';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(tl.*) ORDER BY tl.sequence_order), '[]'::jsonb)
    INTO v_legs
    FROM trip_legs tl
    WHERE tl.unified_trip_id = p_trip_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(sb.*) ORDER BY sb.created_at), '[]'::jsonb)
    INTO v_bookings
    FROM shipment_bookings sb
    WHERE sb.unified_trip_id = p_trip_id;

  RETURN v_trip || jsonb_build_object('legs', v_legs, 'bookings', v_bookings);
END;
$$;

-- ============================================================
-- 3. add_shipment_items_v1
--
-- Adds one or more items to an existing shipment request.
-- Validates shipment existence before inserting.
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_shipment_items_v1(
  p_shipment_id uuid,
  p_items       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_item       jsonb;
  v_item_id    uuid;
  v_inserted   jsonb := '[]'::jsonb;
  v_count      int := 0;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  IF NOT EXISTS (SELECT 1 FROM shipment_requests WHERE id = p_shipment_id) THEN
    RAISE EXCEPTION 'SHIPMENT_NOT_FOUND';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
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
      p_shipment_id,
      v_item->>'product_name',
      v_item->>'category',
      (v_item->>'quantity')::numeric,
      COALESCE(v_item->>'unit', 'kg'),
      (v_item->>'weight_kg')::numeric,
      (v_item->>'legacy_crop_id')::uuid
    )
    RETURNING id INTO v_item_id;

    v_inserted := v_inserted || jsonb_build_object('item_id', v_item_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'shipment_request_id', p_shipment_id,
    'items_added', v_count,
    'item_ids', v_inserted
  );
END;
$$;
