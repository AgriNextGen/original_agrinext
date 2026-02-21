-- 202602211200_phase_5_8_observability.sql
-- Phase 5.8: Observability & SRE Readiness

CREATE SCHEMA IF NOT EXISTS analytics;

-- system metrics hourly
CREATE TABLE IF NOT EXISTS analytics.system_metrics_hourly (
  hour_ts timestamptz NOT NULL,
  metric_name text NOT NULL,
  value numeric NOT NULL,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hour_ts, metric_name, tags)
);
CREATE INDEX IF NOT EXISTS idx_sysmetrics_name_hour ON analytics.system_metrics_hourly(metric_name, hour_ts DESC);

-- system events
CREATE TABLE IF NOT EXISTS analytics.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Alert rules (admin-managed)
CREATE SCHEMA IF NOT EXISTS secure;
CREATE TABLE IF NOT EXISTS secure.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('threshold','spike','count')),
  metric_name text NOT NULL,
  threshold numeric NOT NULL,
  lookback_minutes int NOT NULL DEFAULT 15,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  cooldown_minutes int NOT NULL DEFAULT 30,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Append-only alerts table
CREATE TABLE IF NOT EXISTS audit.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  severity text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','ack','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  ack_by uuid NULL,
  resolved_at timestamptz NULL
);

-- RLS
ALTER TABLE secure.alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY secure_alert_rules_admin ON secure.alert_rules FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
ALTER TABLE audit.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_alerts_admin ON audit.alerts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin() OR current_setting('app.rpc','false') = 'true');

-- ---------------------------------------------------------------------
-- Admin RPC: system_health_snapshot_v1
-- Returns key KPIs for admin UI
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.system_health_snapshot_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, analytics, audit
AS $$
DECLARE
  v_hour timestamptz := date_trunc('hour', now()) - INTERVAL '0 hour';
  v_login_success numeric := 0;
  v_login_failure numeric := 0;
  v_webhook_failure numeric := 0;
  v_job_failure numeric := 0;
  v_dead_jobs numeric := 0;
  v_upload_failure numeric := 0;
  v_rate_limit_blocks numeric := 0;
  v_disputes_open numeric := 0;
  v_payout_queue numeric := 0;
  v_locked_accounts numeric := 0;
  v_restricted_accounts numeric := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT COALESCE(SUM(value), 0) INTO v_login_success FROM analytics.system_metrics_hourly WHERE metric_name = 'login_success_count' AND hour_ts = v_hour;
  SELECT COALESCE(SUM(value), 0) INTO v_login_failure FROM analytics.system_metrics_hourly WHERE metric_name = 'login_failure_count' AND hour_ts = v_hour;
  SELECT COALESCE(SUM(value), 0) INTO v_webhook_failure FROM analytics.system_metrics_hourly WHERE metric_name = 'webhook_failure_count' AND hour_ts = v_hour;
  SELECT COALESCE(SUM(value), 0) INTO v_job_failure FROM analytics.system_metrics_hourly WHERE metric_name = 'job_failure_count' AND hour_ts = v_hour;
  SELECT COALESCE(SUM(value), 0) INTO v_dead_jobs FROM analytics.system_metrics_hourly WHERE metric_name = 'dead_jobs_count' AND hour_ts = v_hour;
  SELECT COALESCE(SUM(value), 0) INTO v_upload_failure FROM analytics.system_metrics_hourly WHERE metric_name = 'upload_failure_count' AND hour_ts = v_hour;
  SELECT COALESCE(SUM(value), 0) INTO v_rate_limit_blocks FROM analytics.system_metrics_hourly WHERE metric_name = 'rate_limit_block_count' AND hour_ts = v_hour;
  SELECT COUNT(*) INTO v_disputes_open FROM public.disputes WHERE status = 'open';
  SELECT COUNT(*) INTO v_payout_queue FROM secure.payout_jobs WHERE status = 'queued';
  SELECT COUNT(*) INTO v_locked_accounts FROM public.profiles WHERE account_status = 'locked';
  SELECT COUNT(*) INTO v_restricted_accounts FROM public.profiles WHERE account_status = 'restricted';

  RETURN jsonb_build_object(
    'as_of', now(),
    'hour', v_hour,
    'login_success_count', v_login_success,
    'login_failure_count', v_login_failure,
    'webhook_failure_count', v_webhook_failure,
    'job_failure_count', v_job_failure,
    'dead_jobs_count', v_dead_jobs,
    'upload_failure_count', v_upload_failure,
    'rate_limit_block_count', v_rate_limit_blocks,
    'disputes_open_count', v_disputes_open,
    'payout_queue_count', v_payout_queue,
    'locked_accounts_count', v_locked_accounts,
    'restricted_accounts_count', v_restricted_accounts
  );
