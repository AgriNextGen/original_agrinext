-- supabase/migrations/202602201300_phase_5_1_job_system.sql
-- Phase 5.1: Background Job Queue + Worker System (additive)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) job_queue table
CREATE TABLE IF NOT EXISTS public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz NULL,
  locked_by text NULL,
  last_error text NULL,
  idempotency_key text NULL,
  priority int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_status_runat ON public.job_queue(status, run_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_jobtype_status ON public.job_queue(job_type, status);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority_runat ON public.job_queue(priority, run_at);

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.job_queue ADD CONSTRAINT uq_job_type_idempotency UNIQUE (job_type, idempotency_key);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

-- 1.2) job_runs table
CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  processed_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.touch_updated_at_jobs()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_job_queue_touch ON public.job_queue;
CREATE TRIGGER trg_job_queue_touch BEFORE UPDATE ON public.job_queue FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_jobs();

-- 2) RLS: enable and policies
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.job_queue FROM PUBLIC, authenticated, anon;
REVOKE ALL ON public.job_runs FROM PUBLIC, authenticated, anon;

-- job_queue policies
CREATE POLICY job_queue_select_admin ON public.job_queue FOR SELECT USING (public.is_admin());
CREATE POLICY job_queue_insert_rpc ON public.job_queue FOR INSERT WITH CHECK ((current_setting('app.rpc', true) = 'true') OR public.is_admin());
CREATE POLICY job_queue_update_rpc ON public.job_queue FOR UPDATE USING ((current_setting('app.rpc', true) = 'true') OR public.is_admin());
CREATE POLICY job_queue_delete_admin ON public.job_queue FOR DELETE USING (public.is_admin());

-- job_runs policies
CREATE POLICY job_runs_select_admin ON public.job_runs FOR SELECT USING (public.is_admin());
CREATE POLICY job_runs_insert_rpc ON public.job_runs FOR INSERT WITH CHECK ((current_setting('app.rpc', true) = 'true') OR public.is_admin());
CREATE POLICY job_runs_update_rpc ON public.job_runs FOR UPDATE USING ((current_setting('app.rpc', true) = 'true') OR public.is_admin());

COMMENT ON TABLE public.job_queue IS 'Application job queue. Enqueue via public.enqueue_job_v1 or service role.';
COMMENT ON TABLE public.job_runs IS 'Worker run records.';

