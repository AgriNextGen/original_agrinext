-- Phase 3: Marketplace RPCs (place_order_v1, farmer_confirm_order_v1, farmer_reject_order_v1, update_order_status_v1, admin_override_order_v1)
-- File: supabase/migrations/202602271400_phase_3_marketplace_rpcs.sql

-- place_order_v1
CREATE OR REPLACE FUNCTION public.place_order_v1(
  p_listing_id uuid,
  p_qty numeric,
  p_notes text DEFAULT NULL,
  p_buyer_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_list RECORD;
  v_order_id uuid;
  v_now timestamptz := now();
  v_request_id uuid := public.new_request_id_v1();
  v_total numeric(14,2);
BEGIN
  PERFORM set_config('app.rpc','true',true);

  SELECT id, farmer_id, unit_price, available_qty, status
    INTO v_list
    FROM public.listings
    WHERE id = p_listing_id
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'LISTING_NOT_FOUND'; END IF;
  IF v_list.status != 'approved' THEN RAISE EXCEPTION 'LISTING_NOT_AVAILABLE'; END IF;
  IF v_list.available_qty < p_qty THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK'; END IF;

  v_total := round((p_qty * v_list.unit_price)::numeric, 2);

  -- reserve inventory
  UPDATE public.listings SET available_qty = available_qty - p_qty WHERE id = p_listing_id;

  INSERT INTO public.market_orders (listing_id, buyer_id, qty, unit_price, total_amount, status, created_at, updated_at)
    VALUES (p_listing_id, p_buyer_id, p_qty, v_list.unit_price, v_total, 'placed', v_now, v_now)
    RETURNING id INTO v_order_id;

  -- audit
  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, request_id, payload, created_at)
      VALUES (p_buyer_id, 'ORDER_PLACED', v_request_id, jsonb_build_object('order_id', v_order_id, 'listing_id', p_listing_id, 'qty', p_qty, 'total', v_total)::jsonb, v_now);
  END IF;

  -- notify farmer
  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, type)
      VALUES (v_list.farmer_id, 'New order placed', format('Order %s placed for your listing %s', v_order_id::text, p_listing_id::text), false, 'order');
  END IF;

  RETURN jsonb_build_object('order_id', v_order_id, 'request_id', v_request_id);
END;
$$;

-- farmer_confirm_order_v1
CREATE OR REPLACE FUNCTION public.farmer_confirm_order_v1(p_order_id uuid, p_caller_id uuid DEFAULT auth.uid())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order RECORD;
  v_list RECORD;
  v_now timestamptz := now();
  v_request_id uuid := public.new_request_id_v1();
BEGIN
  PERFORM set_config('app.rpc','true',true);
  SELECT * INTO v_order FROM public.market_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  SELECT * INTO v_list FROM public.listings WHERE id = v_order.listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LISTING_NOT_FOUND'; END IF;

  IF v_list.farmer_id::text <> p_caller_id::text AND NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_order.status != 'placed' THEN RAISE EXCEPTION 'INVALID_ORDER_STATUS'; END IF;

  UPDATE public.market_orders SET status = 'confirmed', updated_at = v_now WHERE id = p_order_id;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, request_id, payload, created_at)
      VALUES (p_caller_id, 'ORDER_CONFIRMED', v_request_id, jsonb_build_object('order_id', p_order_id)::jsonb, v_now);
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, type)
      VALUES ((SELECT buyer_id FROM public.market_orders WHERE id = p_order_id), 'Order confirmed', format('Your order %s has been confirmed', p_order_id::text), false, 'order');
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', v_request_id);
END;
$$;

-- farmer_reject_order_v1
CREATE OR REPLACE FUNCTION public.farmer_reject_order_v1(p_order_id uuid, p_reason text, p_caller_id uuid DEFAULT auth.uid())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order RECORD;
  v_list RECORD;
  v_now timestamptz := now();
  v_request_id uuid := public.new_request_id_v1();
BEGIN
  PERFORM set_config('app.rpc','true',true);
  SELECT * INTO v_order FROM public.market_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  SELECT * INTO v_list FROM public.listings WHERE id = v_order.listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LISTING_NOT_FOUND'; END IF;

  IF v_list.farmer_id::text <> p_caller_id::text AND NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_order.status != 'placed' THEN RAISE EXCEPTION 'INVALID_ORDER_STATUS'; END IF;

  UPDATE public.market_orders SET status = 'rejected', cancelled_reason = p_reason, updated_at = v_now WHERE id = p_order_id;

  -- restore inventory
  UPDATE public.listings SET available_qty = available_qty + v_order.qty WHERE id = v_order.listing_id;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, request_id, payload, created_at)
      VALUES (p_caller_id, 'ORDER_REJECTED', v_request_id, jsonb_build_object('order_id', p_order_id, 'reason', p_reason)::jsonb, v_now);
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, type)
      VALUES ((SELECT buyer_id FROM public.market_orders WHERE id = p_order_id), 'Order rejected', format('Your order %s was rejected: %s', p_order_id::text, p_reason), false, 'order');
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', v_request_id);
END;
$$;

