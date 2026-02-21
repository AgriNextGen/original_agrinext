-- supabase/migrations/202602201410_phase_5_2_read_rpcs.sql
-- Phase 5.2: Read RPCs for timelines, dashboards and cursor lists

-- 1) get_timeline_v1
CREATE OR REPLACE FUNCTION public.get_timeline_v1(
  p_entity_type text,
  p_entity_id uuid,
  p_limit int DEFAULT 50,
  p_before timestamptz DEFAULT NULL
) RETURNS TABLE (
  created_at timestamptz,
  event_type text,
  actor_user_id uuid,
  metadata jsonb,
  request_id uuid
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 100));
  v_before timestamptz := COALESCE(p_before, now());
  v_buyer uuid;
  v_farmer uuid;
  v_listing_owner uuid;
  v_transporter uuid;
  v_trip_transport_request uuid;
BEGIN
  -- Access checks per entity_type
  IF public.is_admin() THEN
    NULL; -- admin allowed
  ELSE
    IF p_entity_type = 'order' THEN
      SELECT buyer_id, farmer_id INTO v_buyer, v_farmer FROM public.market_orders WHERE id = p_entity_id LIMIT 1;
      IF v_buyer IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
      IF auth.uid()::text <> v_buyer::text AND auth.uid()::text <> v_farmer::text THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
    ELSIF p_entity_type = 'listing' THEN
      SELECT seller_id INTO v_listing_owner FROM public.listings WHERE id = p_entity_id LIMIT 1;
      IF v_listing_owner IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
      -- allow if listing approved/public or owner
      IF auth.uid()::text <> v_listing_owner::text THEN
        -- check listing status
        IF EXISTS (SELECT 1 FROM public.listings WHERE id = p_entity_id AND status = 'approved') THEN
          NULL; -- allow public approved listing
        ELSE
          RAISE EXCEPTION 'FORBIDDEN';
        END IF;
      END IF;
    ELSIF p_entity_type = 'trip' THEN
      SELECT transporter_id, transport_request_id INTO v_transporter, v_trip_transport_request FROM public.trips WHERE id = p_entity_id LIMIT 1;
      IF v_transporter IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
      -- allow if transporter, or related transport_request farmer, or admin
      IF auth.uid()::text <> v_transporter::text THEN
        SELECT farmer_id INTO v_buyer FROM public.transport_requests WHERE id = v_trip_transport_request LIMIT 1;
        IF v_buyer IS NULL OR auth.uid()::text <> v_buyer::text THEN
          RAISE EXCEPTION 'FORBIDDEN';
        END IF;
      END IF;
    ELSE
      -- default: restrict to admin for unknown entity types
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  RETURN QUERY
  SELECT w.created_at, w.event_type, w.actor_user_id, w.metadata, w.request_id
  FROM audit.workflow_events w
  WHERE w.entity_type = p_entity_type AND w.entity_id = p_entity_id AND w.created_at < v_before
  ORDER BY w.created_at DESC
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_timeline_v1(text,uuid,int,timestamptz) TO authenticated;

