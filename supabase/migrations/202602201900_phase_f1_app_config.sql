-- Phase F1: app_config
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- seeded defaults
INSERT INTO public.app_config(key, value) VALUES
  ('OPEN_SIGNUP_FARMER', to_jsonb(true)),
  ('OPEN_SIGNUP_AGENT', to_jsonb(true)),
  ('OPEN_SIGNUP_LOGISTICS', to_jsonb(true)),
  ('OPEN_SIGNUP_BUYER', to_jsonb(true)),
  ('SYSTEM_MAINTENANCE_MODE', to_jsonb(false)),
  ('RATE_LIMIT_MULTIPLIER', to_jsonb(1.0))
ON CONFLICT (key) DO NOTHING;

-- RLS: allow authenticated users to SELECT, only admin to UPDATE
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_config_select_auth ON public.app_config
  FOR SELECT USING (auth.role() IS NOT NULL);

CREATE POLICY app_config_update_admin ON public.app_config
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- helper RPC to return all config as jsonb
CREATE OR REPLACE FUNCTION public.get_app_config_v1()
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_object_agg(key, value) FROM public.app_config;
$$;
