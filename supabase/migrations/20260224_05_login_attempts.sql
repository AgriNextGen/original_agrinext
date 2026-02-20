-- Create login_attempts table for tracking failed/successful login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  ip_prefix text,
  attempt_time timestamptz DEFAULT now(),
  success boolean
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_phone_time ON public.login_attempts(phone, attempt_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts(ip_prefix, attempt_time DESC);