-- 2) farmer_dashboard_v1
CREATE OR REPLACE FUNCTION public.farmer_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  -- determine profile id: profiles.id = auth.users.id in this schema
  v_profile_id := v_user;

  -- counts
  v_result := jsonb_build_object(
    'crops_by_status', (SELECT jsonb_object_agg(status, cnt) FROM (SELECT status, COUNT(*) AS cnt FROM public.crops WHERE farmer_id = v_profile_id GROUP BY status) t),
    'listings_by_status', (SELECT jsonb_object_agg(status, cnt) FROM (SELECT status, COUNT(*) AS cnt FROM public.listings WHERE seller_id = v_profile_id GROUP BY status) t),
    'open_transport_requests_count', (SELECT COUNT(*) FROM public.transport_requests WHERE farmer_id = v_profile_id AND status IN ('requested','assigned')),
    'active_orders_count', (SELECT COUNT(*) FROM public.market_orders WHERE farmer_id = v_profile_id AND status NOT IN ('delivered','cancelled','rejected')),
    'recent_orders', (SELECT jsonb_agg(row_to_json(ro)) FROM (SELECT id, status, COALESCE(total_amount, 0)::numeric(14,2) AS total_amount, updated_at FROM public.market_orders WHERE farmer_id = v_profile_id ORDER BY updated_at DESC LIMIT 10) ro),
    'unread_notifications_count', (SELECT COUNT(*) FROM public.notifications WHERE profile_id = v_profile_id AND (read_at IS NULL))
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.farmer_dashboard_v1() TO authenticated;
 
-- agent_dashboard_v1
CREATE OR REPLACE FUNCTION public.agent_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_res jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_res := jsonb_build_object(
    'assigned_farmers_count', (SELECT count(*) FROM agent_farmer_assignments afa WHERE afa.agent_id = v_user AND afa.active = true),
    'pending_tasks_count', (SELECT count(*) FROM agent_tasks at WHERE at.agent_id = v_user AND at.task_status = 'pending'),
    'tasks_top10', (SELECT jsonb_agg(row_to_json(t)) FROM (SELECT id, task_type, task_status, due_date FROM agent_tasks WHERE agent_id = v_user ORDER BY due_date ASC LIMIT 10) t),
    'visits_today_count', (SELECT count(*) FROM agent_visits v WHERE v.agent_id = v_user AND v.created_at >= date_trunc('day', now())),
    'unread_notifications_count', (SELECT count(*) FROM public.notifications n WHERE n.profile_id = v_user AND (n.read_at IS NULL))
  );

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.agent_dashboard_v1() TO authenticated;

-- logistics_dashboard_v1
CREATE OR REPLACE FUNCTION public.logistics_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_res jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_res := jsonb_build_object(
    'available_loads_count', (SELECT count(*) FROM transport_requests tr WHERE tr.status = 'requested'),
    'trips_top10', (SELECT jsonb_agg(row_to_json(t)) FROM (SELECT id, status, pickup_village, preferred_date, updated_at FROM trips ORDER BY updated_at DESC LIMIT 10) t),
    'trips_by_status', (SELECT jsonb_object_agg(status, cnt) FROM (SELECT status, count(*) AS cnt FROM trips GROUP BY status) x),
    'unread_notifications_count', (SELECT count(*) FROM public.notifications n WHERE n.profile_id = v_user AND (n.read_at IS NULL))
  );

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.logistics_dashboard_v1() TO authenticated;

-- buyer_dashboard_v1
CREATE OR REPLACE FUNCTION public.buyer_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_buyer_id uuid;
  v_res jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT id INTO v_buyer_id FROM public.buyers WHERE user_id = v_user LIMIT 1;
  IF v_buyer_id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_res := jsonb_build_object(
    'orders_by_status', (SELECT jsonb_object_agg(status, cnt) FROM (SELECT status, count(*) AS cnt FROM market_orders WHERE buyer_id = v_buyer_id GROUP BY status) t),
    'recent_orders_top10', (SELECT jsonb_agg(row_to_json(ro)) FROM (SELECT id, status, COALESCE(total_amount,0)::numeric(14,2) AS total_amount, updated_at FROM market_orders WHERE buyer_id = v_buyer_id ORDER BY updated_at DESC LIMIT 10) ro),
    'unread_notifications_count', (SELECT count(*) FROM public.notifications n WHERE n.profile_id = v_user AND (n.read_at IS NULL))
  );

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.buyer_dashboard_v1() TO authenticated;

-- admin_dashboard_v1
CREATE OR REPLACE FUNCTION public.admin_dashboard_v1(p_days int DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit, secure
AS $$
DECLARE
  v_days int := GREATEST(1, LEAST(p_days, 30));
  _start timestamptz := now() - (v_days || ' days')::interval;
  v_res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_res := jsonb_build_object(
    'new_signups', (SELECT count(*) FROM profiles p WHERE p.created_at >= _start),
    'active_users', (SELECT count(DISTINCT actor_user_id) FROM audit.workflow_events WHERE created_at >= _start),
    'support_tickets_open', (CASE WHEN to_regclass('public.support_tickets') IS NOT NULL THEN (SELECT count(*) FROM public.support_tickets WHERE status != 'closed') ELSE 0 END),
    'stuck_trips', (SELECT count(*) FROM trips t WHERE t.status = 'en_route' AND t.updated_at < now() - INTERVAL '24 hours'),
    'payment_failures', (SELECT count(*) FROM secure.payment_events pe WHERE pe.event_type ILIKE '%FAIL%' AND pe.created_at >= _start),
    'rate_limit_blocks', (SELECT count(*) FROM audit.security_events s WHERE s.event_type ILIKE '%THROTTLE%' AND s.created_at >= _start),
    'kyc_pending_payout_count', (SELECT count(*) FROM secure.order_financials of JOIN public.market_orders mo ON mo.id = of.order_id WHERE of.settlement_status = 'held_for_kyc' AND of.created_at >= _start)
  );

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dashboard_v1(int) TO authenticated;

-- list_market_products_compact_v1
CREATE OR REPLACE FUNCTION public.list_market_products_compact_v1(
  p_filter jsonb DEFAULT '{}'::jsonb,
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz := NULL;
  v_cursor_id uuid := NULL;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb := NULL;
  v_where text := '';
  v_sql text;
  v_count int := 0;
BEGIN
  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  IF p_filter ? 'status' THEN
    v_where := v_where || format(' AND c.status = %L', p_filter->>'status');
  END IF;
  IF p_filter ? 'crop_name' THEN
    v_where := v_where || format(' AND c.crop_name ILIKE %L', '%' || (p_filter->>'crop_name') || '%');
  END IF;

  v_sql := 'SELECT c.id, c.crop_name, c.variety, c.estimated_quantity, c.quantity_unit, c.status, c.farmer_id, row_to_json(fr) AS farmer, c.updated_at FROM crops c LEFT JOIN LATERAL (SELECT p.id, p.full_name, p.village, p.district FROM public.profiles p WHERE p.id = c.farmer_id) fr ON true WHERE 1=1 ' || v_where;
  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (c.updated_at, c.id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY c.updated_at DESC, c.id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE tmp_products ON COMMIT DROP AS %s', v_sql);
  SELECT COUNT(*) INTO v_count FROM tmp_products;
  SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (SELECT id, crop_name, variety, estimated_quantity, quantity_unit, status, farmer, updated_at FROM tmp_products ORDER BY updated_at DESC, id DESC LIMIT v_limit) t;
  IF v_count > v_limit THEN
    SELECT row_to_json(r) INTO v_next_cursor FROM (SELECT updated_at, id FROM tmp_products ORDER BY updated_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  ELSE
    v_next_cursor := NULL;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_market_products_compact_v1(jsonb,int,jsonb) TO authenticated;

-- list_orders_compact_v1 (buyer-scoped compact orders with nested farmer & crop)
CREATE OR REPLACE FUNCTION public.list_orders_compact_v1(
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz := NULL;
  v_cursor_id uuid := NULL;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb := NULL;
  v_sql text;
  v_buyer_id uuid;
  v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT id INTO v_buyer_id FROM public.buyers WHERE user_id = auth.uid() LIMIT 1;
  IF v_buyer_id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  v_sql := format($sql$
    SELECT mo.id, mo.status, COALESCE(mo.total_amount,0)::numeric(14,2) AS total_amount, mo.updated_at,
      row_to_json(far) AS farmer,
      row_to_json(cp) AS crop
    FROM public.market_orders mo
    LEFT JOIN LATERAL (SELECT p.id, p.full_name FROM public.profiles p WHERE p.id = mo.farmer_id) far ON true
    LEFT JOIN LATERAL (SELECT c.id, c.crop_name, c.variety FROM public.crops c WHERE c.id = mo.crop_id) cp ON true
    WHERE mo.buyer_id = %L
  $sql$, v_buyer_id::text);

  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (mo.updated_at, mo.id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY mo.updated_at DESC, mo.id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE tmp_orders ON COMMIT DROP AS %s', v_sql);
  SELECT COUNT(*) INTO v_count FROM tmp_orders;
  SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (SELECT id, status, total_amount, updated_at, farmer, crop FROM tmp_orders ORDER BY updated_at DESC, id DESC LIMIT v_limit) t;
  IF v_count > v_limit THEN
    SELECT row_to_json(r) INTO v_next_cursor FROM (SELECT updated_at, id FROM tmp_orders ORDER BY updated_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  ELSE
    v_next_cursor := NULL;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_orders_compact_v1(int,jsonb) TO authenticated;

-- list_transport_requests_compact_v1
CREATE OR REPLACE FUNCTION public.list_transport_requests_compact_v1(
  p_filter jsonb DEFAULT '{}'::jsonb,
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz := NULL;
  v_cursor_id uuid := NULL;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb := NULL;
  v_sql text;
  v_count int := 0;
  v_where text := '';
BEGIN
  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  IF p_filter ? 'status' THEN
    v_where := v_where || format(' AND tr.status = %L', p_filter->>'status');
  END IF;

  v_sql := 'SELECT tr.id, tr.farmer_id, tr.crop_id, tr.quantity, tr.quantity_unit, tr.pickup_location, tr.pickup_village, tr.preferred_date, tr.preferred_time, tr.status, tr.updated_at, row_to_json(pf) AS farmer, row_to_json(cp) AS crop FROM transport_requests tr LEFT JOIN LATERAL (SELECT p.id, p.full_name, p.village FROM public.profiles p WHERE p.id = tr.farmer_id) pf ON true LEFT JOIN LATERAL (SELECT c.id, c.crop_name FROM public.crops c WHERE c.id = tr.crop_id) cp ON true WHERE 1=1 ' || v_where;
  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (tr.updated_at, tr.id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY tr.updated_at DESC, tr.id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE tmp_tr ON COMMIT DROP AS %s', v_sql);
  SELECT COUNT(*) INTO v_count FROM tmp_tr;
  SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (SELECT id, farmer, crop, quantity, quantity_unit, pickup_location, pickup_village, preferred_date, preferred_time, status, updated_at FROM tmp_tr ORDER BY updated_at DESC, id DESC LIMIT v_limit) t;
  IF v_count > v_limit THEN
    SELECT row_to_json(r) INTO v_next_cursor FROM (SELECT updated_at, id FROM tmp_tr ORDER BY updated_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_transport_requests_compact_v1(jsonb,int,jsonb) TO authenticated;

-- list_agent_tasks_compact_v1
CREATE OR REPLACE FUNCTION public.list_agent_tasks_compact_v1(
  p_agent_id uuid,
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz := NULL;
  v_cursor_id uuid := NULL;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb := NULL;
  v_sql text;
  v_count int := 0;
BEGIN
  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  v_sql := format('SELECT at.id, at.task_type, at.task_status, at.due_date, at.priority, at.payload, at.updated_at, row_to_json(pf) AS farmer, row_to_json(cp) AS crop FROM agent_tasks at LEFT JOIN LATERAL (SELECT p.id, p.full_name FROM public.profiles p WHERE p.id = at.farmer_id) pf ON true LEFT JOIN LATERAL (SELECT c.id, c.crop_name FROM public.crops c WHERE c.id = at.crop_id) cp ON true WHERE at.agent_id = %L', p_agent_id::text);
  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (at.updated_at, at.id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY at.updated_at DESC, at.id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE tmp_tasks ON COMMIT DROP AS %s', v_sql);
  SELECT COUNT(*) INTO v_count FROM tmp_tasks;
  SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (SELECT id, task_type, task_status, due_date, priority, payload, farmer, crop, updated_at FROM tmp_tasks ORDER BY updated_at DESC, id DESC LIMIT v_limit) t;
  IF v_count > v_limit THEN
    SELECT row_to_json(r) INTO v_next_cursor FROM (SELECT updated_at, id FROM tmp_tasks ORDER BY updated_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_agent_tasks_compact_v1(uuid,int,jsonb) TO authenticated;

-- 3) list_orders_v1 (cursor pagination)
CREATE OR REPLACE FUNCTION public.list_orders_v1(
  p_filter jsonb DEFAULT '{}'::jsonb,
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz := NULL;
  v_cursor_id uuid := NULL;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb := NULL;
  v_where text := '';
  v_sql text;
  v_count int := 0;
BEGIN
  -- extract cursor
  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  -- basic filter: status
  IF p_filter ? 'status' THEN
    v_where := v_where || format(' AND status = %L', p_filter->>'status');
  END IF;

  -- role-based scoping: if caller is buyer return only their orders; if farmer restrict to farmer
  IF NOT public.is_admin() THEN
    IF EXISTS (SELECT 1 FROM public.buyers b WHERE b.user_id = auth.uid()) THEN
      v_where := v_where || format(' AND buyer_id = %L', auth.uid()::text);
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'farmer') THEN
      v_where := v_where || format(' AND farmer_id = %L', auth.uid()::text);
    END IF;
  END IF;

  -- Build SQL with cursor (updated_at desc, id desc) and limit v_limit+1 to detect next page
  v_sql := 'SELECT id, status, COALESCE(total_amount,0)::numeric(14,2) AS total_amount, updated_at, buyer_id, farmer_id, payment_status FROM public.market_orders WHERE 1=1 ' || v_where;
  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (updated_at, id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY updated_at DESC, id DESC LIMIT %s', v_limit + 1);

  -- execute into temp table
  EXECUTE format('CREATE TEMP TABLE tmp_list_orders ON COMMIT DROP AS %s', v_sql);

  SELECT COUNT(*) INTO v_count FROM tmp_list_orders;

  -- collect items (up to v_limit)
  SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (SELECT id, status, total_amount, updated_at, buyer_id, farmer_id, payment_status FROM tmp_list_orders ORDER BY updated_at DESC, id DESC LIMIT v_limit) t;
  IF v_items IS NULL THEN v_items := '[]'::jsonb; END IF;

  IF v_count > v_limit THEN
    -- compute next cursor from the (v_limit+1)-th row
    SELECT row_to_json(r) INTO v_next_cursor FROM (SELECT updated_at, id FROM tmp_list_orders ORDER BY updated_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  ELSE
    v_next_cursor := NULL;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_orders_v1(jsonb,int,jsonb) TO authenticated;

-- 4) admin.get_pending_updates_v1 (admin-only aggregated pending tasks)
CREATE OR REPLACE FUNCTION public.get_pending_updates_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT jsonb_build_object(
    'tasks', COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  ) INTO v_res
  FROM (
    SELECT at.id, at.farmer_id, at.agent_id, at.payload, at.created_at,
      (SELECT full_name FROM public.profiles p WHERE p.id = at.farmer_id) AS farmer_name,
      (SELECT full_name FROM public.profiles p WHERE p.id = at.agent_id) AS agent_name
    FROM public.agent_tasks at
    WHERE at.task_status = 'pending' AND at.payload IS NOT NULL
    ORDER BY at.created_at DESC
    LIMIT 200
  ) t;

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_updates_v1() TO authenticated;

