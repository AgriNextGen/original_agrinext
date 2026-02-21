-- 202602211030_stage_5_6_dispute_admin_rpcs.sql
-- RPC to count disputes with filters (server-side totals)

CREATE OR REPLACE FUNCTION admin.count_disputes_v1(p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_where text := '1=1';
  v_sql text;
  v_count int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  IF p_filters ? 'status' THEN v_where := v_where || format(' AND status = %L', p_filters->>'status'); END IF;
  IF p_filters ? 'category' THEN v_where := v_where || format(' AND category = %L', p_filters->>'category'); END IF;
  IF p_filters ? 'entity_type' THEN v_where := v_where || format(' AND entity_type = %L', p_filters->>'entity_type'); END IF;

  v_sql := format('SELECT count(*) FROM public.disputes WHERE %s', v_where);
  EXECUTE v_sql INTO v_count;
  RETURN COALESCE(v_count,0);
END;
$$;

GRANT EXECUTE ON FUNCTION admin.count_disputes_v1(jsonb) TO authenticated;

