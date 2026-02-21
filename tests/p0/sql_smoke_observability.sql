-- Smoke tests for Phase 5.8 observability
-- 1) Verify tables exist
SELECT count(*) FROM analytics.system_metrics_hourly;
SELECT count(*) FROM analytics.system_events;
SELECT count(*) FROM secure.alert_rules;
SELECT count(*) FROM audit.alerts;

-- 2) Run rollup RPC (requires proper DB permissions)
-- SELECT admin.system_metrics_rollup_v1();

-- 3) Run alerts check RPC (requires admin or app.rpc context)
-- SELECT admin.alerts_check_v1();

-- 4) Verify admin.snapshot RPC returns JSON
-- SELECT admin.system_health_snapshot_v1();

-- Note: some RPCs require admin/app.rpc context; run these tests in a staging environment as an admin.
