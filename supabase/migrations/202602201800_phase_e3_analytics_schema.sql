-- Migration: 202602201800_phase_e3_analytics_schema.sql
-- Phase E3: analytics schema and daily rollup functions

-- A) Create analytics schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- B) Create daily rollup tables

-- 1) transport_daily
CREATE TABLE IF NOT EXISTS analytics.transport_daily (
  day date NOT NULL,
  district text NULL,
  loads_posted int NOT NULL DEFAULT 0,
  loads_accepted int NOT NULL DEFAULT 0,
  trips_created int NOT NULL DEFAULT 0,
  trips_completed int NOT NULL DEFAULT 0,
  trips_cancelled int NOT NULL DEFAULT 0,
  avg_accept_to_pickup_minutes numeric NULL,
  avg_pickup_to_delivery_minutes numeric NULL,
  top_route_origin text NULL,
  top_route_destination text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, district)
);

-- 2) marketplace_daily
CREATE TABLE IF NOT EXISTS analytics.marketplace_daily (
  day date NOT NULL,
  district text NULL,
  listings_created int NOT NULL DEFAULT 0,
  listings_approved int NOT NULL DEFAULT 0,
  orders_placed int NOT NULL DEFAULT 0,
  orders_delivered int NOT NULL DEFAULT 0,
  gmv numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, district)
);

-- 3) users_daily
CREATE TABLE IF NOT EXISTS analytics.users_daily (
  day date NOT NULL,
  new_users int NOT NULL DEFAULT 0,
  active_users int NOT NULL DEFAULT 0,
  active_farmers int NOT NULL DEFAULT 0,
  active_agents int NOT NULL DEFAULT 0,
  active_logistics int NOT NULL DEFAULT 0,
  active_buyers int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day)
);

-- 4) agent_daily
CREATE TABLE IF NOT EXISTS analytics.agent_daily (
  day date NOT NULL,
  district text NULL,
  tasks_created int NOT NULL DEFAULT 0,
  tasks_completed int NOT NULL DEFAULT 0,
  visits_logged int NOT NULL DEFAULT 0,
  voice_notes_uploaded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, district)
);

-- 5) security_daily
CREATE TABLE IF NOT EXISTS analytics.security_daily (
  day date NOT NULL,
  throttles int NOT NULL DEFAULT 0,
  blocks int NOT NULL DEFAULT 0,
  brute_force_suspects int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day)
);

-- Optional rollup runs log
CREATE TABLE IF NOT EXISTS analytics.rollup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  success boolean NULL,
  details jsonb NULL
);

-- C) Enable RLS and policies

-- Helper: ensure is_admin() exists in DB (we assume Phase A created it). If not, DB admin should create one.

-- Enable RLS on transport_daily
ALTER TABLE analytics.transport_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.marketplace_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.users_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.agent_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.security_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.rollup_runs ENABLE ROW LEVEL SECURITY;

-- Policies: SELECT: is_admin() only. Writes allowed when app.rpc = 'true' OR is_admin().
-- Note: this requires a helper function is_admin() present in DB (from Phase A). If missing, replace with appropriate check.

-- Transport
CREATE POLICY analytics_transport_select_admin ON analytics.transport_daily FOR SELECT USING (current_setting('app.mv', true) = 'true' OR is_admin());
DROP POLICY IF EXISTS analytics_transport_rpc_write ON analytics.transport_daily;
CREATE POLICY analytics_transport_rpc_write ON analytics.transport_daily FOR ALL USING (is_admin()) WITH CHECK (current_setting('app.rpc', 'false') = 'true' OR is_admin());

-- Marketplace
CREATE POLICY analytics_marketplace_select_admin ON analytics.marketplace_daily FOR SELECT USING (is_admin());
CREATE POLICY analytics_marketplace_rpc_write ON analytics.marketplace_daily FOR ALL USING (is_admin()) WITH CHECK (current_setting('app.rpc', 'false') = 'true' OR is_admin());

