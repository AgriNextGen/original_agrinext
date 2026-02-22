-- Ensure secure.kyc_documents exists after public.files creation
-- Depends on: 202602201401_phase_e2_secure_schema, 202602250002_phase_d_storage_foundation

CREATE TABLE IF NOT EXISTS secure.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_record_id uuid NOT NULL REFERENCES secure.kyc_records(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id),
  document_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_documents_record_idx ON secure.kyc_documents(kyc_record_id);
CREATE INDEX IF NOT EXISTS kyc_documents_uploaded_by_idx ON secure.kyc_documents(uploaded_by);

ALTER TABLE secure.kyc_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON secure.kyc_documents FROM PUBLIC, authenticated, anon;

DROP POLICY IF EXISTS secure_docs_select_admin ON secure.kyc_documents;
DROP POLICY IF EXISTS secure_docs_insert_rpc ON secure.kyc_documents;
DROP POLICY IF EXISTS secure_docs_update_rpc ON secure.kyc_documents;
CREATE POLICY secure_docs_select_admin ON secure.kyc_documents FOR SELECT USING (public.is_admin());
CREATE POLICY secure_docs_insert_rpc ON secure.kyc_documents FOR INSERT WITH CHECK ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );
CREATE POLICY secure_docs_update_rpc ON secure.kyc_documents FOR UPDATE USING ( (current_setting('app.rpc', true) = 'true') OR public.is_admin() );

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
