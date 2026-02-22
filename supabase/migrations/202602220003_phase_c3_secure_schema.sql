-- Phase C3: Secure Schema (Tier-4 Data Isolation)
-- Creates secure schema for KYC, payment events, and external tokens

-- ============================================================
-- STEP 1: CREATE SCHEMA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS secure;

-- ============================================================
-- STEP 2: secure.kyc_records
-- ============================================================

CREATE TABLE IF NOT EXISTS secure.kyc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kyc_status text CHECK (kyc_status IN ('pending','verified','rejected')),
  provider_reference text,
  encrypted_payload bytea,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON secure.kyc_records (user_id);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'secure' AND table_name = 'kyc_records' AND column_name = 'kyc_status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_kyc_status ON secure.kyc_records (kyc_status);
  END IF;
END$$;

-- ============================================================
-- STEP 3: secure.payment_events
-- ============================================================

CREATE TABLE IF NOT EXISTS secure.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_id uuid,
  provider text,
  provider_event_id text,
  amount numeric,
  currency text,
  status text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_user ON secure.payment_events (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_order ON secure.payment_events (order_id);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'secure' AND table_name = 'payment_events' AND column_name = 'provider_event_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_payment_provider_event ON secure.payment_events (provider_event_id);
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_payment_created ON secure.payment_events (created_at);

-- ============================================================
-- STEP 4: secure.external_tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS secure.external_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  encrypted_token bytea,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ext_tokens_service ON secure.external_tokens (service_name);

-- ============================================================
-- STEP 5: ENABLE RLS
-- ============================================================

ALTER TABLE secure.kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure.external_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: POLICIES — admin-only SELECT, no client writes
-- ============================================================

DROP POLICY IF EXISTS kyc_select_admin ON secure.kyc_records;
CREATE POLICY kyc_select_admin
  ON secure.kyc_records FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS payment_events_select_admin ON secure.payment_events;
CREATE POLICY payment_events_select_admin
  ON secure.payment_events FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS ext_tokens_select_admin ON secure.external_tokens;
CREATE POLICY ext_tokens_select_admin
  ON secure.external_tokens FOR SELECT
  USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policies — only SECURITY DEFINER or service role

-- ============================================================
-- STEP 7: HELPER FUNCTION — create_kyc_record (service role only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_kyc_record(
  p_user_id uuid,
  p_provider_reference text,
  p_payload bytea
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO secure.kyc_records (user_id, kyc_status, provider_reference, encrypted_payload)
  VALUES (p_user_id, 'pending', p_provider_reference, p_payload)
  RETURNING id INTO v_id;

  PERFORM public.insert_audit_log(
    'kyc_submitted',
    'kyc_records',
    v_id,
    jsonb_build_object('user_id', p_user_id, 'provider', p_provider_reference)
  );

  RETURN v_id;
END;
$$;

-- Only service_role can call this, not regular authenticated users
REVOKE EXECUTE ON FUNCTION public.create_kyc_record(uuid, text, bytea) FROM public;
REVOKE EXECUTE ON FUNCTION public.create_kyc_record(uuid, text, bytea) FROM authenticated;
