-- Phase E1: Enterprise Audit Schema (Audit-first)
-- File: supabase/migrations/202602201200_phase_e1_enterprise_audit.sql

-- Extensions and schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS audit;

-- 1) Tables (append-only)
CREATE TABLE IF NOT EXISTS audit.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action_type text NOT NULL,
  actor_user_id uuid NULL,
  actor_role text NULL,
  ip_address text NULL,
  user_agent text NULL,
  old_data jsonb NULL,
  new_data jsonb NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash text NULL,
  row_hash text NULL
);

CREATE TABLE IF NOT EXISTS audit.workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  actor_user_id uuid NULL,
  actor_role text NULL,
  geo_lat numeric NULL,
  geo_long numeric NULL,
  device_id text NULL,
  file_id uuid NULL,
  ip_address text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash text NULL,
  row_hash text NULL
);

CREATE TABLE IF NOT EXISTS audit.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NULL,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  actor_user_id uuid NULL,
  rl_key text NULL,
  ip_address text NULL,
  device_id text NULL,
  user_agent text NULL,
  risk_score_snapshot int NULL,
  blocked_until timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash text NULL,
  row_hash text NULL
);

CREATE TABLE IF NOT EXISTS audit.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NOT NULL,
  action_type text NOT NULL,
  actor_user_id uuid NOT NULL,
  actor_role text NOT NULL DEFAULT 'admin',
  target_user_id uuid NULL,
  target_entity_type text NULL,
  target_entity_id uuid NULL,
  reason text NULL,
  previous_state jsonb NULL,
  new_state jsonb NULL,
  ip_address text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash text NULL,
  row_hash text NULL
);

CREATE TABLE IF NOT EXISTS audit.data_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NULL,
  actor_user_id uuid NOT NULL,
  actor_role text NULL,
  accessed_schema text NOT NULL,
  accessed_table text NOT NULL,
  record_id uuid NULL,
  purpose text NULL,
  ip_address text NULL,
  device_id text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_hash text NULL,
  row_hash text NULL
);

-- 2) Row-level security and strict append-only privileges

-- Enable RLS
ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.data_access_events ENABLE ROW LEVEL SECURITY;

-- Revoke update/delete to enforce append-only at privilege level for non-admin roles
REVOKE UPDATE, DELETE ON audit.audit_logs FROM authenticated, anon;
REVOKE UPDATE, DELETE ON audit.workflow_events FROM authenticated, anon;
REVOKE UPDATE, DELETE ON audit.security_events FROM authenticated, anon;
REVOKE UPDATE, DELETE ON audit.admin_actions FROM authenticated, anon;
REVOKE UPDATE, DELETE ON audit.data_access_events FROM authenticated, anon;

-- RLS policies: SELECT only for admins; INSERT allowed only via RPC/ADMIN
-- Assumes a helper function public.is_admin() exists (Phase A) — migration will use public.is_admin().

-- Drop existing policies if present to make migration idempotent
DROP POLICY IF EXISTS audit_logs_select_admin ON audit.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_rpc ON audit.audit_logs;
DROP POLICY IF EXISTS workflow_events_select_admin ON audit.workflow_events;
DROP POLICY IF EXISTS workflow_events_insert_rpc ON audit.workflow_events;
DROP POLICY IF EXISTS security_events_select_admin ON audit.security_events;
DROP POLICY IF EXISTS security_events_insert_rpc ON audit.security_events;
DROP POLICY IF EXISTS admin_actions_select_admin ON audit.admin_actions;
DROP POLICY IF EXISTS admin_actions_insert_rpc ON audit.admin_actions;
DROP POLICY IF EXISTS data_access_select_admin ON audit.data_access_events;
DROP POLICY IF EXISTS data_access_insert_rpc ON audit.data_access_events;

CREATE POLICY audit_logs_select_admin ON audit.audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY audit_logs_insert_rpc ON audit.audit_logs FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

CREATE POLICY workflow_events_select_admin ON audit.workflow_events FOR SELECT USING (public.is_admin());
CREATE POLICY workflow_events_insert_rpc ON audit.workflow_events FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

CREATE POLICY security_events_select_admin ON audit.security_events FOR SELECT USING (public.is_admin());
CREATE POLICY security_events_insert_rpc ON audit.security_events FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

CREATE POLICY admin_actions_select_admin ON audit.admin_actions FOR SELECT USING (public.is_admin());
CREATE POLICY admin_actions_insert_rpc ON audit.admin_actions FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

CREATE POLICY data_access_select_admin ON audit.data_access_events FOR SELECT USING (public.is_admin());
CREATE POLICY data_access_insert_rpc ON audit.data_access_events FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

-- NOTE: previous_hash and row_hash columns exist for future tamper-detection.
-- Phase E1 intentionally does NOT implement hash-chain computation triggers
-- to avoid performance / contention concerns. Hash-chain activation will be
-- implemented in Phase E1.2 where we add efficient batched or async signing.

-- 3) SECURITY DEFINER insert functions
-- Each function sets a local flag app.rpc = 'true' so RLS INSERT checks pass only when called via these functions