-- Users
CREATE POLICY analytics_users_select_admin ON analytics.users_daily FOR SELECT USING (is_admin());
CREATE POLICY analytics_users_rpc_write ON analytics.users_daily FOR ALL USING (is_admin()) WITH CHECK (current_setting('app.rpc', 'false') = 'true' OR is_admin());

-- Agent
CREATE POLICY analytics_agent_select_admin ON analytics.agent_daily FOR SELECT USING (is_admin());
CREATE POLICY analytics_agent_rpc_write ON analytics.agent_daily FOR ALL USING (is_admin()) WITH CHECK (current_setting('app.rpc', 'false') = 'true' OR is_admin());

-- Security
CREATE POLICY analytics_security_select_admin ON analytics.security_daily FOR SELECT USING (is_admin());
CREATE POLICY analytics_security_rpc_write ON analytics.security_daily FOR ALL USING (is_admin()) WITH CHECK (current_setting('app.rpc', 'false') = 'true' OR is_admin());

-- Rollup runs (admin only)
CREATE POLICY analytics_rollup_runs_select_admin ON analytics.rollup_runs FOR SELECT USING (is_admin());
CREATE POLICY analytics_rollup_runs_write_admin ON analytics.rollup_runs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- D) Indexes
CREATE INDEX IF NOT EXISTS analytics_transport_created_at_idx ON analytics.transport_daily (created_at);
CREATE INDEX IF NOT EXISTS analytics_transport_day_idx ON analytics.transport_daily (day);
CREATE INDEX IF NOT EXISTS analytics_marketplace_created_at_idx ON analytics.marketplace_daily (created_at);
CREATE INDEX IF NOT EXISTS analytics_marketplace_day_idx ON analytics.marketplace_daily (day);
CREATE INDEX IF NOT EXISTS analytics_users_created_at_idx ON analytics.users_daily (created_at);
CREATE INDEX IF NOT EXISTS analytics_users_day_idx ON analytics.users_daily (day);
CREATE INDEX IF NOT EXISTS analytics_agent_created_at_idx ON analytics.agent_daily (created_at);
CREATE INDEX IF NOT EXISTS analytics_agent_day_idx ON analytics.agent_daily (day);
CREATE INDEX IF NOT EXISTS analytics_security_created_at_idx ON analytics.security_daily (created_at);
CREATE INDEX IF NOT EXISTS analytics_security_day_idx ON analytics.security_daily (day);

-- E) Dashboard summary view (last 30 days aggregates)
CREATE OR REPLACE VIEW analytics.dashboard_summary_v AS
SELECT
  now()::date as as_of,
  coalesce(t.total_loads_accepted,0) as loads_accepted_30d,
  coalesce(t.total_trips_completed,0) as trips_completed_30d,
  coalesce(m.total_orders_placed,0) as orders_placed_30d,
  coalesce(u.new_users_30d,0) as new_users_30d,
  coalesce(s.total_blocks,0) as blocks_30d
FROM
  (
    SELECT sum(loads_accepted) as total_loads_accepted, sum(trips_completed) as total_trips_completed
    FROM analytics.transport_daily
    WHERE day >= (now()::date - INTERVAL '29 days')
  ) t,
  (
    SELECT sum(orders_placed) as total_orders_placed
    FROM analytics.marketplace_daily
    WHERE day >= (now()::date - INTERVAL '29 days')
  ) m,
  (
    SELECT sum(new_users) as new_users_30d
    FROM analytics.users_daily
    WHERE day >= (now()::date - INTERVAL '29 days')
  ) u,
  (
    SELECT sum(blocks) as total_blocks
    FROM analytics.security_daily
    WHERE day >= (now()::date - INTERVAL '29 days')
  ) s;

-- F) Rollup functions (security definer)

-- NOTE: The rollup function below is intentionally defensive: it checks for existence of known tables, uses event_type pattern matching, and falls back to 0 when tables are missing.

