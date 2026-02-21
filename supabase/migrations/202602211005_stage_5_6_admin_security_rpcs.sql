-- 202602211005_stage_5_6_admin_security_rpcs.sql
-- RPCs for admin to list security events (paginated)

CREATE OR REPLACE FUNCTION admin.list_security_events_v1(
  p_actor_id uuid,
  p_limit int DEFAULT 20,
  p_cursor timestamptz DEFAULT NULL
) RETURNS TABLE(id uuid, created_at timestamptz, event_type text, severity text, metadata jsonb)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = audit, public
AS $$
DECLARE
  v_limit int := GREATEST(1, LEAST(p_limit, 100));
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  RETURN QUERY
    SELECT id, created_at, event_type, severity, metadata
    FROM audit.security_events
    WHERE actor_user_id = p_actor_id
      AND (p_cursor IS NULL OR created_at < p_cursor)
    ORDER BY created_at DESC
    LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION admin.list_security_events_v1(uuid,int,timestamptz) TO authenticated;

