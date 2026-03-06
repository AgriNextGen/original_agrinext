-- P0 SECURITY: Fix profiles_self_update to prevent privilege escalation
-- 1. Drop insecure policy (no WITH CHECK, no column restriction)
-- 2. Add BEFORE UPDATE trigger to block changes to security/system columns
-- 3. Recreate policy with USING + WITH CHECK (id = auth.uid())

CREATE OR REPLACE FUNCTION public.profiles_block_security_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if current user is not admin (admin path can change these via other means)
  IF (current_setting('app.rpc', true) = 'true') THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Block user self-updates to security/system columns
  IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;
  IF OLD.risk_score IS DISTINCT FROM NEW.risk_score THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;
  IF OLD.blocked_until IS DISTINCT FROM NEW.blocked_until THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_block_security_updates ON public.profiles;
CREATE TRIGGER trg_profiles_block_security_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_security_column_updates();

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
