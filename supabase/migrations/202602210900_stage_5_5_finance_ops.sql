-- supabase/migrations/202602210900_stage_5_5_finance_ops.sql
-- Stage 5.5: Finance Ops (additive)
-- Adds refund_requests, payout_jobs, webhook retry bookkeeping, admin RPCs, and analytics rollup

CREATE SCHEMA IF NOT EXISTS secure;

-- 1.2 Create secure.refund_requests
CREATE TABLE IF NOT EXISTS secure.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.market_orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'razorpay',
  provider_payment_id text NULL,
  provider_refund_id text NULL,
  amount numeric(14,2) NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  requested_by uuid NULL REFERENCES auth.users(id),
  approved_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  BEGIN
    ALTER TABLE secure.refund_requests ADD CONSTRAINT refund_requests_status_check CHECK (status IN ('requested','approved','initiated','completed','failed','rejected'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

CREATE INDEX IF NOT EXISTS idx_refund_requests_order ON secure.refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON secure.refund_requests(status, updated_at DESC);

ALTER TABLE secure.refund_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON secure.refund_requests FROM PUBLIC, authenticated, anon;
CREATE POLICY refund_requests_select_admin ON secure.refund_requests FOR SELECT USING (public.is_admin());
CREATE POLICY refund_requests_insert_rpc ON secure.refund_requests FOR INSERT WITH CHECK ((current_setting('app.rpc', true) = 'true') OR public.is_admin());
CREATE POLICY refund_requests_update_rpc ON secure.refund_requests FOR UPDATE USING ((current_setting('app.rpc', true) = 'true') OR public.is_admin());

-- 1.3 Create secure.payout_jobs
CREATE TABLE IF NOT EXISTS secure.payout_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.market_orders(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES auth.users(id),
  provider text NOT NULL DEFAULT 'manual',
  amount numeric(14,2) NOT NULL,
  reference_id text NULL,
  status text NOT NULL DEFAULT 'queued',
  error text NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  BEGIN
    ALTER TABLE secure.payout_jobs ADD CONSTRAINT payout_jobs_status_check CHECK (status IN ('queued','initiated','success','failed','cancelled'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

CREATE INDEX IF NOT EXISTS idx_payout_jobs_order ON secure.payout_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_payout_jobs_status ON secure.payout_jobs(status, updated_at DESC);

ALTER TABLE secure.payout_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON secure.payout_jobs FROM PUBLIC, authenticated, anon;
CREATE POLICY payout_jobs_select_admin ON secure.payout_jobs FOR SELECT USING (public.is_admin());
CREATE POLICY payout_jobs_insert_rpc ON secure.payout_jobs FOR INSERT WITH CHECK ((current_setting('app.rpc', true) = 'true') OR public.is_admin());
CREATE POLICY payout_jobs_update_rpc ON secure.payout_jobs FOR UPDATE USING ((current_setting('app.rpc', true) = 'true') OR public.is_admin());

-- 1.4 Enhance secure.webhook_events for retry bookkeeping (idempotent)
ALTER TABLE secure.webhook_events
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS last_error text NULL,
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz NULL;

DO $$
BEGIN
  BEGIN
    ALTER TABLE secure.webhook_events ADD CONSTRAINT webhook_processing_status_check CHECK (processing_status IN ('received','processed','ignored','failed'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_next_retry ON secure.webhook_events(processing_status, next_retry_at);

ALTER TABLE secure.webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON secure.webhook_events FROM PUBLIC, authenticated, anon;
-- keep existing policies (select/insert/update via admin or app.rpc)

-- 1.6 Analytics: ensure analytics.finance_daily exists (additive)
CREATE SCHEMA IF NOT EXISTS analytics;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='analytics' AND table_name='finance_daily') THEN
    CREATE TABLE analytics.finance_daily (
      day date PRIMARY KEY,
      payments_initiated_count int NOT NULL DEFAULT 0,
      payments_captured_count int NOT NULL DEFAULT 0,
      payments_failed_count int NOT NULL DEFAULT 0,
      refunds_count int NOT NULL DEFAULT 0,
      refunds_amount numeric(18,2) NOT NULL DEFAULT 0,
      payouts_queued_count int NOT NULL DEFAULT 0,
      payouts_success_count int NOT NULL DEFAULT 0,
      payout_pending_kyc_count int NOT NULL DEFAULT 0,
      gmv_captured numeric(18,2) NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_analytics_finance_daily_day ON analytics.finance_daily(day);

-- ====================================================
-- 2) RPCs: admin & secure (security definer; audit)
-- ====================================================

-- admin.create_ops_item_v1 (wrapper over admin.build_ops_inbox_item_v1)
CREATE OR REPLACE FUNCTION admin.create_ops_item_v1(
  p_item_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_severity text DEFAULT 'medium',
  p_summary text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_id uuid;
  v_req uuid := audit.new_request_id_v1();
BEGIN
  IF NOT (public.is_admin() OR current_setting('app.rpc', true) = 'true') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  PERFORM set_config('app.rpc','true', true);

  v_id := admin.build_ops_inbox_item_v1(p_item_type, p_entity_type, p_entity_id, p_severity, p_summary, p_metadata);

  PERFORM audit.log_admin_action_v1(v_req, 'OPS_ITEM_CREATED', auth.uid(), 'admin', NULL, p_entity_type, p_entity_id, p_summary, NULL, jsonb_build_object('item_type', p_item_type, 'severity', p_severity), NULL, NULL, p_metadata);
  PERFORM audit.log_workflow_event_v1(v_req, 'ops_item', v_id, 'OPS_ITEM_CREATED', auth.uid(), 'admin', NULL, NULL, p_entity_id, NULL, NULL, jsonb_build_object('item_type', p_item_type));

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin.create_ops_item_v1(text,text,uuid,text,text,jsonb) TO authenticated;

-- admin.resolve_ops_item_v1
CREATE OR REPLACE FUNCTION admin.resolve_ops_item_v1(
  p_item_id uuid,
  p_resolution_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_old jsonb;
  v_req uuid := audit.new_request_id_v1();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT row_to_json(t) INTO v_old FROM (SELECT id, status, metadata FROM public.ops_inbox_items WHERE id = p_item_id) t;
  UPDATE public.ops_inbox_items
  SET status = 'resolved',
      metadata = jsonb_set(COALESCE(metadata,'{}'::jsonb), '{resolution_history}', COALESCE(metadata->'resolution_history','[]'::jsonb) || jsonb_build_object('resolved_by', auth.uid(), 'note', p_resolution_note, 'at', now()), true),
      updated_at = now()
  WHERE id = p_item_id;

  PERFORM audit.log_admin_action_v1(v_req, 'OPS_ITEM_RESOLVED', auth.uid(), 'admin', NULL, 'ops_item', p_item_id, p_resolution_note, v_old, NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'ops_item', p_item_id, 'OPS_ITEM_RESOLVED', auth.uid(), 'admin', NULL, NULL, p_item_id, NULL, NULL, jsonb_build_object('note', p_resolution_note));
END;
$$;

GRANT EXECUTE ON FUNCTION admin.resolve_ops_item_v1(uuid,text) TO authenticated;

-- admin.approve_refund_v1
CREATE OR REPLACE FUNCTION admin.approve_refund_v1(p_refund_id uuid, p_note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_ref record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO v_ref FROM secure.refund_requests WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_ref.status <> 'requested' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  UPDATE secure.refund_requests SET status = 'approved', approved_by = auth.uid(), updated_at = now() WHERE id = p_refund_id;

  PERFORM audit.log_admin_action_v1(v_req, 'REFUND_APPROVED', auth.uid(), 'admin', v_ref.requested_by, 'refund', p_refund_id, p_note, NULL, jsonb_build_object('order_id', v_ref.order_id, 'amount', v_ref.amount), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'refund', p_refund_id, 'REFUND_APPROVED', auth.uid(), 'admin', NULL, NULL, v_ref.order_id, NULL, NULL, jsonb_build_object('amount', v_ref.amount));

  -- enqueue job to initiate refund (idempotent key = refund id)
  PERFORM public.enqueue_job_v1('refund_initiate_v1', jsonb_build_object('refund_id', p_refund_id), now(), p_refund_id::text);
END;
$$;

GRANT EXECUTE ON FUNCTION admin.approve_refund_v1(uuid,text) TO authenticated;

-- admin.reject_refund_v1
CREATE OR REPLACE FUNCTION admin.reject_refund_v1(p_refund_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_ref record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO v_ref FROM secure.refund_requests WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_ref.status <> 'requested' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  UPDATE secure.refund_requests SET status = 'rejected', updated_at = now() WHERE id = p_refund_id;

  PERFORM audit.log_admin_action_v1(v_req, 'REFUND_REJECTED', auth.uid(), 'admin', v_ref.requested_by, 'refund', p_refund_id, p_reason, NULL, jsonb_build_object('order_id', v_ref.order_id, 'amount', v_ref.amount), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'refund', p_refund_id, 'REFUND_REJECTED', auth.uid(), 'admin', NULL, NULL, v_ref.order_id, NULL, NULL, jsonb_build_object('reason', p_reason));
END;
$$;

GRANT EXECUTE ON FUNCTION admin.reject_refund_v1(uuid,text) TO authenticated;

-- admin.queue_payout_v1
CREATE OR REPLACE FUNCTION admin.queue_payout_v1(p_order_id uuid, p_note text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_order record;
  v_farmer_id uuid;
  v_req uuid := audit.new_request_id_v1();
  v_payout_id uuid;
  v_kyc_status text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO v_order FROM public.market_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_order.payment_status IS DISTINCT FROM 'captured' THEN RAISE EXCEPTION 'PAYMENT_NOT_CAPTURED'; END IF;

  v_farmer_id := v_order.farmer_id;
  IF v_farmer_id IS NULL THEN RAISE EXCEPTION 'FARMER_MISSING'; END IF;

  SELECT kyc_status INTO v_kyc_status FROM public.profiles WHERE id = v_farmer_id LIMIT 1;
  IF v_kyc_status IS NULL OR v_kyc_status <> 'verified' THEN
    -- create ops item and set payout_status
    PERFORM admin.build_ops_inbox_item_v1('payout_pending_kyc','order', p_order_id, 'medium', 'Payout blocked: farmer KYC missing', jsonb_build_object('farmer_id', v_farmer_id));
    UPDATE public.market_orders SET payout_status = 'pending_kyc', updated_at = now() WHERE id = p_order_id;
    PERFORM audit.log_workflow_event_v1(v_req, 'payout', p_order_id, 'PAYOUT_PENDING_KYC', auth.uid(), 'admin', NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('kyc_status', v_kyc_status));
    RETURN NULL;
  END IF;

  -- ensure no open high-priority tickets (best-effort)
  IF EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.entity_type = 'order' AND st.entity_id = p_order_id AND st.status IN ('open','in_progress') AND st.priority IN ('urgent','high')) THEN
    RAISE EXCEPTION 'OPEN_SUPPORT_TICKET';
  END IF;

  -- idempotent upsert into payout_jobs
  INSERT INTO secure.payout_jobs(order_id, farmer_id, provider, amount, created_by)
  VALUES (p_order_id, v_farmer_id, 'manual', COALESCE((SELECT net_farmer_amount FROM public.market_orders WHERE id = p_order_id), 0), auth.uid())
  ON CONFLICT (order_id) DO UPDATE SET status = 'queued', updated_at = now()
  RETURNING id INTO v_payout_id;

  UPDATE public.market_orders SET payout_status = 'queued', updated_at = now() WHERE id = p_order_id;

  PERFORM admin.build_ops_inbox_item_v1('payout_eligible_queue','order', p_order_id, 'low', 'Payout queued for order', jsonb_build_object('payout_id', v_payout_id));
  PERFORM audit.log_admin_action_v1(v_req, 'PAYOUT_QUEUED', auth.uid(), 'admin', NULL, 'order', p_order_id, p_note, NULL, jsonb_build_object('payout_id', v_payout_id), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'payout', p_order_id, 'PAYOUT_QUEUED', auth.uid(), 'admin', NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('payout_id', v_payout_id));

  RETURN v_payout_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin.queue_payout_v1(uuid,text) TO authenticated;

-- admin.mark_payout_initiated_v1
CREATE OR REPLACE FUNCTION admin.mark_payout_initiated_v1(p_payout_job_id uuid, p_reference_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_job record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO v_job FROM secure.payout_jobs WHERE id = p_payout_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_job.status <> 'queued' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  UPDATE secure.payout_jobs SET status = 'initiated', reference_id = p_reference_id, updated_at = now() WHERE id = p_payout_job_id;
  UPDATE public.market_orders SET payout_status = 'initiated', payout_reference_id = p_reference_id, updated_at = now() WHERE id = v_job.order_id;

  PERFORM audit.log_admin_action_v1(v_req, 'PAYOUT_INITIATED', auth.uid(), 'admin', NULL, 'payout', p_payout_job_id, NULL, NULL, jsonb_build_object('reference_id', p_reference_id), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'payout', v_job.order_id, 'PAYOUT_INITIATED', auth.uid(), 'admin', NULL, NULL, v_job.order_id, NULL, NULL, jsonb_build_object('payout_job_id', p_payout_job_id, 'reference_id', p_reference_id));
END;
$$;

GRANT EXECUTE ON FUNCTION admin.mark_payout_initiated_v1(uuid,text) TO authenticated;

-- admin.mark_payout_success_v1
CREATE OR REPLACE FUNCTION admin.mark_payout_success_v1(p_payout_job_id uuid, p_reference_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_job record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO v_job FROM secure.payout_jobs WHERE id = p_payout_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_job.status <> 'initiated' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  UPDATE secure.payout_jobs SET status = 'success', reference_id = COALESCE(p_reference_id, v_job.reference_id), updated_at = now() WHERE id = p_payout_job_id;
  UPDATE public.market_orders SET payout_status = 'success', payout_reference_id = COALESCE(p_reference_id, payout_reference_id), updated_at = now() WHERE id = v_job.order_id;
  UPDATE secure.order_financials SET settlement_status = 'paid_out', updated_at = now() WHERE order_id = v_job.order_id;

  PERFORM audit.log_admin_action_v1(v_req, 'PAYOUT_SUCCESS', auth.uid(), 'admin', NULL, 'payout', p_payout_job_id, NULL, NULL, jsonb_build_object('reference_id', p_reference_id), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'payout', v_job.order_id, 'PAYOUT_SUCCESS', auth.uid(), 'admin', NULL, NULL, v_job.order_id, NULL, NULL, jsonb_build_object('payout_job_id', p_payout_job_id, 'reference_id', p_reference_id));
END;
$$;

GRANT EXECUTE ON FUNCTION admin.mark_payout_success_v1(uuid,text) TO authenticated;

-- admin.mark_payout_failed_v1
CREATE OR REPLACE FUNCTION admin.mark_payout_failed_v1(p_payout_job_id uuid, p_error text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_job record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO v_job FROM secure.payout_jobs WHERE id = p_payout_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_job.status NOT IN ('initiated','queued') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  UPDATE secure.payout_jobs SET status = 'failed', error = p_error, updated_at = now() WHERE id = p_payout_job_id;
  UPDATE public.market_orders SET payout_status = 'failed', updated_at = now() WHERE id = v_job.order_id;

  PERFORM admin.build_ops_inbox_item_v1('payout_failed','order', v_job.order_id, 'high', 'Payout failed: ' || COALESCE(p_error, ''), jsonb_build_object('payout_job_id', p_payout_job_id, 'error', p_error));
  PERFORM audit.log_admin_action_v1(v_req, 'PAYOUT_FAILED', auth.uid(), 'admin', NULL, 'payout', p_payout_job_id, p_error, NULL, jsonb_build_object('error', p_error), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'payout', v_job.order_id, 'PAYOUT_FAILED', auth.uid(), 'admin', NULL, NULL, v_job.order_id, NULL, NULL, jsonb_build_object('payout_job_id', p_payout_job_id, 'error', p_error));
END;
$$;

GRANT EXECUTE ON FUNCTION admin.mark_payout_failed_v1(uuid,text) TO authenticated;

-- secure.apply_gateway_state_v1 (idempotent, webhook/internal use)
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
  -- allow only webhook context or admin
  IF current_setting('app.webhook', true) <> 'true' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- insert webhook_event idempotently
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

  -- prevent duplicate payment event for same provider_payment_id + order
  SELECT id INTO v_existing FROM secure.payment_events WHERE provider = p_provider AND provider_payment_id = p_payment_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    -- mark webhook processed
    UPDATE secure.webhook_events SET processing_status = 'processed', processed_at = now() WHERE id = v_event_uuid;
    RETURN;
  END IF;

  -- insert payment event
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

GRANT EXECUTE ON FUNCTION secure.apply_gateway_state_v1(text,text,text,text,text,uuid,text,numeric,jsonb) TO public;

-- analytics.rollup_finance_daily_v1
CREATE OR REPLACE FUNCTION analytics.rollup_finance_daily_v1(p_day date) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = analytics, secure, public
AS $$
DECLARE
  v_start timestamptz := p_day::timestamptz;
  v_end timestamptz := (p_day + 1)::timestamptz;
  v_payments_initiated int;
  v_payments_captured int;
  v_payments_failed int;
  v_refunds_count int;
  v_refunds_amount numeric(18,2);
  v_payouts_queued int;
  v_payouts_success int;
  v_payout_pending_kyc int;
  v_gmv_captured numeric(18,2);
BEGIN
  PERFORM set_config('app.rpc','true', true);

  SELECT count(*) INTO v_payments_initiated FROM secure.payment_events WHERE created_at >= v_start AND created_at < v_end AND event_type ILIKE '%init%';
  SELECT count(*) INTO v_payments_captured FROM secure.payment_events WHERE created_at >= v_start AND created_at < v_end AND lower(status) = 'captured';
  SELECT count(*) INTO v_payments_failed FROM secure.payment_events WHERE created_at >= v_start AND created_at < v_end AND lower(status) = 'failed';
  SELECT count(*), COALESCE(sum(amount),0) INTO v_refunds_count, v_refunds_amount FROM secure.payment_events WHERE created_at >= v_start AND created_at < v_end AND event_type ILIKE '%REFUND%';
  SELECT count(*) INTO v_payouts_queued FROM secure.payout_jobs WHERE created_at >= v_start AND created_at < v_end AND status = 'queued';
  SELECT count(*) INTO v_payouts_success FROM secure.payout_jobs WHERE created_at >= v_start AND created_at < v_end AND status = 'success';
  SELECT count(*) INTO v_payout_pending_kyc FROM secure.order_financials WHERE updated_at >= v_start AND updated_at < v_end AND settlement_status = 'held_for_kyc';
  SELECT COALESCE(sum(gross_amount),0)::numeric(18,2) INTO v_gmv_captured FROM secure.order_financials WHERE payment_status = 'captured' AND updated_at >= v_start AND updated_at < v_end;

  INSERT INTO analytics.finance_daily(day, payments_initiated_count, payments_captured_count, payments_failed_count, refunds_count, refunds_amount, payouts_queued_count, payouts_success_count, payout_pending_kyc_count, gmv_captured, created_at, updated_at)
  VALUES (p_day, v_payments_initiated, v_payments_captured, v_payments_failed, v_refunds_count, v_refunds_amount, v_payouts_queued, v_payouts_success, v_payout_pending_kyc, v_gmv_captured, now(), now())
  ON CONFLICT (day) DO UPDATE SET
    payments_initiated_count = EXCLUDED.payments_initiated_count,
    payments_captured_count = EXCLUDED.payments_captured_count,
    payments_failed_count = EXCLUDED.payments_failed_count,
    refunds_count = EXCLUDED.refunds_count,
    refunds_amount = EXCLUDED.refunds_amount,
    payouts_queued_count = EXCLUDED.payouts_queued_count,
    payouts_success_count = EXCLUDED.payouts_success_count,
    payout_pending_kyc_count = EXCLUDED.payout_pending_kyc_count,
    gmv_captured = EXCLUDED.gmv_captured,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION analytics.rollup_finance_daily_v1(date) TO authenticated;

-- End of migration

-- ====================================================
-- 3) Admin listing RPCs for UI (read-only admin wrappers)
-- ====================================================

CREATE OR REPLACE FUNCTION admin.list_refund_requests_v1(p_limit int DEFAULT 100, p_cursor timestamptz DEFAULT NULL)
RETURNS TABLE(id uuid, order_id uuid, provider text, amount numeric, status text, requested_by uuid, approved_by uuid, created_at timestamptz, updated_at timestamptz) 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT id, order_id, provider, amount, status, requested_by, approved_by, created_at, updated_at
  FROM secure.refund_requests
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION admin.list_refund_requests_v1(int,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION admin.list_payout_jobs_v1(p_limit int DEFAULT 100, p_cursor timestamptz DEFAULT NULL)
RETURNS TABLE(id uuid, order_id uuid, farmer_id uuid, provider text, amount numeric, status text, error text, created_by uuid, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT id, order_id, farmer_id, provider, amount, status, error, created_by, created_at, updated_at
  FROM secure.payout_jobs
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION admin.list_payout_jobs_v1(int,timestamptz) TO authenticated;

