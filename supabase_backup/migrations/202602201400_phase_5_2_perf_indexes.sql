-- supabase/migrations/202602201400_phase_5_2_perf_indexes.sql
-- Phase 5.2: performance indexes & lightweight perf view (additive)

-- 1) audit.workflow_events index (entity timeline)
CREATE INDEX IF NOT EXISTS idx_audit_workflow_entity_created_at
  ON audit.workflow_events (entity_type, entity_id, created_at DESC);

-- 2) notifications index (if notifications table exists)
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications (user_id, created_at DESC);
  END IF;
END$$;

-- 3) market_orders indexing (buyer/listing + updated_at)
DO $$
BEGIN
  IF to_regclass('public.market_orders') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_market_orders_buyer_status_updated ON public.market_orders (buyer_id, status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_market_orders_listing_status_updated ON public.market_orders (listing_id, status, updated_at DESC);
  END IF;
END$$;

-- 4) listings
DO $$
BEGIN
  IF to_regclass('public.listings') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_listings_status_updated ON public.listings (status, updated_at DESC);
  END IF;
END$$;

-- 5) trips / transport_requests
DO $$
BEGIN
  IF to_regclass('public.trips') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_trips_transporter_status_updated ON public.trips (transporter_id, status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_trips_transport_request ON public.trips (transport_request_id);
  END IF;

  IF to_regclass('public.transport_requests') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_transport_requests_farmer_status_updated ON public.transport_requests (farmer_id, status, updated_at DESC);
  END IF;
END$$;

-- 6) agent tables
DO $$
BEGIN
  IF to_regclass('public.agent_tasks') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_status_updated ON public.agent_tasks (agent_id, status, updated_at DESC);
  END IF;

  IF to_regclass('public.agent_visits') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_agent_visits_agent_created ON public.agent_visits (agent_id, created_at DESC);
  END IF;
END$$;

-- 7) files
DO $$
BEGIN
  IF to_regclass('public.files') IS NOT NULL AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='files' AND column_name='owner_user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_files_owner_created ON public.files (owner_user_id, created_at DESC);
  END IF;
END$$;

-- 8) Lightweight analytics view (admin-only) for perf hotspots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_views WHERE schemaname = 'analytics' AND viewname = 'perf_hotspots_v') THEN
    CREATE SCHEMA IF NOT EXISTS analytics;
    CREATE VIEW analytics.perf_hotspots_v AS
    SELECT
      w.entity_type,
      COUNT(*) FILTER (WHERE w.created_at >= now() - INTERVAL '7 days') AS cnt_7d,
      COUNT(*) FILTER (WHERE w.created_at >= now() - INTERVAL '1 day') AS cnt_1d
    FROM audit.workflow_events w
    GROUP BY w.entity_type
    ORDER BY cnt_7d DESC;
  END IF;
END$$;

