BEGIN;

-- Harden enqueue_job_v1:
-- - allow service_role for internal schedulers/workers/edge functions
-- - allow authenticated users only for explicitly safe user-originated jobs
-- - require admin for all other job types
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
  v_role text := COALESCE(auth.role(), '');
  v_is_admin boolean := false;
  v_user_safe_jobs constant text[] := ARRAY[
    'ai_search_intent_v1',
    'ai_ticket_triage_v1'
  ];
BEGIN
  IF v_role = 'service_role' THEN
    -- internal callers are allowed
    NULL;
  ELSIF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  ELSE
    v_is_admin := public.is_admin();
    IF NOT v_is_admin AND NOT (p_job_type = ANY(v_user_safe_jobs)) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  PERFORM set_config('app.rpc','true', true);

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.job_queue
    WHERE job_type = p_job_type
      AND idempotency_key = p_idempotency_key
      AND status IN ('queued','running')
    LIMIT 1;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  INSERT INTO public.job_queue(job_type, payload, run_at, idempotency_key, priority, max_attempts)
  VALUES (p_job_type, p_payload, p_run_at, p_idempotency_key, p_priority, p_max_attempts)
  RETURNING id INTO v_id;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(
    v_req, 'job', v_id, 'JOB_ENQUEUED',
    auth.uid(), NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('job_type', p_job_type, 'idempotency_key', p_idempotency_key, 'auth_role', v_role)
  );

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_job_v1(text,jsonb,timestamptz,text,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_job_v1(text,jsonb,timestamptz,text,int,int) TO service_role;

-- Worker internals must be service_role (or admin for manual break-glass SQL)
CREATE OR REPLACE FUNCTION public.worker_fetch_and_lock_jobs_v1(p_worker_id text, p_limit int DEFAULT 25)
RETURNS SETOF public.job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  r public.job_queue%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  FOR r IN
    SELECT * FROM public.job_queue
    WHERE status = 'queued' AND run_at <= now()
    ORDER BY priority ASC, run_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.job_queue
    SET status = 'running', locked_at = now(), locked_by = p_worker_id, attempts = attempts + 1, updated_at = now()
    WHERE id = r.id;
    RETURN NEXT (SELECT * FROM public.job_queue WHERE id = r.id);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.worker_fetch_and_lock_jobs_v1(text,int) FROM public;
REVOKE EXECUTE ON FUNCTION public.worker_fetch_and_lock_jobs_v1(text,int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.worker_fetch_and_lock_jobs_v1(text,int) TO service_role;

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
DECLARE
  v_req uuid;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

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
  PERFORM audit.log_workflow_event_v1(
    v_req, 'job', p_job_id, 'JOB_UPDATED',
    auth.uid(), NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('status', p_status, 'attempts', p_attempts, 'error', p_last_error, 'auth_role', auth.role())
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.job_update_after_attempt_v1(uuid,text,int,timestamptz,text) FROM public;
REVOKE EXECUTE ON FUNCTION public.job_update_after_attempt_v1(uuid,text,int,timestamptz,text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.job_update_after_attempt_v1(uuid,text,int,timestamptz,text) TO service_role;

-- Webhook apply RPCs must be service_role (or admin), not public and not custom app.webhook flags alone
CREATE OR REPLACE FUNCTION public.payment_apply_webhook_event_v1(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payment_order_id text,
  p_payment_id text,
  p_order_id uuid,
  p_status text,
  p_amount numeric,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_event_id uuid;
  v_of secure.order_financials%ROWTYPE;
  v_req uuid;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Webhook calls are not allowed in this session';
  END IF;

  BEGIN
    INSERT INTO secure.webhook_events(provider, event_id, event_type, payload, received_at)
    VALUES (p_provider, p_event_id, p_event_type, COALESCE(p_payload, '{}'::jsonb), now())
    ON CONFLICT (provider, event_id) DO NOTHING
    RETURNING id INTO v_event_id;
  EXCEPTION WHEN others THEN
    v_event_id := NULL;
  END;

  IF v_event_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM set_config('app.rpc','true', true);

  INSERT INTO secure.payment_events(user_id, order_id, event_type, provider, provider_payment_id, amount, status, metadata, created_at)
  VALUES (NULL, p_order_id, p_event_type, p_provider, p_payment_id, COALESCE(p_amount, 0)::numeric(12,2), p_status, COALESCE(p_payload, '{}'::jsonb), now())
  RETURNING id INTO v_event_id;

  IF p_order_id IS NOT NULL THEN
    SELECT * INTO v_of FROM secure.order_financials WHERE order_id = p_order_id FOR UPDATE;
    UPDATE secure.order_financials
    SET payment_status = CASE WHEN lower(p_status) = 'captured' THEN 'captured' WHEN lower(p_status) = 'refunded' THEN 'refunded' WHEN lower(p_status) = 'failed' THEN 'failed' ELSE payment_status END,
        last_payment_event_id = v_event_id,
        updated_at = now()
    WHERE order_id = p_order_id;

    UPDATE public.market_orders
    SET payment_status = CASE
        WHEN lower(p_status) = 'captured' THEN 'captured'
        WHEN lower(p_status) = 'failed' THEN 'failed'
        WHEN lower(p_status) = 'refunded' THEN 'refunded'
        ELSE payment_status
      END,
      payment_provider = COALESCE(payment_provider, p_provider),
      payment_order_id = COALESCE(payment_order_id, p_payment_order_id),
      payment_id = COALESCE(payment_id, p_payment_id),
      payment_captured_at = CASE WHEN lower(p_status) = 'captured' THEN now() ELSE payment_captured_at END,
      updated_at = now()
    WHERE id = p_order_id;

    v_req := audit.new_request_id_v1();
    IF lower(p_status) = 'captured' THEN
      PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_CAPTURED', NULL, NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_payment_id', p_payment_id));
    ELSIF lower(p_status) = 'failed' THEN
      PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_FAILED', NULL, NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_payment_id', p_payment_id));
    ELSIF lower(p_status) = 'refunded' THEN
      PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_REFUNDED', NULL, NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_payment_id', p_payment_id));
    ELSE
      PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_EVENT', NULL, NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_event_id', p_event_id, 'raw_status', p_status));
    END IF;
  END IF;

  UPDATE secure.webhook_events SET processing_status = 'processed', processed_at = now() WHERE id = v_event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_apply_webhook_event_v1(text,text,text,text,text,uuid,text,numeric,jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.payment_apply_webhook_event_v1(text,text,text,text,text,uuid,text,numeric,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.payment_apply_webhook_event_v1(text,text,text,text,text,uuid,text,numeric,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION secure.apply_gateway_state_v1(
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payment_order_id text,
  p_payment_id text,
  p_order_id uuid,
  p_status text,
  p_amount numeric,
  p_payload jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = secure, public, audit
AS $$
DECLARE
  v_event_uuid uuid;
  v_existing uuid;
  v_of secure.order_financials%ROWTYPE;
  v_req uuid := audit.new_request_id_v1();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  BEGIN
    INSERT INTO secure.webhook_events(provider, event_id, event_type, payload, received_at)
    VALUES (p_provider, p_event_id, p_event_type, COALESCE(p_payload, '{}'::jsonb), now())
    ON CONFLICT (provider, event_id) DO UPDATE SET payload = COALESCE(excluded.payload, secure.webhook_events.payload) RETURNING id INTO v_event_uuid;
  EXCEPTION WHEN others THEN
    v_event_uuid := NULL;
  END;

  IF v_event_uuid IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_existing FROM secure.payment_events WHERE provider = p_provider AND provider_payment_id = p_payment_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    UPDATE secure.webhook_events SET processing_status = 'processed', processed_at = now() WHERE id = v_event_uuid;
    RETURN;
  END IF;

  INSERT INTO secure.payment_events(user_id, order_id, event_type, provider, provider_payment_id, amount, status, metadata, created_at)
  VALUES (NULL, p_order_id, p_event_type, p_provider, p_payment_id, COALESCE(p_amount,0)::numeric(12,2), p_status, COALESCE(p_payload,'{}'::jsonb), now())
  RETURNING id INTO v_event_uuid;

  IF p_order_id IS NOT NULL THEN
    SELECT * INTO v_of FROM secure.order_financials WHERE order_id = p_order_id FOR UPDATE;
    IF FOUND THEN
      UPDATE secure.order_financials
      SET payment_status = CASE WHEN lower(p_status) = 'captured' THEN 'captured' WHEN lower(p_status) = 'refunded' THEN 'refunded' WHEN lower(p_status) = 'failed' THEN 'failed' ELSE payment_status END,
          last_payment_event_id = v_event_uuid,
          updated_at = now()
      WHERE order_id = p_order_id;
    END IF;

    UPDATE public.market_orders
    SET payment_status = CASE
        WHEN lower(p_status) = 'captured' THEN 'captured'
        WHEN lower(p_status) = 'failed' THEN 'failed'
        WHEN lower(p_status) = 'refunded' THEN 'refunded'
        ELSE payment_status
      END,
      payment_provider = COALESCE(payment_provider, p_provider),
      payment_order_id = COALESCE(payment_order_id, p_payment_order_id),
      payment_id = COALESCE(payment_id, p_payment_id),
      payment_captured_at = CASE WHEN lower(p_status) = 'captured' THEN now() ELSE payment_captured_at END,
      updated_at = now()
    WHERE id = p_order_id;

    IF lower(p_status) = 'captured' THEN
      PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_CAPTURED', NULL, NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_payment_id', p_payment_id));
    ELSIF lower(p_status) = 'failed' THEN
      PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_FAILED', NULL, NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_payment_id', p_payment_id));
    ELSIF lower(p_status) = 'refunded' THEN
      PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_REFUNDED', NULL, NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_payment_id', p_payment_id));
    ELSE
      PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_EVENT', NULL, NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_event_id', p_event_id, 'raw_status', p_status));
    END IF;
  END IF;

  UPDATE secure.webhook_events SET processing_status = 'processed', processed_at = now() WHERE id = v_event_uuid;
END;
$$;

REVOKE EXECUTE ON FUNCTION secure.apply_gateway_state_v1(text,text,text,text,text,uuid,text,numeric,jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION secure.apply_gateway_state_v1(text,text,text,text,text,uuid,text,numeric,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION secure.apply_gateway_state_v1(text,text,text,text,text,uuid,text,numeric,jsonb) TO service_role;

COMMIT;
