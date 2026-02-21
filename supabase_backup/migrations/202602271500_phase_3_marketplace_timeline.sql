-- RPC to return order timeline (audit events) for a given order_id with access checks
CREATE OR REPLACE FUNCTION public.get_order_timeline_v1(p_order_id uuid)
RETURNS TABLE(event_id uuid, actor_user_id uuid, event_type text, payload jsonb, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_buyer uuid;
  v_farmer uuid;
BEGIN
  -- find buyer and farmer from order
  SELECT buyer_id, (SELECT farmer_id FROM public.listings l JOIN public.market_orders mo ON mo.listing_id = l.id WHERE mo.id = p_order_id) INTO v_buyer, v_farmer;

  -- Access check: allow admin, buyer, or farmer
  IF NOT (is_admin() OR auth.uid()::text = v_buyer::text OR auth.uid()::text = v_farmer::text) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  RETURN QUERY
  SELECT id, actor_user_id, event_type, payload, created_at
  FROM audit.workflow_events
  WHERE (payload->>'order_id') = p_order_id::text
  ORDER BY created_at ASC;
END;
$$;