-- update_order_status_v1
CREATE OR REPLACE FUNCTION public.update_order_status_v1(
  p_order_id uuid,
  p_new_status text,
  p_proof_file_id uuid DEFAULT NULL,
  p_caller_id uuid DEFAULT auth.uid()
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order RECORD;
  v_list RECORD;
  v_now timestamptz := now();
  v_request_id uuid := public.new_request_id_v1();
  v_old_status text;
BEGIN
  PERFORM set_config('app.rpc','true',true);
  SELECT * INTO v_order FROM public.market_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  SELECT * INTO v_list FROM public.listings WHERE id = v_order.listing_id FOR UPDATE;
  v_old_status := v_order.status;

  -- Authorization
  IF NOT (is_admin() OR p_caller_id::text = v_list.farmer_id::text OR p_caller_id::text = v_order.buyer_id::text) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Allowed transitions
  IF v_old_status = 'confirmed' AND p_new_status = 'packed' THEN
    NULL;
  ELSIF v_old_status = 'packed' AND p_new_status = 'ready_for_pickup' THEN
    NULL;
  ELSIF v_old_status = 'ready_for_pickup' AND p_new_status = 'delivered' THEN
    -- optional proof
    NULL;
  ELSIF p_new_status = 'cancelled' THEN
    -- allow buyer before packed, farmer admin rules checked below
    NULL;
  ELSE
    RAISE EXCEPTION 'INVALID_TRANSITION: % -> %', v_old_status, p_new_status;
  END IF;

  -- proof ownership check
  IF p_proof_file_id IS NOT NULL AND to_regclass('public.files') IS NOT NULL THEN
    PERFORM 1 FROM public.files f WHERE f.id = p_proof_file_id AND (f.owner_user_id::text = p_caller_id::text OR is_admin());
    IF NOT FOUND THEN RAISE EXCEPTION 'PROOF_INVALID_OWNER'; END IF;
  END IF;

  -- If cancelling, restore inventory if needed
  IF p_new_status = 'cancelled' THEN
    IF v_old_status IN ('placed','confirmed') THEN
      UPDATE public.listings SET available_qty = available_qty + v_order.qty WHERE id = v_order.listing_id;
    END IF;
  END IF;

  UPDATE public.market_orders SET status = p_new_status, proof_file_id = COALESCE(p_proof_file_id, proof_file_id), updated_at = v_now WHERE id = p_order_id;

  -- audit
  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, request_id, payload, created_at)
      VALUES (p_caller_id, 'ORDER_STATUS_UPDATED', v_request_id, jsonb_build_object('order_id', p_order_id, 'old_status', v_old_status, 'new_status', p_new_status, 'proof_file_id', p_proof_file_id)::jsonb, v_now);
  END IF;

  -- notify
  IF to_regclass('public.notifications') IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, is_read, type)
      VALUES ((SELECT buyer_id FROM public.market_orders WHERE id = p_order_id), 'Order update', format('Order %s status changed to %s', p_order_id::text, p_new_status), false, 'order');
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', v_request_id);
END;
$$;

-- admin_override_order_v1
CREATE OR REPLACE FUNCTION admin.admin_override_order_v1(p_order_id uuid, p_new_status text, p_reason text, p_admin_id uuid DEFAULT auth.uid())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_now timestamptz := now();
  v_request_id uuid := public.new_request_id_v1();
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  UPDATE public.market_orders SET status = p_new_status, updated_at = v_now WHERE id = p_order_id;

  IF to_regclass('audit.admin_actions') IS NOT NULL THEN
    INSERT INTO audit.admin_actions (actor_user_id, action, target_id, details, created_at)
      VALUES (p_admin_id, 'admin_override_order', p_order_id, jsonb_build_object('new_status', p_new_status, 'reason', p_reason)::jsonb, v_now);
  END IF;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, request_id, payload, created_at)
      VALUES (p_admin_id, 'ORDER_ADMIN_OVERRIDE', v_request_id, jsonb_build_object('order_id', p_order_id, 'new_status', p_new_status, 'reason', p_reason)::jsonb, v_now);
  END IF;

  RETURN jsonb_build_object('ok', true, 'request_id', v_request_id);
END;
$$;

