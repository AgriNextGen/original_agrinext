-- P1: Enable RLS on 8 remaining tables and add appropriate policies
-- Tables: crop_photos, ai_farmer_logs, web_cache, login_attempts, edge_rate_limits (public)
--         finance_daily, system_events, system_metrics_hourly (analytics)

ALTER TABLE public.crop_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_farmer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE analytics.finance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.system_metrics_hourly ENABLE ROW LEVEL SECURITY;

CREATE POLICY crop_photos_select ON public.crop_photos
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY crop_photos_insert ON public.crop_photos
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid() OR is_admin());

CREATE POLICY ai_farmer_logs_select_own ON public.ai_farmer_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY ai_farmer_logs_insert_own ON public.ai_farmer_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY web_cache_select ON public.web_cache
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY login_attempts_admin_select ON public.login_attempts
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY edge_rate_limits_admin_select ON public.edge_rate_limits
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY finance_daily_admin_select ON analytics.finance_daily
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY system_events_admin_select ON analytics.system_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY system_metrics_admin_select ON analytics.system_metrics_hourly
  FOR SELECT TO authenticated
  USING (public.is_admin());