END;
$$;
GRANT EXECUTE ON FUNCTION admin.system_health_snapshot_v1() TO authenticated;

-- ---------------------------------------------------------------------
-- Admin RPC: alerts_check_v1
-- Evaluate alert rules and create audit.alerts + ops inbox items when triggered
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.alerts_check_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, analytics, audit
AS $$
DECLARE
  r record;
  v_req uuid := audit.new_request_id_v1();
  v_since timestamptz;
  v_value numeric;
  v_existing int;
BEGIN
  -- allow job-worker (app.rpc) or admin
  IF NOT public.is_admin() AND current_setting('app.rpc', true) <> 'true' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  FOR r IN SELECT * FROM secure.alert_rules WHERE is_enabled LOOP
    v_since := now() - (r.lookback_minutes || ' minutes')::interval;
    SELECT COALESCE(SUM(value),0) INTO v_value FROM analytics.system_metrics_hourly WHERE metric_name = r.metric_name AND hour_ts >= date_trunc('hour', v_since);

    IF r.rule_type = 'threshold' AND v_value > r.threshold THEN
      -- check cooldown: any alert for rule_name in last cooldown_minutes?
      SELECT COUNT(*) INTO v_existing FROM audit.alerts WHERE rule_name = r.rule_name AND created_at >= now() - (r.cooldown_minutes || ' minutes')::interval;
      IF v_existing = 0 THEN
        INSERT INTO audit.alerts(rule_name, severity, metadata) VALUES (r.rule_name, r.severity, jsonb_build_object('metric', r.metric_name, 'value', v_value, 'threshold', r.threshold));
        PERFORM admin.build_ops_inbox_item_v1('system_alert','system', gen_random_uuid(), r.severity, concat('Alert ', r.rule_name, ': ', r.metric_name, ' = ', v_value), jsonb_build_object('metric', r.metric_name, 'value', v_value));
        INSERT INTO analytics.system_events(event_type, severity, metadata) VALUES (r.rule_name, r.severity, jsonb_build_object('metric', r.metric_name, 'value', v_value, 'rule', r.rule_name));
      END IF;
    END IF;
    -- spike/count logic can be extended later
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'checked_at', now());
END;
$$;
GRANT EXECUTE ON FUNCTION admin.alerts_check_v1() TO authenticated;

-- Seed initial alert rules (idempotent)
INSERT INTO secure.alert_rules (rule_name, rule_type, metric_name, threshold, lookback_minutes, severity, cooldown_minutes, is_enabled)
SELECT * FROM (VALUES
  ('webhook_failure_spike','threshold','webhook_failure_count',5,15,'high',30,true),
  ('job_failure_spike','threshold','job_failure_count',3,10,'high',30,true),
  ('dead_jobs_present','threshold','dead_jobs_count',1,10,'critical',60,true),
  ('upload_failure_spike','threshold','upload_failure_count',10,30,'high',30,true),
  ('payout_queue_large','threshold','payout_queue_count',50,60,'medium',60,true)
) AS v(rule_name, rule_type, metric_name, threshold, lookback_minutes, severity, cooldown_minutes, is_enabled)
WHERE NOT EXISTS (SELECT 1 FROM secure.alert_rules WHERE rule_name = v.rule_name);

