-- supabase/migrations/202602201310_phase_5_1_job_system_rpcs.sql
-- RPCs for job queue: enqueue, worker fetch/lock, job update

-- enqueue_job_v1
CREATE OR REPLACE FUNCTION public.enqueue_job_v1(
  p_job_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_run_at timestamptz DEFAULT now(),
  p_idempotency_key text DEFAULT NULL,
  p_priority int DEFAULT 100,
  p_max_attempts int DEFAULT 5
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_id uuid;
  v_existing uuid;
  v_req uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.job_queue
      WHERE job_type = p_job_type AND idempotency_key = p_idempotency_key AND status IN ('queued','running')
      LIMIT 1;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  INSERT INTO public.job_queue(job_type, payload, run_at, idempotency_key, priority, max_attempts)
  VALUES (p_job_type, p_payload, p_run_at, p_idempotency_key, p_priority, p_max_attempts)
  RETURNING id INTO v_id;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(v_req, 'job', v_id, 'JOB_ENQUEUED', auth.uid(), NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('job_type', p_job_type, 'idempotency_key', p_idempotency_key));

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_job_v1(text,jsonb,timestamptz,text,int,int) TO authenticated;

-- worker_fetch_and_lock_jobs_v1
CREATE OR REPLACE FUNCTION public.worker_fetch_and_lock_jobs_v1(p_worker_id text, p_limit int DEFAULT 25)
RETURNS SETOF public.job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  r public.job_queue%ROWTYPE;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  FOR r IN
    SELECT * FROM public.job_queue
    WHERE status = 'queued' AND run_at <= now()
    ORDER BY priority ASC, run_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.job_queue SET status = 'running', locked_at = now(), locked_by = p_worker_id, attempts = attempts + 1, updated_at = now()
    WHERE id = r.id;
    RETURN NEXT (SELECT * FROM public.job_queue WHERE id = r.id);
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.worker_fetch_and_lock_jobs_v1(text,int) TO authenticated;

-- job_update_after_attempt_v1
CREATE OR REPLACE FUNCTION public.job_update_after_attempt_v1(
  p_job_id uuid,
  p_status text,
  p_attempts int,
  p_next_run_at timestamptz,
  p_last_error text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE v_req uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  UPDATE public.job_queue
  SET status = p_status,
      attempts = p_attempts,
      run_at = COALESCE(p_next_run_at, run_at),
      last_error = p_last_error,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = now()
  WHERE id = p_job_id;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(v_req, 'job', p_job_id, 'JOB_UPDATED', auth.uid(), NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('status', p_status, 'attempts', p_attempts, 'error', p_last_error));
END;
$$;

GRANT EXECUTE ON FUNCTION public.job_update_after_attempt_v1(uuid,text,int,timestamptz,text) TO authenticated;

