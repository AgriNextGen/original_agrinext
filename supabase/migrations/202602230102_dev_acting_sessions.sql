-- Create acting sessions for impersonation
CREATE TABLE IF NOT EXISTS public.dev_acting_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_user_id uuid REFERENCES auth.users(id) NOT NULL,
  acting_as_user_id uuid REFERENCES auth.users(id) NOT NULL,
  acting_as_role text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  note text
);

ALTER TABLE public.dev_acting_sessions ENABLE ROW LEVEL SECURITY;

-- Prevent direct client insert/update; require Edge Functions/service role
DROP POLICY IF EXISTS dev_act_create_edge_only ON public.dev_acting_sessions;
CREATE POLICY dev_act_create_edge_only ON public.dev_acting_sessions
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS dev_act_update_edge_only ON public.dev_acting_sessions;
CREATE POLICY dev_act_update_edge_only ON public.dev_acting_sessions
  FOR UPDATE USING (false);

-- Developer can read their own sessions
DROP POLICY IF EXISTS dev_act_select_owner ON public.dev_acting_sessions;
CREATE POLICY dev_act_select_owner ON public.dev_acting_sessions
  FOR SELECT USING (developer_user_id = auth.uid());

-- Admin can read all
DROP POLICY IF EXISTS dev_act_select_admin ON public.dev_acting_sessions;
CREATE POLICY dev_act_select_admin ON public.dev_acting_sessions
  FOR SELECT USING (public.is_admin());

-- Revoke public access
REVOKE ALL ON public.dev_acting_sessions FROM public;
