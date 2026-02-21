-- Phase E2: Secure Schema (Minimal, enterprise-ready)
-- File: supabase/migrations/202602201400_phase_e2_secure_schema.sql

-- 0) required extension (pgcrypto recommended for later token encryption)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create secure schema
CREATE SCHEMA IF NOT EXISTS secure;

-- 2) Secure tables (additive only)

CREATE TABLE IF NOT EXISTS secure.kyc_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NULL,
  kyc_type text NOT NULL CHECK (kyc_type IN ('farmer','agent','logistics','buyer')),
  status text NOT NULL CHECK (status IN ('not_started','submitted','verified','rejected','expired')) DEFAULT 'not_started',
  provider text NULL,
  provider_reference_id text NULL,
  masked_identifier text NULL, -- store masked PAN/Aadhaar only; do NOT store full ID
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NULL,
  verified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secure.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_record_id uuid NOT NULL REFERENCES secure.kyc_records(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id),
  document_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secure.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  order_id uuid NULL,
  event_type text NOT NULL,
  provider text NOT NULL,
  provider_payment_id text NULL,
  provider_payout_id text NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secure.external_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  owner_type text NOT NULL,
  owner_id uuid NULL,
  encrypted_token text NOT NULL,
  expires_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS kyc_records_user_idx ON secure.kyc_records(user_id);
CREATE INDEX IF NOT EXISTS kyc_records_status_idx ON secure.kyc_records(status);
CREATE INDEX IF NOT EXISTS kyc_records_created_idx ON secure.kyc_records(created_at DESC);

CREATE INDEX IF NOT EXISTS kyc_documents_record_idx ON secure.kyc_documents(kyc_record_id);
CREATE INDEX IF NOT EXISTS kyc_documents_uploaded_by_idx ON secure.kyc_documents(uploaded_by);

CREATE INDEX IF NOT EXISTS payment_user_idx ON secure.payment_events(user_id);
CREATE INDEX IF NOT EXISTS payment_provider_payment_idx ON secure.payment_events(provider_payment_id);
CREATE INDEX IF NOT EXISTS payment_created_idx ON secure.payment_events(created_at DESC);

CREATE INDEX IF NOT EXISTS external_tokens_service_idx ON secure.external_tokens(service_name);
CREATE INDEX IF NOT EXISTS external_tokens_owner_idx ON secure.external_tokens(owner_type, owner_id);

-- 4) RLS and privileges (append-only style for secure tables)
ALTER TABLE secure.kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE secure.external_tokens ENABLE ROW LEVEL SECURITY;

-- Remove direct privileges to prevent frontend direct writes/reads
REVOKE ALL ON secure.kyc_records FROM PUBLIC, authenticated, anon;
REVOKE ALL ON secure.kyc_documents FROM PUBLIC, authenticated, anon;
REVOKE ALL ON secure.payment_events FROM PUBLIC, authenticated, anon;
REVOKE ALL ON secure.external_tokens FROM PUBLIC, authenticated, anon;

-- Policies:
-- SELECT: only admins
-- INSERT/UPDATE: only via RPC (app.rpc) OR admin
CREATE POLICY secure_kyc_select_admin ON secure.kyc_records FOR SELECT USING (public.is_admin());
CREATE POLICY secure_kyc_insert_rpc ON secure.kyc_records FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );
CREATE POLICY secure_kyc_update_rpc ON secure.kyc_records FOR UPDATE USING ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

CREATE POLICY secure_docs_select_admin ON secure.kyc_documents FOR SELECT USING (public.is_admin());
CREATE POLICY secure_docs_insert_rpc ON secure.kyc_documents FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );
CREATE POLICY secure_docs_update_rpc ON secure.kyc_documents FOR UPDATE USING ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

CREATE POLICY secure_payments_select_admin ON secure.payment_events FOR SELECT USING (public.is_admin());
CREATE POLICY secure_payments_insert_rpc ON secure.payment_events FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );
CREATE POLICY secure_payments_update_rpc ON secure.payment_events FOR UPDATE USING ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

CREATE POLICY secure_tokens_select_admin ON secure.external_tokens FOR SELECT USING (public.is_admin());
CREATE POLICY secure_tokens_insert_rpc ON secure.external_tokens FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );
CREATE POLICY secure_tokens_update_rpc ON secure.external_tokens FOR UPDATE USING ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

-- 5) Public mirror fields (additive)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz NULL;

-- 6) SECURITY DEFINER functions (primary write path)
-- Note: these functions set app.rpc='true' internally and call audit.* functions.

