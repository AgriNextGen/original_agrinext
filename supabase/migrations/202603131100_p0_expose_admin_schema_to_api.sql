-- P0: Expose admin schema to PostgREST API
-- The frontend calls admin.* RPCs (entity_360_v1, list_tickets_v1, etc.)
-- but neither anon nor authenticated have USAGE on the admin schema.
-- All admin functions are SECURITY DEFINER with internal is_admin() guards,
-- so granting EXECUTE is safe — non-admins get a FORBIDDEN error from the function body.

GRANT USAGE ON SCHEMA admin TO authenticated;
GRANT USAGE ON SCHEMA admin TO anon;

-- Grant EXECUTE on all existing admin functions to authenticated role
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'admin'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.sig);
  END LOOP;
END
$$;

-- Set default privileges so future admin functions are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA admin
  GRANT EXECUTE ON FUNCTIONS TO authenticated;
