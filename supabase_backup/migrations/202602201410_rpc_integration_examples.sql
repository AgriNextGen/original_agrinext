-- RPC integration examples for Phase E2
-- These are example CREATE OR REPLACE FUNCTION snippets to illustrate
-- where to call audit and secure functions from existing RPCs.
-- Review and adapt to your existing function bodies before applying.

-- Example: update_trip_status_v1 (minimal integration)
CREATE OR REPLACE FUNCTION public.update_trip_status_v1_with_audit(p_trip_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_id uuid := audit.new_request_id_v1();
  v_old_status text;
  v_actor uuid := auth.uid();
BEGIN
  SELECT status INTO v_old_status FROM public.trips WHERE id = p_trip_id;

  -- perform existing update (replace with your logic)
  UPDATE public.trips SET status = p_new_status, updated_at = now() WHERE id = p_trip_id;

  -- log workflow event
  PERFORM audit.log_workflow_event_v1(v_request_id, 'trip', p_trip_id, 'TRIP_STATUS_UPDATED', v_actor, NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status));

  -- audit snapshot
  PERFORM audit.log_audit_log_v1(v_request_id, 'trip', p_trip_id, 'status_updated', v_actor, NULL, NULL, NULL, jsonb_build_object('status', v_old_status), jsonb_build_object('status', p_new_status), '{}'::jsonb);
END;
$$;

-- Example: accept_transport_load_v1
CREATE OR REPLACE FUNCTION public.accept_transport_load_v1_with_audit(p_load_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_id uuid := audit.new_request_id_v1();
  v_actor uuid := auth.uid();
BEGIN
  -- example core update
  UPDATE public.loads SET accepted = true, accepted_at = now() WHERE id = p_load_id;

  PERFORM audit.log_workflow_event_v1(v_request_id, 'load', p_load_id, 'LOAD_ACCEPTED', v_actor, NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('note','accepted via API'));
  PERFORM audit.log_audit_log_v1(v_request_id, 'load', p_load_id, 'load_accepted', v_actor, NULL, NULL, NULL, NULL, jsonb_build_object('accepted', true, 'accepted_at', now()));
END;
$$;

-- Example: farmer_update_order_status_v1
CREATE OR REPLACE FUNCTION public.farmer_update_order_status_v1_with_audit(p_order_id uuid, p_new_status text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_request_id uuid := audit.new_request_id_v1();
  v_old_status text;
  v_actor uuid := auth.uid();
BEGIN
  SELECT status INTO v_old_status FROM public.market_orders WHERE id = p_order_id;
  UPDATE public.market_orders SET status = p_new_status, updated_at = now() WHERE id = p_order_id;

  PERFORM audit.log_workflow_event_v1(v_request_id, 'market_order', p_order_id, 'ORDER_STATUS_UPDATED', v_actor, NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status));
  PERFORM audit.log_audit_log_v1(v_request_id, 'market_order', p_order_id, 'order_status_updated', v_actor, NULL, NULL, NULL, jsonb_build_object('status', v_old_status), jsonb_build_object('status', p_new_status), '{}'::jsonb);
END;
$$;

-- Note: These are example "with_audit" wrappers. Replace your existing RPCs or merge the audit calls into your function bodies.