-- Helper: new request id
CREATE OR REPLACE FUNCTION audit.new_request_id_v1()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT gen_random_uuid();
$$;

-- audit.log_audit_log_v1
CREATE OR REPLACE FUNCTION audit.log_audit_log_v1(
  p_request_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action_type text,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_id uuid;
  v_actor uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);
  v_actor := COALESCE(p_actor_user_id, auth.uid());

  INSERT INTO audit.audit_logs(
    request_id, entity_type, entity_id, action_type, actor_user_id, actor_role,
    ip_address, user_agent, old_data, new_data, metadata
  ) VALUES (
    p_request_id, p_entity_type, p_entity_id, p_action_type, v_actor, p_actor_role,
    p_ip_address, p_user_agent, p_old_data, p_new_data, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION audit.log_audit_log_v1(uuid,text,uuid,text,uuid,text,text,text,jsonb,jsonb,jsonb) TO authenticated;

-- audit.log_workflow_event_v1
CREATE OR REPLACE FUNCTION audit.log_workflow_event_v1(
  p_request_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_geo_lat numeric DEFAULT NULL,
  p_geo_long numeric DEFAULT NULL,
  p_device_id text DEFAULT NULL,
  p_file_id uuid DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_id uuid;
  v_actor uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);
  v_actor := COALESCE(p_actor_user_id, auth.uid());

  INSERT INTO audit.workflow_events(
    request_id, entity_type, entity_id, event_type, actor_user_id, actor_role,
    geo_lat, geo_long, device_id, file_id, ip_address, user_agent, metadata
  ) VALUES (
    p_request_id, p_entity_type, p_entity_id, p_event_type, v_actor, p_actor_role,
    p_geo_lat, p_geo_long, p_device_id, p_file_id, p_ip_address, p_user_agent, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION audit.log_workflow_event_v1(uuid,text,uuid,text,uuid,text,numeric,numeric,text,uuid,text,text,jsonb) TO authenticated;

-- audit.log_security_event_v1
CREATE OR REPLACE FUNCTION audit.log_security_event_v1(
  p_request_id uuid DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_rl_key text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_device_id text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_risk_score_snapshot int DEFAULT NULL,
  p_blocked_until timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_id uuid;
  v_actor uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  v_actor := COALESCE(p_actor_user_id, auth.uid());

  INSERT INTO audit.security_events(
    request_id, event_type, severity, actor_user_id, rl_key, ip_address, device_id, user_agent,
    risk_score_snapshot, blocked_until, metadata
  ) VALUES (
    p_request_id, p_event_type, p_severity, v_actor, p_rl_key, p_ip_address, p_device_id, p_user_agent,
    p_risk_score_snapshot, p_blocked_until, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION audit.log_security_event_v1(uuid,text,text,uuid,text,text,text,text,int,timestamptz,jsonb) TO authenticated;

-- audit.log_admin_action_v1
CREATE OR REPLACE FUNCTION audit.log_admin_action_v1(
  p_request_id uuid,
  p_action_type text,
  p_actor_user_id uuid,
  p_actor_role text DEFAULT 'admin',
  p_target_user_id uuid DEFAULT NULL,
  p_target_entity_type text DEFAULT NULL,
  p_target_entity_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_previous_state jsonb DEFAULT NULL,
  p_new_state jsonb DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  INSERT INTO audit.admin_actions(
    request_id, action_type, actor_user_id, actor_role, target_user_id, target_entity_type, target_entity_id,
    reason, previous_state, new_state, ip_address, user_agent, metadata
  ) VALUES (
    p_request_id, p_action_type, p_actor_user_id, p_actor_role, p_target_user_id, p_target_entity_type, p_target_entity_id,
    p_reason, p_previous_state, p_new_state, p_ip_address, p_user_agent, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION audit.log_admin_action_v1(uuid,text,uuid,text,uuid,text,uuid,text,jsonb,jsonb,text,text,jsonb) TO authenticated;

-- audit.log_data_access_event_v1
CREATE OR REPLACE FUNCTION audit.log_data_access_event_v1(
  p_request_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_accessed_schema text DEFAULT NULL,
  p_accessed_table text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_purpose text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_device_id text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  INSERT INTO audit.data_access_events(
    request_id, actor_user_id, actor_role, accessed_schema, accessed_table, record_id,
    purpose, ip_address, device_id, user_agent, metadata
  ) VALUES (
    p_request_id, p_actor_user_id, p_actor_role, p_accessed_schema, p_accessed_table, p_record_id,
    p_purpose, p_ip_address, p_device_id, p_user_agent, p_metadata
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION audit.log_data_access_event_v1(uuid,uuid,text,text,text,uuid,text,text,text,text,jsonb) TO authenticated;

-- 4) Safety-net trigger function for minimal status changes
CREATE OR REPLACE FUNCTION audit.on_status_change_minimal_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_req uuid := gen_random_uuid();
  v_actor uuid := NULL;
  v_table text := TG_TABLE_NAME;
  v_metadata jsonb;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    -- attempt to capture actor if available; it's safe to be NULL
    BEGIN
      v_actor := auth.uid();
    EXCEPTION WHEN others THEN
      v_actor := NULL;
    END;

    v_metadata := jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status);
    v_old := jsonb_build_object('status', OLD.status, 'updated_at', OLD.updated_at);
    v_new := jsonb_build_object('status', NEW.status, 'updated_at', NEW.updated_at);

    -- Call SECURITY DEFINER RPCs to record events (these set app.rpc internally)
    PERFORM audit.log_workflow_event_v1(v_req, v_table, NEW.id, upper(v_table || '_STATUS_CHANGED'), v_actor, NULL, NULL, NULL, NULL, NULL, NULL, v_metadata);

    PERFORM audit.log_audit_log_v1(v_req, v_table, NEW.id, 'status_changed', v_actor, NULL, NULL, NULL, v_old, v_new, '{}'::jsonb);

    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach AFTER UPDATE triggers conditionally if tables exist (drop if exists then create)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trips')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'status') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trips_status_change_after_update ON public.trips';
    EXECUTE 'CREATE TRIGGER trips_status_change_after_update AFTER UPDATE OF status ON public.trips FOR EACH ROW EXECUTE FUNCTION audit.on_status_change_minimal_v1()';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'market_orders')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'market_orders' AND column_name = 'status') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS market_orders_status_change_after_update ON public.market_orders';
    EXECUTE 'CREATE TRIGGER market_orders_status_change_after_update AFTER UPDATE OF status ON public.market_orders FOR EACH ROW EXECUTE FUNCTION audit.on_status_change_minimal_v1()';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'listings')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'status') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS listings_status_change_after_update ON public.listings';
    EXECUTE 'CREATE TRIGGER listings_status_change_after_update AFTER UPDATE OF status ON public.listings FOR EACH ROW EXECUTE FUNCTION audit.on_status_change_minimal_v1()';
  END IF;
END;
$$;

-- 5) Indexes to support common queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='audit_logs' AND column_name='entity_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='audit_logs' AND column_name='entity_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='audit_logs' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit.audit_logs(entity_type, entity_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='audit_logs' AND column_name='actor_user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='audit_logs' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit.audit_logs(actor_user_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='audit_logs' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit.audit_logs(created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='audit_logs' AND column_name='request_id') THEN
    CREATE INDEX IF NOT EXISTS audit_logs_request_idx ON audit.audit_logs(request_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='workflow_events' AND column_name='entity_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='workflow_events' AND column_name='entity_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='workflow_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS workflow_entity_idx ON audit.workflow_events(entity_type, entity_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='workflow_events' AND column_name='event_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='workflow_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS workflow_eventtype_idx ON audit.workflow_events(event_type, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='workflow_events' AND column_name='actor_user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='workflow_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS workflow_actor_idx ON audit.workflow_events(actor_user_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='workflow_events' AND column_name='request_id') THEN
    CREATE INDEX IF NOT EXISTS workflow_request_idx ON audit.workflow_events(request_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='security_events' AND column_name='severity')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='security_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS security_severity_idx ON audit.security_events(severity, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='security_events' AND column_name='event_type')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='security_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS security_eventtype_idx ON audit.security_events(event_type, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='security_events' AND column_name='actor_user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='security_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS security_actor_idx ON audit.security_events(actor_user_id, created_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='admin_actions' AND column_name='target_user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='admin_actions' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS admin_target_user_idx ON audit.admin_actions(target_user_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='admin_actions' AND column_name='request_id') THEN
    CREATE INDEX IF NOT EXISTS admin_request_idx ON audit.admin_actions(request_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='data_access_events' AND column_name='actor_user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='data_access_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS dataaccess_actor_idx ON audit.data_access_events(actor_user_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='data_access_events' AND column_name='accessed_schema')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='data_access_events' AND column_name='accessed_table')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='audit' AND table_name='data_access_events' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS dataaccess_table_idx ON audit.data_access_events(accessed_schema, accessed_table, created_at DESC);
  END IF;
END
$$;

-- 6) Final grants (allow function execution by authenticated callers)
GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT EXECUTE ON FUNCTION audit.new_request_id_v1() TO authenticated;

-- Smoke tests (comments):
-- 1) Admin SELECT permitted
--    SET ROLE "service_role"; -- or call as an admin
--    SELECT COUNT(*) FROM audit.audit_logs;
--
-- 2) Non-admin SELECT denied (as authenticated user)
--    SET ROLE authenticated; -- run as authenticated session
--    -- should return zero rows or error depending on is_admin() implementation
--    SELECT COUNT(*) FROM audit.audit_logs;
--
-- 3) Call insert function as authenticated (edge / RPC)
--    SELECT audit.new_request_id_v1();
--    SELECT audit.log_security_event_v1(audit.new_request_id_v1(), 'rate_limit_trigger', 'medium', NULL, 'rl:ip:1', '1.2.3.4', 'device-123', 'agent', 42, NULL, '{}'::jsonb);
--    SELECT COUNT(*) FROM audit.security_events WHERE event_type = 'rate_limit_trigger';
--
-- 4) Update a trip status to trigger workflow event (if public.trips exists)
--    UPDATE public.trips SET status = 'in_transit' WHERE id = '<some-uuid>' AND status <> 'in_transit';

