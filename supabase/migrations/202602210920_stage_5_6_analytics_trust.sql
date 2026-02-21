-- 202602210920_stage_5_6_analytics_trust.sql
-- Add trust/fraud daily rollup table and rollup function

CREATE TABLE IF NOT EXISTS analytics.trust_daily (
  day date NOT NULL,
  security_events_by_type jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked_accounts_count int NOT NULL DEFAULT 0,
  restricted_accounts_count int NOT NULL DEFAULT 0,
  disputes_opened_count int NOT NULL DEFAULT 0,
  disputes_resolved_count int NOT NULL DEFAULT 0,
  payout_holds_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day)
);

ALTER TABLE analytics.trust_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_trust_select_admin ON analytics.trust_daily FOR SELECT USING (is_admin());
CREATE POLICY analytics_trust_rpc_write ON analytics.trust_daily FOR ALL USING (is_admin()) WITH CHECK (current_setting('app.rpc','false') = 'true' OR is_admin());

CREATE INDEX IF NOT EXISTS analytics_trust_day_idx ON analytics.trust_daily(day);

-- Rollup function for trust metrics
CREATE OR REPLACE FUNCTION analytics.rollup_trust_v1(p_day date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  _start timestamptz := (p_day::timestamptz at time zone 'Asia/Kolkata');
  _end timestamptz := ((_start + INTERVAL '1 day'));
  v_security_by_type jsonb := '{}'::jsonb;
  v_locked int := 0;
  v_restricted int := 0;
  v_disputes_opened int := 0;
  v_disputes_resolved int := 0;
  v_payout_holds int := 0;
BEGIN
  PERFORM set_config('app.rpc','true',true);

  IF to_regclass('audit.security_events') IS NOT NULL THEN
    SELECT jsonb_object_agg(event_type, cnt) INTO v_security_by_type FROM (
      SELECT event_type, COUNT(*) AS cnt FROM audit.security_events WHERE created_at >= _start AND created_at < _end GROUP BY event_type
    ) t;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_locked FROM public.profiles WHERE account_status = 'locked';
    SELECT COUNT(*) INTO v_restricted FROM public.profiles WHERE account_status = 'restricted';
  END IF;

  IF to_regclass('public.disputes') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_disputes_opened FROM public.disputes WHERE created_at >= _start AND created_at < _end;
    SELECT COUNT(*) INTO v_disputes_resolved FROM public.disputes WHERE resolved_at >= _start AND resolved_at < _end;
  END IF;

  IF to_regclass('public.market_orders') IS NOT NULL THEN
    SELECT COUNT(*) INTO v_payout_holds FROM public.market_orders WHERE payout_hold = true;
  END IF;

  INSERT INTO analytics.trust_daily (day, security_events_by_type, locked_accounts_count, restricted_accounts_count, disputes_opened_count, disputes_resolved_count, payout_holds_count, created_at)
  VALUES (p_day, COALESCE(v_security_by_type,'{}'::jsonb), COALESCE(v_locked,0), COALESCE(v_restricted,0), COALESCE(v_disputes_opened,0), COALESCE(v_disputes_resolved,0), COALESCE(v_payout_holds,0), now())
  ON CONFLICT (day) DO UPDATE SET
    security_events_by_type = EXCLUDED.security_events_by_type,
    locked_accounts_count = EXCLUDED.locked_accounts_count,
    restricted_accounts_count = EXCLUDED.restricted_accounts_count,
    disputes_opened_count = EXCLUDED.disputes_opened_count,
    disputes_resolved_count = EXCLUDED.disputes_resolved_count,
    payout_holds_count = EXCLUDED.payout_holds_count,
    created_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION analytics.rollup_trust_v1(date) TO authenticated;

