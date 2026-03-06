-- Migration: Unlock 4 permanently-locked demo accounts
-- These accounts were locked via brute-force trigger during testing.
-- The trigger (trg_profiles_block_security_updates) blocks direct updates
-- unless app.rpc = 'true' is set or the caller is is_admin().
-- We bypass via SET LOCAL app.rpc = 'true' within a transaction.

DO $$
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  UPDATE public.profiles
  SET account_status = 'active',
      blocked_until  = NULL
  WHERE id IN (
    '40c76d46-5fea-413a-ae2b-234fe5486e90',
    'eb33d43c-e84d-474b-863a-84152fd070bd',
    'cd3770cd-6b19-4e8b-b1ad-ea01348be84e',
    '226162e4-33be-4458-9d47-cb596018ca8c'
  )
  AND (account_status != 'active' OR blocked_until > NOW());

  RAISE NOTICE 'Unlocked locked demo accounts';
END;
$$;
