-- Helper to return current profile id from request.jwt.claim.profile_id
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid LANGUAGE plpgsql STABLE AS $$
DECLARE
  claim_profile text;
BEGIN
  BEGIN
    claim_profile := current_setting('request.jwt.claim.profile_id', true);
  EXCEPTION WHEN OTHERS THEN
    claim_profile := NULL;
  END;

  IF claim_profile IS NOT NULL AND char_length(claim_profile) > 0 THEN
    RETURN claim_profile::uuid;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

