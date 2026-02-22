-- Signup guardrails and telemetry for signup-by-phone hardening.

CREATE SCHEMA IF NOT EXISTS security;

INSERT INTO public.app_config (key, value)
VALUES
  ('SIGNUP_ENABLED', to_jsonb(true)),
  ('SIGNUP_MINIMAL_MODE', to_jsonb(true)),
  ('SIGNUP_MAX_PER_IP_5M', to_jsonb(2000)),
  ('SIGNUP_MAX_PER_PHONE_1H', to_jsonb(60)),
  ('SIGNUP_BLOCKED_PHONE_PREFIXES', '[]'::jsonb),
  ('SIGNUP_BLOCKED_IP_PREFIXES', '[]'::jsonb),
  ('OPEN_SIGNUP_ADMIN', to_jsonb(false))
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  normalized_phone_hash text NOT NULL,
  ip_prefix text NULL,
  role public.app_role NULL,
  status_code integer NOT NULL,
  error_code text NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_attempts_created_at_desc
  ON public.signup_attempts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_role_created
  ON public.signup_attempts (role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_request_id
  ON public.signup_attempts (request_id);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_phone_hash
  ON public.signup_attempts (normalized_phone_hash);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_error_code
  ON public.signup_attempts (error_code, created_at DESC);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signup_attempts_select_admin ON public.signup_attempts;
CREATE POLICY signup_attempts_select_admin
  ON public.signup_attempts
  FOR SELECT
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION security.evaluate_signup_guard_v1(
  p_request_id text,
  p_role public.app_role,
  p_phone text,
  p_ip text DEFAULT NULL
)
RETURNS TABLE (
  allowed boolean,
  error_code text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, security
AS $$
DECLARE
  v_signup_enabled boolean := true;
  v_minimal_mode boolean := true;
  v_ip_limit integer := 2000;
  v_phone_limit integer := 60;
  v_role_open boolean := true;
  v_phone_digits text := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_ip_prefix text := NULL;
  v_ip_allowed boolean := true;
  v_phone_allowed boolean := true;
  v_blocked_phone_prefixes text[] := ARRAY[]::text[];
  v_blocked_ip_prefixes text[] := ARRAY[]::text[];
  v_phone_prefix text;
  v_ip_prefix_rule text;
  v_role_key text;
BEGIN
  IF p_role IS NULL OR p_phone IS NULL OR length(v_phone_digits) < 10 THEN
    RETURN QUERY SELECT false, 'VALIDATION_ERROR'::text, 'invalid_payload'::text;
    RETURN;
  END IF;

  SELECT COALESCE((value #>> '{}')::boolean, true)
  INTO v_signup_enabled
  FROM public.app_config
  WHERE key = 'SIGNUP_ENABLED';
  v_signup_enabled := COALESCE(v_signup_enabled, true);

  IF NOT v_signup_enabled THEN
    RETURN QUERY SELECT false, 'SIGNUP_DISABLED'::text, 'signup_disabled'::text;
    RETURN;
  END IF;

  v_role_key := CASE p_role
    WHEN 'farmer' THEN 'OPEN_SIGNUP_FARMER'
    WHEN 'agent' THEN 'OPEN_SIGNUP_AGENT'
    WHEN 'logistics' THEN 'OPEN_SIGNUP_LOGISTICS'
    WHEN 'buyer' THEN 'OPEN_SIGNUP_BUYER'
    WHEN 'admin' THEN 'OPEN_SIGNUP_ADMIN'
  END;

  SELECT COALESCE((value #>> '{}')::boolean, true)
  INTO v_role_open
  FROM public.app_config
  WHERE key = v_role_key;
  v_role_open := COALESCE(v_role_open, true);

  IF NOT v_role_open THEN
    RETURN QUERY SELECT false, 'ROLE_CLOSED'::text, 'role_closed'::text;
    RETURN;
  END IF;

  SELECT COALESCE((value #>> '{}')::boolean, true)
  INTO v_minimal_mode
  FROM public.app_config
  WHERE key = 'SIGNUP_MINIMAL_MODE';
  v_minimal_mode := COALESCE(v_minimal_mode, true);

  SELECT COALESCE((value #>> '{}')::integer, 2000)
  INTO v_ip_limit
  FROM public.app_config
  WHERE key = 'SIGNUP_MAX_PER_IP_5M';
  v_ip_limit := GREATEST(COALESCE(v_ip_limit, 2000), 1);

  SELECT COALESCE((value #>> '{}')::integer, 60)
  INTO v_phone_limit
  FROM public.app_config
  WHERE key = 'SIGNUP_MAX_PER_PHONE_1H';
  v_phone_limit := GREATEST(COALESCE(v_phone_limit, 60), 1);

  IF v_minimal_mode THEN
    v_ip_limit := GREATEST(v_ip_limit, 2000);
    v_phone_limit := GREATEST(v_phone_limit, 60);
  END IF;

  SELECT COALESCE(
    (
      SELECT ARRAY(SELECT jsonb_array_elements_text(value))
      FROM public.app_config
      WHERE key = 'SIGNUP_BLOCKED_PHONE_PREFIXES'
    ),
    ARRAY[]::text[]
  )
  INTO v_blocked_phone_prefixes;

  FOREACH v_phone_prefix IN ARRAY v_blocked_phone_prefixes LOOP
    IF v_phone_prefix <> '' AND (
      p_phone LIKE v_phone_prefix || '%' OR
      v_phone_digits LIKE regexp_replace(v_phone_prefix, '\D', '', 'g') || '%'
    ) THEN
      RETURN QUERY SELECT false, 'SIGNUP_DISABLED'::text, 'blocked_phone_prefix'::text;
      RETURN;
    END IF;
  END LOOP;

  SELECT COALESCE(
    (
      SELECT ARRAY(SELECT jsonb_array_elements_text(value))
      FROM public.app_config
      WHERE key = 'SIGNUP_BLOCKED_IP_PREFIXES'
    ),
    ARRAY[]::text[]
  )
  INTO v_blocked_ip_prefixes;

  IF p_ip IS NOT NULL AND p_ip <> '' THEN
    FOREACH v_ip_prefix_rule IN ARRAY v_blocked_ip_prefixes LOOP
      IF v_ip_prefix_rule <> '' AND p_ip LIKE v_ip_prefix_rule || '%' THEN
        RETURN QUERY SELECT false, 'SIGNUP_DISABLED'::text, 'blocked_ip_prefix'::text;
        RETURN;
      END IF;
    END LOOP;
  END IF;

  IF p_ip IS NULL OR p_ip = '' THEN
    v_ip_prefix := 'unknown';
  ELSIF p_ip LIKE '%.%.%.%' THEN
    v_ip_prefix := split_part(p_ip, '.', 1) || '.' || split_part(p_ip, '.', 2) || '.' || split_part(p_ip, '.', 3) || '.0/24';
  ELSIF p_ip LIKE '%:%' THEN
    v_ip_prefix := split_part(p_ip, ':', 1) || ':' || split_part(p_ip, ':', 2) || ':' || split_part(p_ip, ':', 3) || ':' || split_part(p_ip, ':', 4) || '::/64';
  ELSE
    v_ip_prefix := p_ip;
  END IF;

  SELECT public.consume_rate_limit(
    'signup:ip:' || COALESCE(v_ip_prefix, 'unknown'),
    v_ip_limit,
    300
  )
  INTO v_ip_allowed;

  IF COALESCE(v_ip_allowed, false) = false THEN
    RETURN QUERY SELECT false, 'RATE_LIMITED'::text, 'ip_rate_limited'::text;
    RETURN;
  END IF;

  SELECT public.consume_rate_limit(
    'signup:phone:' || v_phone_digits,
    v_phone_limit,
    3600
  )
  INTO v_phone_allowed;

  IF COALESCE(v_phone_allowed, false) = false THEN
    RETURN QUERY SELECT false, 'RATE_LIMITED'::text, 'phone_rate_limited'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION security.evaluate_signup_guard_v1(text, public.app_role, text, text)
TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.evaluate_signup_guard_v1(
  p_request_id text,
  p_role public.app_role,
  p_phone text,
  p_ip text DEFAULT NULL
)
RETURNS TABLE (
  allowed boolean,
  error_code text,
  reason text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, security
AS $$
  SELECT *
  FROM security.evaluate_signup_guard_v1(
    p_request_id,
    p_role,
    p_phone,
    p_ip
  );
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_signup_guard_v1(text, public.app_role, text, text)
TO authenticated, anon;