-- ---------------------------------------------------------------------
-- Admin RPC: system_metrics_rollup_v1
-- Compute last-hour system metrics and insert into analytics.system_metrics_hourly
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.system_metrics_rollup_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, analytics, secure
AS $$
DECLARE
  h timestamptz := date_trunc('hour', now()) - INTERVAL '0 hour';
  v_login_success numeric := 0;
  v_login_failure numeric := 0;
  v_webhook_failure numeric := 0;
  v_job_failure numeric := 0;
  v_dead_jobs numeric := 0;
  v_upload_failure numeric := 0;
  v_payout_queue numeric := 0;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  -- From audit.security_events: use event_type naming convention
  SELECT COALESCE(COUNT(*),0) INTO v_login_success FROM audit.security_events WHERE event_type = 'LOGIN_SUCCESS' AND created_at >= now() - INTERVAL '1 hour';
  SELECT COALESCE(COUNT(*),0) INTO v_login_failure FROM audit.security_events WHERE event_type = 'LOGIN_FAILURE' AND created_at >= now() - INTERVAL '1 hour';

  -- webhook failures
  BEGIN
    SELECT COALESCE(COUNT(*),0) INTO v_webhook_failure FROM secure.webhook_events WHERE processing_status = 'failed' AND received_at >= now() - INTERVAL '1 hour';
  EXCEPTION WHEN undefined_table THEN v_webhook_failure := 0; END;

  -- job failures and dead jobs
  BEGIN
    SELECT COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END),0), COALESCE(SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END),0)
    INTO v_job_failure, v_dead_jobs FROM job_queue WHERE updated_at >= now() - INTERVAL '1 hour';
  EXCEPTION WHEN undefined_table THEN v_job_failure := 0; v_dead_jobs := 0; END;

  -- upload failures (best-effort)
  BEGIN
    SELECT COALESCE(COUNT(*),0) INTO v_upload_failure FROM audit.workflow_events WHERE event_type = 'UPLOAD_FAILED' AND created_at >= now() - INTERVAL '1 hour';
  EXCEPTION WHEN undefined_table THEN v_upload_failure := 0; END;

  -- payout queue size
  BEGIN
    SELECT COALESCE(COUNT(*),0) INTO v_payout_queue FROM secure.payout_jobs WHERE status = 'queued';
  EXCEPTION WHEN undefined_table THEN v_payout_queue := 0; END;

  -- insert metrics (upsert pattern: delete existing hour+metric+tags then insert)
  DELETE FROM analytics.system_metrics_hourly WHERE hour_ts = h AND metric_name IN ('login_success_count','login_failure_count','webhook_failure_count','job_failure_count','dead_jobs_count','upload_failure_count','payout_queue_count');

  INSERT INTO analytics.system_metrics_hourly (hour_ts, metric_name, value, tags) VALUES
    (h, 'login_success_count', v_login_success, '{}'::jsonb),
    (h, 'login_failure_count', v_login_failure, '{}'::jsonb),
    (h, 'webhook_failure_count', v_webhook_failure, '{}'::jsonb),
    (h, 'job_failure_count', v_job_failure, '{}'::jsonb),
    (h, 'dead_jobs_count', v_dead_jobs, '{}'::jsonb),
    (h, 'upload_failure_count', v_upload_failure, '{}'::jsonb),
    (h, 'payout_queue_count', v_payout_queue, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'hour', h);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.system_metrics_rollup_v1() TO authenticated;

-- ---------------------------------------------------------------------
-- Admin RPCs: ack / resolve alerts
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.alerts_ack_v1(p_alert_id uuid, p_ack_by uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);
  UPDATE audit.alerts SET status = 'ack', ack_by = p_ack_by WHERE id = p_alert_id;
  RETURN jsonb_build_object('ok', true, 'alert_id', p_alert_id);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.alerts_ack_v1(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION admin.alerts_resolve_v1(p_alert_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);
  UPDATE audit.alerts SET status = 'resolved', resolved_at = now() WHERE id = p_alert_id;
  RETURN jsonb_build_object('ok', true, 'alert_id', p_alert_id);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.alerts_resolve_v1(uuid) TO authenticated;


