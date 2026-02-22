-- Dashboard RPC compatibility hardening.
-- Replaces brittle references (total_amount, read_at, pickup_village, secure.payment_events.event_type)
-- with schema-aware implementations.

CREATE OR REPLACE FUNCTION public._column_exists(
  p_schema text,
  p_table text,
  p_column text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = p_schema
      AND table_name = p_table
      AND column_name = p_column
  );
$$;

CREATE OR REPLACE FUNCTION public._dashboard_unread_notifications_count(p_user uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_sql text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF auth.uid() <> p_user AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_user IS NULL OR to_regclass('public.notifications') IS NULL THEN
    RETURN 0;
  END IF;

  IF public._column_exists('public', 'notifications', 'user_id')
     AND public._column_exists('public', 'notifications', 'is_read') THEN
    v_sql := 'SELECT COUNT(*) FROM public.notifications WHERE user_id = $1 AND COALESCE(is_read, false) = false';
  ELSIF public._column_exists('public', 'notifications', 'profile_id')
     AND public._column_exists('public', 'notifications', 'read_at') THEN
    v_sql := 'SELECT COUNT(*) FROM public.notifications WHERE profile_id = $1 AND read_at IS NULL';
  ELSIF public._column_exists('public', 'notifications', 'user_id')
     AND public._column_exists('public', 'notifications', 'read_at') THEN
    v_sql := 'SELECT COUNT(*) FROM public.notifications WHERE user_id = $1 AND read_at IS NULL';
  ELSIF public._column_exists('public', 'notifications', 'profile_id')
     AND public._column_exists('public', 'notifications', 'is_read') THEN
    v_sql := 'SELECT COUNT(*) FROM public.notifications WHERE profile_id = $1 AND COALESCE(is_read, false) = false';
  ELSE
    RETURN 0;
  END IF;

  EXECUTE v_sql USING p_user INTO v_count;
  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.farmer_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_crops_by_status jsonb := '{}'::jsonb;
  v_listings_by_status jsonb := '{}'::jsonb;
  v_open_transport_requests_count integer := 0;
  v_active_orders_count integer := 0;
  v_recent_orders jsonb := '[]'::jsonb;
  v_unread_notifications_count integer := 0;
  v_total_expr text := '0::numeric(14,2)';
  v_owner_count_sql text;
  v_owner_recent_sql text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF to_regclass('public.crops') IS NOT NULL
     AND public._column_exists('public', 'crops', 'farmer_id')
     AND public._column_exists('public', 'crops', 'status') THEN
    SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
    INTO v_crops_by_status
    FROM (
      SELECT status::text AS status, COUNT(*) AS cnt
      FROM public.crops
      WHERE farmer_id = v_user
      GROUP BY status
    ) t;
  END IF;

  IF to_regclass('public.listings') IS NOT NULL
     AND public._column_exists('public', 'listings', 'status') THEN
    IF public._column_exists('public', 'listings', 'seller_id') THEN
      SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
      INTO v_listings_by_status
      FROM (
        SELECT status::text AS status, COUNT(*) AS cnt
        FROM public.listings
        WHERE seller_id = v_user
        GROUP BY status
      ) t;
    ELSIF public._column_exists('public', 'listings', 'farmer_id') THEN
      SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
      INTO v_listings_by_status
      FROM (
        SELECT status::text AS status, COUNT(*) AS cnt
        FROM public.listings
        WHERE farmer_id = v_user
        GROUP BY status
      ) t;
    END IF;
  END IF;

  IF to_regclass('public.transport_requests') IS NOT NULL
     AND public._column_exists('public', 'transport_requests', 'farmer_id')
     AND public._column_exists('public', 'transport_requests', 'status') THEN
    SELECT COUNT(*)
    INTO v_open_transport_requests_count
    FROM public.transport_requests
    WHERE farmer_id = v_user
      AND status IN ('requested', 'assigned');
  END IF;

  IF to_regclass('public.market_orders') IS NOT NULL THEN
    IF public._column_exists('public', 'market_orders', 'total_amount') THEN
      v_total_expr := 'COALESCE(total_amount, 0)::numeric(14,2)';
    ELSIF public._column_exists('public', 'market_orders', 'qty')
       AND public._column_exists('public', 'market_orders', 'unit_price') THEN
      v_total_expr := '(COALESCE(qty, 0) * COALESCE(unit_price, 0))::numeric(14,2)';
    ELSIF public._column_exists('public', 'market_orders', 'quantity')
       AND public._column_exists('public', 'market_orders', 'price_agreed') THEN
      v_total_expr := '(COALESCE(quantity, 0) * COALESCE(price_agreed, 0))::numeric(14,2)';
    ELSIF public._column_exists('public', 'market_orders', 'quantity') THEN
      v_total_expr := 'COALESCE(quantity, 0)::numeric(14,2)';
    END IF;

    IF public._column_exists('public', 'market_orders', 'farmer_id') THEN
      v_owner_count_sql :=
        'SELECT COUNT(*) FROM public.market_orders WHERE farmer_id = $1 AND status NOT IN (''delivered'',''cancelled'',''rejected'')';
      v_owner_recent_sql := format(
        'SELECT COALESCE(jsonb_agg(row_to_json(ro)), ''[]''::jsonb) FROM (
           SELECT id, status, %s AS total_amount, updated_at
           FROM public.market_orders
           WHERE farmer_id = $1
           ORDER BY updated_at DESC NULLS LAST
           LIMIT 10
         ) ro',
        v_total_expr
      );
    ELSIF public._column_exists('public', 'market_orders', 'listing_id')
       AND to_regclass('public.listings') IS NOT NULL
       AND public._column_exists('public', 'listings', 'farmer_id') THEN
      v_owner_count_sql :=
        'SELECT COUNT(*)
         FROM public.market_orders mo
         JOIN public.listings l ON l.id = mo.listing_id
         WHERE l.farmer_id = $1 AND mo.status NOT IN (''delivered'',''cancelled'',''rejected'')';
      v_owner_recent_sql := format(
        'SELECT COALESCE(jsonb_agg(row_to_json(ro)), ''[]''::jsonb) FROM (
           SELECT mo.id, mo.status, %s AS total_amount, mo.updated_at
           FROM public.market_orders mo
           JOIN public.listings l ON l.id = mo.listing_id
           WHERE l.farmer_id = $1
           ORDER BY mo.updated_at DESC NULLS LAST
           LIMIT 10
         ) ro',
        replace(v_total_expr, 'updated_at', 'mo.updated_at')
      );
    END IF;

    IF v_owner_count_sql IS NOT NULL THEN
      EXECUTE v_owner_count_sql USING v_user INTO v_active_orders_count;
      EXECUTE v_owner_recent_sql USING v_user INTO v_recent_orders;
    END IF;
  END IF;

  v_unread_notifications_count := public._dashboard_unread_notifications_count(v_user);

  RETURN jsonb_build_object(
    'crops_by_status', COALESCE(v_crops_by_status, '{}'::jsonb),
    'listings_by_status', COALESCE(v_listings_by_status, '{}'::jsonb),
    'open_transport_requests_count', COALESCE(v_open_transport_requests_count, 0),
    'active_orders_count', COALESCE(v_active_orders_count, 0),
    'recent_orders', COALESCE(v_recent_orders, '[]'::jsonb),
    'unread_notifications_count', COALESCE(v_unread_notifications_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.agent_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_assigned_farmers_count integer := 0;
  v_pending_tasks_count integer := 0;
  v_tasks_top10 jsonb := '[]'::jsonb;
  v_visits_today_count integer := 0;
  v_unread_notifications_count integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF to_regclass('public.agent_farmer_assignments') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_assigned_farmers_count
    FROM public.agent_farmer_assignments
    WHERE agent_id = v_user
      AND COALESCE(active, true) = true;
  END IF;

  IF to_regclass('public.agent_tasks') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_pending_tasks_count
    FROM public.agent_tasks
    WHERE agent_id = v_user
      AND task_status = 'pending';

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_tasks_top10
    FROM (
      SELECT id, task_type, task_status, due_date
      FROM public.agent_tasks
      WHERE agent_id = v_user
      ORDER BY due_date ASC NULLS LAST
      LIMIT 10
    ) t;
  END IF;

  IF to_regclass('public.agent_visits') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_visits_today_count
    FROM public.agent_visits
    WHERE agent_id = v_user
      AND created_at >= date_trunc('day', now());
  END IF;

  v_unread_notifications_count := public._dashboard_unread_notifications_count(v_user);

  RETURN jsonb_build_object(
    'assigned_farmers_count', COALESCE(v_assigned_farmers_count, 0),
    'pending_tasks_count', COALESCE(v_pending_tasks_count, 0),
    'tasks_top10', COALESCE(v_tasks_top10, '[]'::jsonb),
    'visits_today_count', COALESCE(v_visits_today_count, 0),
    'unread_notifications_count', COALESCE(v_unread_notifications_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.logistics_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_available_loads_count integer := 0;
  v_trips_top10 jsonb := '[]'::jsonb;
  v_trips_by_status jsonb := '{}'::jsonb;
  v_unread_notifications_count integer := 0;
  v_pickup_expr text := 'NULL::text';
  v_pref_expr text := 'NULL::date';
  v_trip_sql text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF to_regclass('public.transport_requests') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_available_loads_count
    FROM public.transport_requests tr
    WHERE tr.status = 'requested';
  END IF;

  IF to_regclass('public.trips') IS NOT NULL THEN
    IF public._column_exists('public', 'trips', 'pickup_village') THEN
      v_pickup_expr := 't.pickup_village';
    ELSIF to_regclass('public.transport_requests') IS NOT NULL
       AND public._column_exists('public', 'trips', 'transport_request_id')
       AND public._column_exists('public', 'transport_requests', 'pickup_village') THEN
      v_pickup_expr := 'tr.pickup_village';
    END IF;

    IF public._column_exists('public', 'trips', 'preferred_date') THEN
      v_pref_expr := 't.preferred_date';
    ELSIF to_regclass('public.transport_requests') IS NOT NULL
       AND public._column_exists('public', 'trips', 'transport_request_id')
       AND public._column_exists('public', 'transport_requests', 'preferred_date') THEN
      v_pref_expr := 'tr.preferred_date';
    END IF;

    v_trip_sql := format(
      'SELECT COALESCE(jsonb_agg(row_to_json(t0)), ''[]''::jsonb)
       FROM (
         SELECT
           t.id,
           t.status,
           %s AS pickup_village,
           %s AS preferred_date,
           t.updated_at
         FROM public.trips t
         LEFT JOIN public.transport_requests tr
           ON tr.id = t.transport_request_id
         WHERE t.transporter_id = $1
         ORDER BY t.updated_at DESC NULLS LAST
         LIMIT 10
       ) t0',
      v_pickup_expr,
      v_pref_expr
    );
    EXECUTE v_trip_sql USING v_user INTO v_trips_top10;

    SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
    INTO v_trips_by_status
    FROM (
      SELECT status::text AS status, COUNT(*) AS cnt
      FROM public.trips
      WHERE transporter_id = v_user
      GROUP BY status
    ) x;
  END IF;

  v_unread_notifications_count := public._dashboard_unread_notifications_count(v_user);

  RETURN jsonb_build_object(
    'available_loads_count', COALESCE(v_available_loads_count, 0),
    'trips_top10', COALESCE(v_trips_top10, '[]'::jsonb),
    'trips_by_status', COALESCE(v_trips_by_status, '{}'::jsonb),
    'unread_notifications_count', COALESCE(v_unread_notifications_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.buyer_dashboard_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_buyer_id uuid := NULL;
  v_orders_by_status jsonb := '{}'::jsonb;
  v_recent_orders_top10 jsonb := '[]'::jsonb;
  v_unread_notifications_count integer := 0;
  v_total_expr text := '0::numeric(14,2)';
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF to_regclass('public.buyers') IS NOT NULL THEN
    SELECT id INTO v_buyer_id FROM public.buyers WHERE user_id = v_user LIMIT 1;
  END IF;

  IF to_regclass('public.market_orders') IS NOT NULL
     AND public._column_exists('public', 'market_orders', 'buyer_id') THEN
    IF public._column_exists('public', 'market_orders', 'total_amount') THEN
      v_total_expr := 'COALESCE(total_amount, 0)::numeric(14,2)';
    ELSIF public._column_exists('public', 'market_orders', 'qty')
       AND public._column_exists('public', 'market_orders', 'unit_price') THEN
      v_total_expr := '(COALESCE(qty, 0) * COALESCE(unit_price, 0))::numeric(14,2)';
    ELSIF public._column_exists('public', 'market_orders', 'quantity')
       AND public._column_exists('public', 'market_orders', 'price_agreed') THEN
      v_total_expr := '(COALESCE(quantity, 0) * COALESCE(price_agreed, 0))::numeric(14,2)';
    ELSIF public._column_exists('public', 'market_orders', 'quantity') THEN
      v_total_expr := 'COALESCE(quantity, 0)::numeric(14,2)';
    END IF;

    SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
    INTO v_orders_by_status
    FROM (
      SELECT status::text AS status, COUNT(*) AS cnt
      FROM public.market_orders
      WHERE buyer_id IN (v_user, COALESCE(v_buyer_id, v_user))
      GROUP BY status
    ) t;

    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(row_to_json(ro)), ''[]''::jsonb)
       FROM (
         SELECT id, status, %s AS total_amount, updated_at
         FROM public.market_orders
         WHERE buyer_id IN ($1, $2)
         ORDER BY updated_at DESC NULLS LAST
         LIMIT 10
       ) ro',
      v_total_expr
    )
    USING v_user, COALESCE(v_buyer_id, v_user)
    INTO v_recent_orders_top10;
  END IF;

  v_unread_notifications_count := public._dashboard_unread_notifications_count(v_user);

  RETURN jsonb_build_object(
    'orders_by_status', COALESCE(v_orders_by_status, '{}'::jsonb),
    'recent_orders_top10', COALESCE(v_recent_orders_top10, '[]'::jsonb),
    'unread_notifications_count', COALESCE(v_unread_notifications_count, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_v1(p_days integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit, secure
AS $$
DECLARE
  v_days integer := GREATEST(1, LEAST(COALESCE(p_days, 1), 30));
  v_start timestamptz := now() - (v_days || ' days')::interval;
  v_new_signups integer := 0;
  v_active_users integer := 0;
  v_support_tickets_open integer := 0;
  v_stuck_trips integer := 0;
  v_payment_failures integer := 0;
  v_rate_limit_blocks integer := 0;
  v_kyc_pending_payout_count integer := 0;
  v_sql text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_new_signups FROM public.profiles WHERE created_at >= v_start;
  END IF;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    SELECT COUNT(DISTINCT actor_user_id)
    INTO v_active_users
    FROM audit.workflow_events
    WHERE created_at >= v_start
      AND actor_user_id IS NOT NULL;
  END IF;

  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_support_tickets_open
    FROM public.support_tickets
    WHERE status <> 'closed';
  END IF;

  IF to_regclass('public.trips') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_stuck_trips
    FROM public.trips
    WHERE status = 'en_route'
      AND updated_at < now() - interval '24 hours';
  END IF;

  IF to_regclass('secure.payment_events') IS NOT NULL THEN
    IF public._column_exists('secure', 'payment_events', 'event_type') THEN
      v_sql := 'SELECT COUNT(*) FROM secure.payment_events WHERE event_type ILIKE ''%FAIL%'' AND created_at >= $1';
    ELSIF public._column_exists('secure', 'payment_events', 'status') THEN
      v_sql := 'SELECT COUNT(*) FROM secure.payment_events WHERE status ILIKE ''%fail%'' AND created_at >= $1';
    END IF;
    IF v_sql IS NOT NULL THEN
      EXECUTE v_sql USING v_start INTO v_payment_failures;
    END IF;
  END IF;

  IF to_regclass('audit.security_events') IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_rate_limit_blocks
    FROM audit.security_events
    WHERE created_at >= v_start
      AND (
        event_type ILIKE '%THROTTLE%'
        OR event_type ILIKE '%RATE_LIMIT%'
      );
  END IF;

  IF to_regclass('secure.order_financials') IS NOT NULL
     AND public._column_exists('secure', 'order_financials', 'settlement_status')
     AND public._column_exists('secure', 'order_financials', 'created_at') THEN
    SELECT COUNT(*)
    INTO v_kyc_pending_payout_count
    FROM secure.order_financials offn
    WHERE offn.settlement_status = 'held_for_kyc'
      AND offn.created_at >= v_start;
  END IF;

  RETURN jsonb_build_object(
    'new_signups', COALESCE(v_new_signups, 0),
    'active_users', COALESCE(v_active_users, 0),
    'support_tickets_open', COALESCE(v_support_tickets_open, 0),
    'stuck_trips', COALESCE(v_stuck_trips, 0),
    'payment_failures', COALESCE(v_payment_failures, 0),
    'rate_limit_blocks', COALESCE(v_rate_limit_blocks, 0),
    'kyc_pending_payout_count', COALESCE(v_kyc_pending_payout_count, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public._column_exists(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._dashboard_unread_notifications_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.farmer_dashboard_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_dashboard_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.logistics_dashboard_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_dashboard_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_v1(integer) TO authenticated;
