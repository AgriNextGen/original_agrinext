-- Migration: create dev_role_overrides table for developer role switching
BEGIN;

CREATE TABLE IF NOT EXISTS public.dev_role_overrides (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_role public.app_role NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 hours'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dev_role_overrides_expires_at ON public.dev_role_overrides (expires_at);

-- Trigger to keep updated_at current on UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at_dev_role_overrides()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_dev_role_overrides ON public.dev_role_overrides;
CREATE TRIGGER trg_set_updated_at_dev_role_overrides
BEFORE UPDATE ON public.dev_role_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_dev_role_overrides();

-- Enable Row Level Security and deny client access. Only service role (Edge Functions) may modify via service key.
ALTER TABLE public.dev_role_overrides ENABLE ROW LEVEL SECURITY;

-- Deny all access for authenticated/anonymous roles by creating policies that return false.
CREATE POLICY IF NOT EXISTS p_no_select ON public.dev_role_overrides FOR SELECT USING (false);
CREATE POLICY IF NOT EXISTS p_no_insert ON public.dev_role_overrides FOR INSERT WITH CHECK (false);
CREATE POLICY IF NOT EXISTS p_no_update ON public.dev_role_overrides FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY IF NOT EXISTS p_no_delete ON public.dev_role_overrides FOR DELETE USING (false);

COMMIT;

