-- supabase/migrations/202602201200_phase_4_payments_settlement_schema.sql
-- Phase 4 (schema): Payments + Settlement + KYC Enforcement (additive)
-- Additive-only schema changes: market_orders columns, secure.order_financials, secure.webhook_events, analytics extensions

CREATE SCHEMA IF NOT EXISTS secure;

-- 1) Extend public.market_orders (additive only)
ALTER TABLE public.market_orders
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_provider text NULL,
  ADD COLUMN IF NOT EXISTS payment_order_id text NULL,
  ADD COLUMN IF NOT EXISTS payment_id text NULL,
  ADD COLUMN IF NOT EXISTS payment_captured_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS payout_reference_id text NULL,
  ADD COLUMN IF NOT EXISTS platform_fee numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_farmer_amount numeric(14,2) NOT NULL DEFAULT 0;

-- add check constraints for allowed values (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.market_orders ADD CONSTRAINT market_orders_payment_status_check CHECK (payment_status IN ('unpaid','initiated','authorized','captured','failed','refunded'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE public.market_orders ADD CONSTRAINT market_orders_payout_status_check CHECK (payout_status IN ('not_applicable','pending_kyc','queued','initiated','success','failed'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

-- 2) Create secure.order_financials
CREATE TABLE IF NOT EXISTS secure.order_financials (
  order_id uuid PRIMARY KEY REFERENCES public.market_orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id),
  farmer_id uuid NOT NULL REFERENCES auth.users(id),
  gross_amount numeric(14,2) NOT NULL,
  platform_fee numeric(12,2) NOT NULL,
  net_farmer_amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  payment_status text NOT NULL DEFAULT 'unpaid',
  settlement_status text NOT NULL DEFAULT 'unsettled',
  last_payment_event_id uuid NULL REFERENCES secure.payment_events(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  BEGIN
    ALTER TABLE secure.order_financials ADD CONSTRAINT order_financials_settlement_status_check CHECK (settlement_status IN ('unsettled','held_for_kyc','eligible','paid_out','refunded'));
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

CREATE INDEX IF NOT EXISTS idx_order_financials_buyer ON secure.order_financials(buyer_id);
CREATE INDEX IF NOT EXISTS idx_order_financials_farmer ON secure.order_financials(farmer_id);
CREATE INDEX IF NOT EXISTS idx_order_financials_payment_status ON secure.order_financials(payment_status);

ALTER TABLE secure.order_financials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON secure.order_financials FROM PUBLIC, authenticated, anon;
CREATE POLICY IF NOT EXISTS order_financials_select_admin ON secure.order_financials FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS order_financials_insert_rpc ON secure.order_financials FOR INSERT WITH CHECK ((current_setting('app.rpc', true) = 'true') OR public.is_admin());
CREATE POLICY IF NOT EXISTS order_financials_update_rpc ON secure.order_financials FOR UPDATE USING ((current_setting('app.rpc', true) = 'true') OR public.is_admin());

-- 3) Create secure.webhook_events for idempotency
CREATE TABLE IF NOT EXISTS secure.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  processed_at timestamptz NULL,
  processing_status text NOT NULL DEFAULT 'received'
);

DO $$
BEGIN
  BEGIN
    ALTER TABLE secure.webhook_events ADD CONSTRAINT webhook_provider_event_unique UNIQUE (provider, event_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

ALTER TABLE secure.webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON secure.webhook_events FROM PUBLIC, authenticated, anon;
CREATE POLICY IF NOT EXISTS webhook_events_select_admin ON secure.webhook_events FOR SELECT USING (public.is_admin());
CREATE POLICY IF NOT EXISTS webhook_events_insert_rpc ON secure.webhook_events FOR INSERT WITH CHECK ((current_setting('app.rpc', true) = 'true') OR public.is_admin());
CREATE POLICY IF NOT EXISTS webhook_events_update_rpc ON secure.webhook_events FOR UPDATE USING ((current_setting('app.rpc', true) = 'true') OR public.is_admin());

-- 4) Analytics: extend marketplace_daily additively
ALTER TABLE analytics.marketplace_daily
  ADD COLUMN IF NOT EXISTS orders_paid int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gmv_paid numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunds int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunds_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_pending_kyc_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_success_count int NOT NULL DEFAULT 0;

-- End of schema migration

