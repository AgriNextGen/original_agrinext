-- supabase/migrations/202602201210_phase_4_payments_settlement_rpcs.sql
-- Phase 4 (RPCs): Payments + Settlement + KYC Enforcement
-- SECURITY DEFINER functions, use search_path = public, secure, audit

-- compute_order_financials_v1
CREATE OR REPLACE FUNCTION public.compute_order_financials_v1(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_order RECORD;
  v_gross numeric(14,2);
  v_platform_pct numeric := 2.0;
  v_platform_fee numeric(12,2);
  v_net numeric(14,2);
  v_currency text := 'INR';
  v_req uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  SELECT * INTO v_order FROM public.market_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  BEGIN
    SELECT (value->>0)::numeric INTO v_platform_pct FROM public.app_config WHERE key = 'PLATFORM_FEE_PERCENT' LIMIT 1;
  EXCEPTION WHEN others THEN
    v_platform_pct := 2.0;
  END;

  v_gross := COALESCE(v_order.total_amount, (COALESCE(v_order.qty,0) * COALESCE(v_order.unit_price,0)));
  v_platform_fee := ROUND((v_gross * (v_platform_pct/100.0))::numeric, 2);
  v_net := ROUND((v_gross - v_platform_fee)::numeric, 2);

  INSERT INTO secure.order_financials(order_id, buyer_id, farmer_id, gross_amount, platform_fee, net_farmer_amount, currency, payment_status, created_at, updated_at)
  VALUES (p_order_id, v_order.buyer_id, COALESCE(v_order.farmer_id, (SELECT farmer_id FROM public.listings l WHERE l.id = v_order.listing_id LIMIT 1)), v_gross, v_platform_fee, v_net, v_currency, COALESCE(v_order.payment_status, 'unpaid'), now(), now())
  ON CONFLICT (order_id) DO UPDATE SET
    gross_amount = EXCLUDED.gross_amount,
    platform_fee = EXCLUDED.platform_fee,
    net_farmer_amount = EXCLUDED.net_farmer_amount,
    currency = EXCLUDED.currency,
    updated_at = now();

  UPDATE public.market_orders SET platform_fee = v_platform_fee, net_farmer_amount = v_net WHERE id = p_order_id;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(v_req, 'financials', p_order_id, 'FINANCIALS_COMPUTED', auth.uid(), NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('gross', v_gross, 'platform_fee', v_platform_fee, 'net', v_net));

  RETURN jsonb_build_object('gross', v_gross, 'platform_fee', v_platform_fee, 'net', v_net, 'currency', v_currency);
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_order_financials_v1(uuid) TO authenticated;

-- payment_initiate_v1
CREATE OR REPLACE FUNCTION public.payment_initiate_v1(p_order_id uuid, p_provider text DEFAULT 'razorpay')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_order RECORD;
  v_fin jsonb;
  v_req uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_order FROM public.market_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id::text <> auth.uid()::text THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;

  IF v_order.payment_status IS NOT NULL AND v_order.payment_status NOT IN ('unpaid','failed') THEN
    RAISE EXCEPTION 'Payment cannot be initiated in current payment_status: %', v_order.payment_status;
  END IF;

  PERFORM set_config('app.rpc','true', true);

  v_fin := public.compute_order_financials_v1(p_order_id);

  UPDATE public.market_orders SET payment_status = 'initiated', payment_provider = p_provider, updated_at = now() WHERE id = p_order_id;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PAYMENT_INITIATED', auth.uid(), NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'financials', v_fin));

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'amount_paise', ( (v_fin->>'gross')::numeric * 100 )::bigint,
    'currency', (v_fin->>'currency'),
    'buyer_id', v_order.buyer_id,
    'provider', p_provider
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.payment_initiate_v1(uuid,text) TO authenticated;

-- payment_attach_provider_order_v1
CREATE OR REPLACE FUNCTION public.payment_attach_provider_order_v1(p_order_id uuid, p_payment_order_id text, p_provider text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_order RECORD;
  v_req uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_order FROM public.market_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.buyer_id::text <> auth.uid()::text THEN
    RAISE EXCEPTION 'Order not found or access denied';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  UPDATE public.market_orders
  SET payment_order_id = p_payment_order_id,
      payment_provider = p_provider,
      payment_status = 'initiated',
      updated_at = now()
  WHERE id = p_order_id;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(v_req, 'payment', p_order_id, 'PROVIDER_ORDER_ATTACHED', auth.uid(), NULL, NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('provider', p_provider, 'provider_order_id', p_payment_order_id));
END;
$$;

GRANT EXECUTE ON FUNCTION public.payment_attach_provider_order_v1(uuid,text,text) TO authenticated;

-- payment_apply_webhook_event_v1
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
  IF current_setting('app.webhook', true) <> 'true' AND NOT public.is_admin() THEN
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

GRANT EXECUTE ON FUNCTION public.payment_apply_webhook_event_v1(text,text,text,text,text,uuid,text,numeric,jsonb) TO public;

-- settlement_mark_eligible_v1
CREATE OR REPLACE FUNCTION public.settlement_mark_eligible_v1(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_profile_kstatus text;
  v_farmer_id uuid;
  v_req uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  SELECT farmer_id INTO v_farmer_id FROM public.market_orders WHERE id = p_order_id LIMIT 1;
  IF v_farmer_id IS NULL THEN RAISE EXCEPTION 'Order not found or farmer missing'; END IF;

  SELECT kyc_status INTO v_profile_kstatus FROM public.profiles WHERE id = v_farmer_id LIMIT 1;

  IF v_profile_kstatus IS NULL OR v_profile_kstatus <> 'verified' THEN
    UPDATE secure.order_financials SET settlement_status = 'held_for_kyc', updated_at = now() WHERE order_id = p_order_id;
    UPDATE public.market_orders SET payout_status = 'pending_kyc', updated_at = now() WHERE id = p_order_id;
  ELSE
    UPDATE secure.order_financials SET settlement_status = 'eligible', updated_at = now() WHERE order_id = p_order_id;
    UPDATE public.market_orders SET payout_status = 'queued', updated_at = now() WHERE id = p_order_id;
  END IF;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_admin_action_v1(v_req, 'settlement', auth.uid(), 'admin', NULL, 'order', p_order_id, NULL, NULL, jsonb_build_object('kyc_status', v_profile_kstatus), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'settlement', p_order_id, 'SETTLEMENT_ELIGIBILITY_UPDATED', auth.uid(), 'admin', NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('kyc_status', v_profile_kstatus));
END;
$$;

GRANT EXECUTE ON FUNCTION public.settlement_mark_eligible_v1(uuid) TO authenticated;

-- payout_record_event_v1
CREATE OR REPLACE FUNCTION public.payout_record_event_v1(
  p_order_id uuid,
  p_payout_reference_id text,
  p_status text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, secure, audit
AS $$
DECLARE
  v_req uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  UPDATE public.market_orders
  SET payout_status = p_status,
      payout_reference_id = p_payout_reference_id,
      updated_at = now()
  WHERE id = p_order_id;

  UPDATE secure.order_financials
  SET settlement_status = CASE
    WHEN lower(p_status) = 'queued' THEN 'eligible'
    WHEN lower(p_status) = 'initiated' THEN 'eligible'
    WHEN lower(p_status) = 'success' THEN 'paid_out'
    WHEN lower(p_status) = 'failed' THEN 'unsettled'
    ELSE settlement_status END,
    updated_at = now()
  WHERE order_id = p_order_id;

  INSERT INTO secure.payment_events(user_id, order_id, event_type, provider, provider_payout_id, amount, status, metadata, created_at)
  VALUES (NULL, p_order_id, concat('payout_', lower(p_status)), NULL, p_payout_reference_id, 0, p_status, COALESCE(p_metadata,'{}'::jsonb), now());

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_admin_action_v1(v_req, 'payout', auth.uid(), 'admin', NULL, 'order', p_order_id, NULL, NULL, jsonb_build_object('payout_reference_id', p_payout_reference_id, 'status', p_status), NULL, NULL, p_metadata);
  PERFORM audit.log_workflow_event_v1(v_req, 'payout', p_order_id, 'PAYOUT_EVENT_RECORDED', auth.uid(), 'admin', NULL, NULL, p_order_id, NULL, NULL, jsonb_build_object('payout_reference_id', p_payout_reference_id, 'status', p_status));
END;
$$;

GRANT EXECUTE ON FUNCTION public.payout_record_event_v1(uuid,text,text,jsonb) TO authenticated;

-- admin_finance_summary_v1
CREATE OR REPLACE FUNCTION public.admin_finance_summary_v1(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, secure, audit, analytics
AS $$
DECLARE
  _start timestamptz := (now() - (p_days || ' days')::interval);
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  SELECT jsonb_build_object(
    'paid_gmv', COALESCE((SELECT sum(gross_amount)::numeric(14,2) FROM secure.order_financials WHERE payment_status = 'captured' AND created_at >= _start),0),
    'paid_orders_count', COALESCE((SELECT count(*) FROM secure.order_financials WHERE payment_status = 'captured' AND created_at >= _start),0),
    'refund_count', COALESCE((SELECT count(*) FROM secure.payment_events WHERE event_type ILIKE '%REFUND%' AND created_at >= _start),0),
    'refund_amount', COALESCE((SELECT sum(amount)::numeric(14,2) FROM secure.payment_events WHERE event_type ILIKE '%REFUND%' AND created_at >= _start),0),
    'payout_pending_kyc', COALESCE((SELECT count(*) FROM secure.order_financials of JOIN public.market_orders mo ON mo.id = of.order_id WHERE of.settlement_status = 'held_for_kyc' AND of.created_at >= _start),0),
    'payout_queued', COALESCE((SELECT count(*) FROM public.market_orders WHERE payout_status = 'queued' AND updated_at >= _start),0),
    'payout_success', COALESCE((SELECT count(*) FROM public.market_orders WHERE payout_status = 'success' AND updated_at >= _start),0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_finance_summary_v1(integer) TO authenticated;

