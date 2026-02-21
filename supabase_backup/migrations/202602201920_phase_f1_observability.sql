-- Phase F1: observability helpers and analytics views

-- 1) request id generator
CREATE OR REPLACE FUNCTION public.new_request_id_v1()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT gen_random_uuid();
$$;

-- 2) analytics.recent_errors_v view (last 50 security/error events)
CREATE OR REPLACE VIEW analytics.recent_errors_v AS
SELECT
  se.id::text AS event_id,
  se.actor_user_id,
  se.request_id,
  (se.payload->>'endpoint')::text as endpoint,
  se.event_type,
  se.created_at
FROM audit.security_events se
ORDER BY se.created_at DESC
LIMIT 50;

-- 3) analytics.data_quality_v view (union of checks)
CREATE OR REPLACE VIEW analytics.data_quality_v AS
SELECT 'users_missing_profile_fields' as check_name, jsonb_build_object('count', count(*), 'sample', jsonb_agg(jsonb_build_object('user_id', p.user_id, 'phone', p.phone) ORDER BY p.created_at DESC LIMIT 10)) as details
FROM public.profiles p
WHERE (p.phone IS NULL OR p.name IS NULL)
UNION ALL
SELECT 'orphan_files', jsonb_build_object('count', count(*), 'sample', jsonb_agg(s.path) )
FROM storage.objects s
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE s.metadata->>'user_id' = p.user_id::text)
UNION ALL
SELECT 'trips_stuck_over_24h', jsonb_build_object('count', count(*), 'sample', jsonb_agg(t.id) )
FROM public.trips t
WHERE t.status NOT IN ('completed','cancelled') AND t.created_at < now() - interval '24 hours'
UNION ALL
SELECT 'orders_pending_over_48h', jsonb_build_object('count', count(*), 'sample', jsonb_agg(o.id) )
FROM public.market_orders o
WHERE o.status NOT IN ('delivered','cancelled') AND o.created_at < now() - interval '48 hours';

