-- Phase C2: Audit Schema (Append-Only)
-- Creates audit schema with immutable audit_logs and security_events tables

-- ============================================================
-- STEP 1: CREATE SCHEMA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================
-- STEP 2: audit.audit_logs
-- ============================================================

CREATE TABLE audit.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_entity ON audit.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit.audit_logs (created_at);

-- ============================================================
-- STEP 3: audit.security_events
-- ============================================================

CREATE TABLE audit.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text CHECK (severity IN ('low','medium','high','critical')),
  actor_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_security_events_type ON audit.security_events (event_type);
CREATE INDEX idx_security_events_severity ON audit.security_events (severity);
CREATE INDEX idx_security_events_created ON audit.security_events (created_at);

-- ============================================================
-- STEP 4: ENABLE RLS
-- ============================================================

ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.security_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: POLICIES — admin-only SELECT, no client INSERT/UPDATE/DELETE
-- ============================================================

CREATE POLICY audit_logs_select_admin
  ON audit.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY security_events_select_admin
  ON audit.security_events FOR SELECT
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policies — only SECURITY DEFINER functions can write

-- ============================================================
-- STEP 6: HELPER FUNCTION — insert_audit_log
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO audit.audit_logs (actor_id, actor_role, action_type, entity_type, entity_id, metadata)
  VALUES (auth.uid(), public.current_role(), p_action_type, p_entity_type, p_entity_id, p_metadata);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_audit_log(text, text, uuid, jsonb) TO authenticated;

-- ============================================================
-- STEP 7: HELPER FUNCTION — insert_security_event
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO audit.security_events (event_type, severity, actor_id, details)
  VALUES (p_event_type, p_severity, auth.uid(), p_details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_security_event(text, text, jsonb) TO authenticated;