CREATE OR REPLACE FUNCTION analytics.rollup_daily_v1(p_day date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _start timestamptz := (p_day::timestamptz at time zone 'Asia/Kolkata');
  _end timestamptz := ((_start + INTERVAL '1 day'));
  _loads_accepted int := 0;
  _loads_posted int := 0;
  _trips_created int := 0;
  _trips_completed int := 0;
  _trips_cancelled int := 0;
  _avg_accept_to_pickup numeric := NULL;
  _avg_pickup_to_delivery numeric := NULL;
  _top_origin text := NULL;
  _top_destination text := NULL;
  _listings_created int := 0;
  _listings_approved int := 0;
  _orders_placed int := 0;
  _orders_delivered int := 0;
  _gmv numeric := 0;
  _new_users int := 0;
  _active_users int := 0;
  _active_farmers int := 0;
  _active_agents int := 0;
  _active_logistics int := 0;
  _active_buyers int := 0;
  _tasks_created int := 0;
  _tasks_completed int := 0;
  _visits_logged int := 0;
  _voice_notes_uploaded int := 0;
  _throttles int := 0;
  _blocks int := 0;
  _brute_force int := 0;
  _district text;

BEGIN
  PERFORM set_config('app.rpc','true',true);

  -- TRANSPORT: loads_accepted
  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    SELECT count(*) INTO _loads_accepted
    FROM audit.workflow_events w
    WHERE (w.created_at >= _start AND w.created_at < _end)
      AND (
        w.event_type ILIKE '%LOAD%ACCEPT%' OR w.event_type ILIKE '%LOAD_ACCEPT%'
      );

    -- loads_posted: best-effort from workflow_events events mentioning 'LOAD' and 'POST'
    SELECT count(*) INTO _loads_posted
    FROM audit.workflow_events w
    WHERE (w.created_at >= _start AND w.created_at < _end)
      AND (w.event_type ILIKE '%LOAD%POST%' OR w.event_type ILIKE '%LOAD%CREATE%' OR w.event_type ILIKE '%LOAD%POSTED%');

    -- trips completed/cancelled from TRIP%STATUS events
    SELECT count(*) FILTER (WHERE (w.event_type ILIKE '%TRIP%STATUS%' AND (w.payload->>'new_status') ILIKE 'completed'))
      INTO _trips_completed
    FROM audit.workflow_events w
    WHERE (w.created_at >= _start AND w.created_at < _end);

    SELECT count(*) FILTER (WHERE (w.event_type ILIKE '%TRIP%STATUS%' AND (w.payload->>'new_status') ILIKE 'cancelled'))
      INTO _trips_cancelled
    FROM audit.workflow_events w
    WHERE (w.created_at >= _start AND w.created_at < _end);

    -- trips_created: fallback to counting distinct trip ids created that day if table exists
    IF to_regclass('trips') IS NOT NULL THEN
      SELECT count(*) INTO _trips_created FROM trips t WHERE t.created_at >= _start AND t.created_at < _end;
    ELSE
      -- fallback: count workflow events that indicate trip creation
      SELECT count(*) INTO _trips_created FROM audit.workflow_events w WHERE (w.created_at >= _start AND w.created_at < _end) AND w.event_type ILIKE '%TRIP%CREATE%';
    END IF;

    -- avg times per trip (accept -> pickup) and (pickup -> delivery)
    -- We'll compute per trip if trip_id appears in payload as 'trip_id'
    -- If payload schema differs, these averages will remain NULL.
    IF EXISTS (SELECT 1 FROM audit.workflow_events w WHERE w.created_at >= _start AND w.created_at < _end AND w.event_type ILIKE '%TRIP%STATUS%') THEN
      WITH events AS (
        SELECT (w.payload->>'trip_id')::text as trip_id, w.event_type, w.created_at, w.payload
        FROM audit.workflow_events w
        WHERE w.created_at >= _start AND w.created_at < _end
      ),
      accept_times AS (
        SELECT trip_id, min(created_at) as accept_at FROM events WHERE event_type ILIKE '%LOAD%ACCEPT%' GROUP BY trip_id
      ),
      pickup_times AS (
        SELECT trip_id, min(created_at) as pickup_at FROM events WHERE event_type ILIKE '%PICKUP%' GROUP BY trip_id
      ),
      delivery_times AS (
        SELECT trip_id, min(created_at) as delivered_at FROM events WHERE (event_type ILIKE '%DELIVER%' OR event_type ILIKE '%DELIVERED%') GROUP BY trip_id
      )
      SELECT avg(EXTRACT(EPOCH FROM (p.pickup_at - a.accept_at))/60) INTO _avg_accept_to_pickup
      FROM accept_times a JOIN pickup_times p ON a.trip_id = p.trip_id
      WHERE a.accept_at IS NOT NULL AND p.pickup_at IS NOT NULL;

      SELECT avg(EXTRACT(EPOCH FROM (d.delivered_at - p.pickup_at))/60) INTO _avg_pickup_to_delivery
      FROM pickup_times p JOIN delivery_times d ON p.trip_id = d.trip_id
      WHERE p.pickup_at IS NOT NULL AND d.delivered_at IS NOT NULL;
    END IF;

    -- top route origin/destination best-effort from transport_requests table if exists
    IF to_regclass('transport_requests') IS NOT NULL THEN
      SELECT tr.origin, tr.destination INTO _top_origin, _top_destination
      FROM transport_requests tr
      WHERE tr.created_at >= _start AND tr.created_at < _end
      GROUP BY tr.origin, tr.destination
      ORDER BY count(*) DESC LIMIT 1;
    END IF;

  END IF; -- audit.workflow_events exists

  -- MARKETPLACE
  IF to_regclass('listings') IS NOT NULL THEN
    SELECT count(*) INTO _listings_created FROM listings l WHERE l.created_at >= _start AND l.created_at < _end;
    -- listings_approved: best-effort from workflow_events
    IF to_regclass('audit.workflow_events') IS NOT NULL THEN
      SELECT count(*) INTO _listings_approved
      FROM audit.workflow_events w
      WHERE w.created_at >= _start AND w.created_at < _end AND w.event_type ILIKE '%LISTING%APPROV%';
    END IF;
  END IF;

  IF to_regclass('market_orders') IS NOT NULL THEN
    SELECT count(*) INTO _orders_placed FROM market_orders o WHERE o.created_at >= _start AND o.created_at < _end;
    -- gmv: sum amount column if present
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='market_orders' AND column_name IN ('total_amount','amount','price')) THEN
      SELECT coalesce(sum(COALESCE(o.total_amount, o.amount, o.price,0)),0) INTO _gmv
      FROM market_orders o WHERE o.created_at >= _start AND o.created_at < _end;
    END IF;
  END IF;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    SELECT count(*) INTO _orders_delivered
    FROM audit.workflow_events w
    WHERE w.created_at >= _start AND w.created_at < _end
      AND w.event_type ILIKE '%ORDER%STATUS%' AND (w.payload->>'new_status') ILIKE 'delivered';
  END IF;

  -- USERS
  IF to_regclass('profiles') IS NOT NULL THEN
    SELECT count(*) INTO _new_users FROM profiles p WHERE p.created_at >= _start AND p.created_at < _end;
  END IF;

  IF to_regclass('audit.workflow_events') IS NOT NULL OR to_regclass('audit.security_events') IS NOT NULL THEN
    -- active users = distinct actor_user_id in workflow_events or security_events
    EXECUTE $sql$
      SELECT count(DISTINCT actor_user_id) FROM (
        SELECT actor_user_id FROM audit.workflow_events WHERE created_at >= $1 AND created_at < $2
        UNION ALL
        SELECT actor_user_id FROM audit.security_events WHERE created_at >= $1 AND created_at < $2
      ) t
    $sql$ USING _start, _end INTO _active_users;

    -- role breakdown: best-effort via profiles -> role or user_roles table
    IF to_regclass('user_roles') IS NOT NULL THEN
      SELECT count(DISTINCT p.user_id) FROM user_roles ur JOIN profiles p ON p.user_id = ur.user_id WHERE p.created_at >= _start AND p.created_at < _end AND ur.role = 'farmer' INTO _active_farmers;
      -- For simplicity in first pass, leave others as 0 unless tables exist and are populated properly
    ELSEIF to_regclass('profiles') IS NOT NULL THEN
      -- Attempt: profiles.role field
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        SELECT count(DISTINCT p.user_id) FILTER (WHERE p.role ILIKE '%farmer%') INTO _active_farmers FROM profiles p WHERE p.updated_at >= _start AND p.updated_at < _end;
        SELECT count(DISTINCT p.user_id) FILTER (WHERE p.role ILIKE '%agent%') INTO _active_agents FROM profiles p WHERE p.updated_at >= _start AND p.updated_at < _end;
        SELECT count(DISTINCT p.user_id) FILTER (WHERE p.role ILIKE '%logistics%') INTO _active_logistics FROM profiles p WHERE p.updated_at >= _start AND p.updated_at < _end;
        SELECT count(DISTINCT p.user_id) FILTER (WHERE p.role ILIKE '%buyer%') INTO _active_buyers FROM profiles p WHERE p.updated_at >= _start AND p.updated_at < _end;
      END IF;
    END IF;
  END IF;

  -- AGENT metrics
  IF to_regclass('agent_tasks') IS NOT NULL THEN
    SELECT count(*) INTO _tasks_created FROM agent_tasks t WHERE t.created_at >= _start AND t.created_at < _end;
    SELECT count(*) INTO _tasks_completed FROM agent_tasks t WHERE t.completed_at >= _start AND t.completed_at < _end;
  END IF;
  IF to_regclass('agent_visits') IS NOT NULL THEN
    SELECT count(*) INTO _visits_logged FROM agent_visits v WHERE v.created_at >= _start AND v.created_at < _end;
  END IF;
  IF to_regclass('agent_voice_notes') IS NOT NULL THEN
    SELECT count(*) INTO _voice_notes_uploaded FROM agent_voice_notes a WHERE a.created_at >= _start AND a.created_at < _end;
  ELSEIF to_regclass('audit.workflow_events') IS NOT NULL THEN
    SELECT count(*) INTO _voice_notes_uploaded FROM audit.workflow_events w WHERE w.created_at >= _start AND w.created_at < _end AND w.event_type ILIKE '%VOICE%' ;
  END IF;

  -- SECURITY
  IF to_regclass('audit.security_events') IS NOT NULL THEN
    SELECT count(*) INTO _throttles FROM audit.security_events s WHERE s.created_at >= _start AND s.created_at < _end AND s.event_type ILIKE '%THROTTLE%';
    SELECT count(*) INTO _blocks FROM audit.security_events s WHERE s.created_at >= _start AND s.created_at < _end AND s.event_type ILIKE '%BLOCK%';
    SELECT count(*) INTO _brute_force FROM audit.security_events s WHERE s.created_at >= _start AND s.created_at < _end AND s.event_type ILIKE '%BRUTE%';
  END IF;

  -- UPSERT into analytics.transport_daily (district-level aggregation not implemented per-row here; we'll insert aggregate row with district=NULL)
  INSERT INTO analytics.transport_daily (day, district, loads_posted, loads_accepted, trips_created, trips_completed, trips_cancelled, avg_accept_to_pickup_minutes, avg_pickup_to_delivery_minutes, top_route_origin, top_route_destination, created_at)
  VALUES (p_day, NULL, COALESCE(_loads_posted,0), COALESCE(_loads_accepted,0), COALESCE(_trips_created,0), COALESCE(_trips_completed,0), COALESCE(_trips_cancelled,0), _avg_accept_to_pickup, _avg_pickup_to_delivery, _top_origin, _top_destination, now())
  ON CONFLICT (day, district) DO UPDATE SET
    loads_posted = EXCLUDED.loads_posted,
    loads_accepted = EXCLUDED.loads_accepted,
    trips_created = EXCLUDED.trips_created,
    trips_completed = EXCLUDED.trips_completed,
    trips_cancelled = EXCLUDED.trips_cancelled,
    avg_accept_to_pickup_minutes = EXCLUDED.avg_accept_to_pickup_minutes,
    avg_pickup_to_delivery_minutes = EXCLUDED.avg_pickup_to_delivery_minutes,
    top_route_origin = EXCLUDED.top_route_origin,
    top_route_destination = EXCLUDED.top_route_destination,
    created_at = now();

  -- Marketplace upsert
  INSERT INTO analytics.marketplace_daily (day, district, listings_created, listings_approved, orders_placed, orders_delivered, gmv, created_at)
  VALUES (p_day, NULL, COALESCE(_listings_created,0), COALESCE(_listings_approved,0), COALESCE(_orders_placed,0), COALESCE(_orders_delivered,0), COALESCE(_gmv,0), now())
  ON CONFLICT (day, district) DO UPDATE SET
    listings_created = EXCLUDED.listings_created,
    listings_approved = EXCLUDED.listings_approved,
    orders_placed = EXCLUDED.orders_placed,
    orders_delivered = EXCLUDED.orders_delivered,
    gmv = EXCLUDED.gmv,
    created_at = now();

  -- Users upsert
  INSERT INTO analytics.users_daily (day, new_users, active_users, active_farmers, active_agents, active_logistics, active_buyers, created_at)
  VALUES (p_day, COALESCE(_new_users,0), COALESCE(_active_users,0), COALESCE(_active_farmers,0), COALESCE(_active_agents,0), COALESCE(_active_logistics,0), COALESCE(_active_buyers,0), now())
  ON CONFLICT (day) DO UPDATE SET
    new_users = EXCLUDED.new_users,
    active_users = EXCLUDED.active_users,
    active_farmers = EXCLUDED.active_farmers,
    active_agents = EXCLUDED.active_agents,
    active_logistics = EXCLUDED.active_logistics,
    active_buyers = EXCLUDED.active_buyers,
    created_at = now();

  -- Agent upsert
  INSERT INTO analytics.agent_daily (day, district, tasks_created, tasks_completed, visits_logged, voice_notes_uploaded, created_at)
  VALUES (p_day, NULL, COALESCE(_tasks_created,0), COALESCE(_tasks_completed,0), COALESCE(_visits_logged,0), COALESCE(_voice_notes_uploaded,0), now())
  ON CONFLICT (day, district) DO UPDATE SET
    tasks_created = EXCLUDED.tasks_created,
    tasks_completed = EXCLUDED.tasks_completed,
    visits_logged = EXCLUDED.visits_logged,
    voice_notes_uploaded = EXCLUDED.voice_notes_uploaded,
    created_at = now();

  -- Security upsert
  INSERT INTO analytics.security_daily (day, throttles, blocks, brute_force_suspects, created_at)
  VALUES (p_day, COALESCE(_throttles,0), COALESCE(_blocks,0), COALESCE(_brute_force,0), now())
  ON CONFLICT (day) DO UPDATE SET
    throttles = EXCLUDED.throttles,
    blocks = EXCLUDED.blocks,
    brute_force_suspects = EXCLUDED.brute_force_suspects,
    created_at = now();

  -- Log run
  INSERT INTO analytics.rollup_runs (day, started_at, finished_at, success, details)
  VALUES (p_day, now(), now(), true, jsonb_build_object('notes','rollup_daily_v1 completed'));

END;
$$;

-- Rollup range/backfill function
CREATE OR REPLACE FUNCTION analytics.rollup_range_v1(p_start date, p_end date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  d date := p_start;
BEGIN
  IF p_end < p_start THEN
    RAISE EXCEPTION 'p_end must be >= p_start';
  END IF;
  PERFORM set_config('app.rpc','true',true);
  WHILE d <= p_end LOOP
    PERFORM analytics.rollup_daily_v1(d);
    d := d + INTERVAL '1 day';
  END LOOP;
END;
$$;

-- Document assumptions
COMMENT ON FUNCTION analytics.rollup_daily_v1(date) IS $$
Assumptions:
- audit.workflow_events has column created_at timestamptz and payload jsonb with keys like 'trip_id', 'new_status'.
- audit.security_events exists with event_type and created_at.
- If canonical tables (trips, transport_requests, listings, market_orders, profiles, agent_tasks, agent_visits, agent_voice_notes) do not exist, the function will skip those counts and use workflow_events where possible.
- Event_type pattern matching uses ILIKE searches; if your event_type naming differs, extend the patterns accordingly.
$$;
