-- Phase F1: observability helpers and analytics views

-- 1) request id generator
CREATE OR REPLACE FUNCTION public.new_request_id_v1()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT gen_random_uuid();
$$;

-- 2) analytics.recent_errors_v view (last 50 security/error events)
DO $$
DECLARE
  has_actor boolean := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'audit' AND table_name = 'security_events' AND column_name = 'actor_user_id'
  );
  has_request boolean := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'audit' AND table_name = 'security_events' AND column_name = 'request_id'
  );
  has_payload boolean := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'audit' AND table_name = 'security_events' AND column_name = 'payload'
  );
  sql text;
BEGIN
  sql := 'CREATE OR REPLACE VIEW analytics.recent_errors_v AS SELECT se.id::text AS event_id, ';
  sql := sql || (CASE WHEN has_actor THEN 'se.actor_user_id' ELSE 'NULL::uuid' END) || ' AS actor_user_id, ';
  sql := sql || (CASE WHEN has_request THEN 'se.request_id' ELSE 'NULL::uuid' END) || ' AS request_id, ';
  sql := sql || (CASE WHEN has_payload THEN '(se.payload->>''endpoint'')::text' ELSE 'NULL::text' END) || ' as endpoint, se.event_type, se.created_at FROM audit.security_events se ORDER BY se.created_at DESC LIMIT 50';
  EXECUTE sql;
END$$;

-- 3) analytics.data_quality_v view (union of checks)
CREATE OR REPLACE VIEW analytics.data_quality_v AS
SELECT 'users_missing_profile_fields' as check_name,
       jsonb_build_object(
         'count', count(*),
         'sample', (
           SELECT jsonb_agg(jsonb_build_object('user_id', s.id, 'phone', s.phone))
           FROM (
             SELECT p2.id, p2.phone
             FROM public.profiles p2
             WHERE (p2.phone IS NULL OR p2.full_name IS NULL)
             ORDER BY p2.created_at DESC
             LIMIT 10
           ) s
         )
       ) as details
FROM public.profiles p
WHERE (p.phone IS NULL OR p.full_name IS NULL)
UNION ALL
SELECT 'orphan_files', jsonb_build_object('count', count(*), 'sample', jsonb_agg(s.name) )
FROM storage.objects s
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE s.metadata->>'user_id' = p.id::text)
UNION ALL
SELECT 'trips_stuck_over_24h', jsonb_build_object('count', count(*), 'sample', jsonb_agg(t.id) )
FROM public.trips t
WHERE t.status NOT IN ('completed','cancelled') AND t.created_at < now() - interval '24 hours'
UNION ALL
SELECT 'orders_pending_over_48h', jsonb_build_object('count', count(*), 'sample', jsonb_agg(o.id) )
FROM public.market_orders o
WHERE o.status NOT IN ('delivered','cancelled') AND o.created_at < now() - interval '48 hours';