-- submit_kyc_v1
CREATE OR REPLACE FUNCTION secure.submit_kyc_v1(
  p_kyc_type text,
  p_masked_identifier text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = secure, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
  v_req uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  SELECT id INTO v_id FROM secure.kyc_records WHERE user_id = v_user LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO secure.kyc_records(user_id, kyc_type, masked_identifier, metadata, status, submitted_at)
    VALUES (v_user, p_kyc_type, p_masked_identifier, p_metadata, 'submitted', now())
    RETURNING id INTO v_id;
  ELSE
    UPDATE secure.kyc_records
    SET kyc_type = p_kyc_type,
        masked_identifier = p_masked_identifier,
        metadata = COALESCE(p_metadata, metadata),
        status = 'submitted',
        submitted_at = now(),
        updated_at = now()
    WHERE id = v_id;
  END IF;

  -- mirror into public.profiles
  UPDATE public.profiles SET kyc_status = 'submitted' WHERE id = v_user;

  -- audit
  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(v_req, 'kyc', v_id, 'KYC_SUBMITTED', v_user, NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('source','rpc','metadata',p_metadata));
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION secure.submit_kyc_v1(text,text,jsonb) TO authenticated;

-- add_kyc_document_v1
CREATE OR REPLACE FUNCTION secure.add_kyc_document_v1(
  p_kyc_record_id uuid,
  p_file_id uuid,
  p_document_type text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = secure, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
  v_req uuid;
  v_owner_of_record uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- ensure record belongs to user
  SELECT user_id INTO v_owner_of_record FROM secure.kyc_records WHERE id = p_kyc_record_id LIMIT 1;
  IF v_owner_of_record IS NULL OR v_owner_of_record <> v_user THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- ensure file owner matches uploader (safety)
  SELECT owner_user_id INTO v_owner FROM public.files WHERE id = p_file_id LIMIT 1;
  IF v_owner IS NULL OR v_owner <> v_user THEN
    RAISE EXCEPTION 'BAD_REQUEST: file owner mismatch';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  INSERT INTO secure.kyc_documents(kyc_record_id, file_id, document_type, uploaded_by)
  VALUES (p_kyc_record_id, p_file_id, p_document_type, v_user)
  RETURNING id INTO v_id;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(v_req, 'kyc_document', v_id, 'KYC_DOCUMENT_UPLOADED', v_user, NULL, NULL, NULL, p_file_id, NULL, NULL, jsonb_build_object('doc_type', p_document_type));
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION secure.add_kyc_document_v1(uuid,uuid,text) TO authenticated;

-- admin_update_kyc_status_v1
CREATE OR REPLACE FUNCTION secure.admin_update_kyc_status_v1(
  p_kyc_record_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = secure, public
AS $$
DECLARE
  v_admin_ok boolean := public.is_admin();
  v_user uuid;
  v_req uuid;
BEGIN
  IF NOT v_admin_ok THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true', true);

  UPDATE secure.kyc_records
  SET status = p_new_status,
      verified_at = CASE WHEN p_new_status = 'verified' THEN now() ELSE verified_at END,
      updated_at = now()
  WHERE id = p_kyc_record_id;

  SELECT user_id INTO v_user FROM secure.kyc_records WHERE id = p_kyc_record_id LIMIT 1;

  IF p_new_status = 'verified' THEN
    UPDATE public.profiles SET kyc_status = 'verified', kyc_verified_at = now() WHERE id = v_user;
  ELSE
    UPDATE public.profiles SET kyc_status = p_new_status WHERE id = v_user;
  END IF;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_admin_action_v1(v_req, 'kyc_status_update', auth.uid(), 'admin', v_user, 'kyc', p_kyc_record_id, p_reason, NULL, jsonb_build_object('status', p_new_status), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'kyc', p_kyc_record_id, 'KYC_STATUS_UPDATED', auth.uid(), 'admin', NULL, NULL, NULL, NULL, NULL, jsonb_build_object('new_status', p_new_status, 'reason', p_reason));
END;
$$;
GRANT EXECUTE ON FUNCTION secure.admin_update_kyc_status_v1(uuid,text,text) TO authenticated;

-- record_payment_event_v1
CREATE OR REPLACE FUNCTION secure.record_payment_event_v1(
  p_user_id uuid,
  p_event_type text,
  p_provider text,
  p_amount numeric,
  p_status text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = secure, public
AS $$
DECLARE
  v_id uuid;
  v_req uuid;
BEGIN
  PERFORM set_config('app.rpc','true', true);

  INSERT INTO secure.payment_events(user_id, event_type, provider, amount, status, metadata)
  VALUES (p_user_id, p_event_type, p_provider, p_amount, p_status, p_metadata)
  RETURNING id INTO v_id;

  v_req := audit.new_request_id_v1();
  PERFORM audit.log_workflow_event_v1(v_req, 'payment', v_id, 'PAYMENT_EVENT_RECORDED', p_user_id, NULL, NULL, NULL, NULL, NULL, NULL, p_metadata);

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION secure.record_payment_event_v1(uuid,text,text,numeric,text,jsonb) TO authenticated;

-- 7) Final grants: allow execution but do not expose tables directly to frontend
GRANT USAGE ON SCHEMA secure TO authenticated;

-- 8) Smoke tests (examples) - run in staging
-- as admin/service_role:
-- 1) Admin should be able to SELECT:
--    SELECT count(*) FROM secure.kyc_records;
-- 2) Non-admin should not be able to SELECT (test via supabase-js with user JWT)
-- 3) Test submit_kyc_v1:
--    SELECT secure.submit_kyc_v1('farmer','PAN:XXXXXX1234', '{"note":"smoke"}'::jsonb);
-- 4) Test add_kyc_document_v1 (requires file created in public.files owned by user)
--    SELECT secure.add_kyc_document_v1('<kyc-id>', '<file-id>', 'identity_proof');
-- 5) Test admin update:
--    SELECT secure.admin_update_kyc_status_v1('<kyc-id>','verified','manual check passed');
-- 6) Test payment event:
--    SELECT secure.record_payment_event_v1('<user-id>', 'payment_captured', 'razorpay', 1000.00, 'success', '{}'::jsonb);

