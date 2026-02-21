-- Create developer allowlist table
CREATE TABLE IF NOT EXISTS public.dev_allowlist (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.dev_allowlist ENABLE ROW LEVEL SECURITY;

-- Admin-only management policy
CREATE POLICY IF NOT EXISTS dev_allowlist_admin_manage ON public.dev_allowlist
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Allow users to read their own allowlist entry (so Edge functions can verify caller without admin)
CREATE POLICY IF NOT EXISTS dev_allowlist_select_owner ON public.dev_allowlist
  FOR SELECT USING (user_id = auth.uid());

-- Revoke public access
REVOKE ALL ON public.dev_allowlist FROM public;

