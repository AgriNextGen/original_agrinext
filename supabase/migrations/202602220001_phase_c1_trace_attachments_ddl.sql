-- Phase C1: trace_attachments DDL + RLS hardening
-- Adds missing columns required by frontend and enforces ownership-based RLS

-- ============================================================
-- STEP 1: ADD MISSING COLUMNS (all nullable for backward compat)
-- ============================================================

ALTER TABLE public.trace_attachments
  ADD COLUMN IF NOT EXISTS owner_type text,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS uploader_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS tag text;

-- ============================================================
-- STEP 2: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trace_attachments_owner
  ON public.trace_attachments (owner_type, owner_id);

CREATE INDEX IF NOT EXISTS idx_trace_attachments_uploader
  ON public.trace_attachments (uploader_id);

-- ============================================================
-- STEP 3: DROP OLD OVERLY-BROAD POLICIES
-- ============================================================

DROP POLICY IF EXISTS trace_attachments_insert_auth ON public.trace_attachments;
DROP POLICY IF EXISTS trace_attachments_select_auth ON public.trace_attachments;
DROP POLICY IF EXISTS trace_attachments_insert ON public.trace_attachments;
DROP POLICY IF EXISTS trace_attachments_select ON public.trace_attachments;
DROP POLICY IF EXISTS ta_insert_owner ON public.trace_attachments;
DROP POLICY IF EXISTS ta_select ON public.trace_attachments;
DROP POLICY IF EXISTS ta_update_visibility ON public.trace_attachments;

-- ============================================================
-- STEP 4: NEW RLS POLICIES
-- ============================================================

-- INSERT: uploader_id must match the authenticated user
CREATE POLICY ta_insert_owner
  ON public.trace_attachments FOR INSERT
  WITH CHECK (uploader_id = auth.uid());

-- SELECT: farmer sees attachments linked to their own listings
--         buyer sees attachments on active listings (buyer role)
--         uploader sees own uploads
--         admin sees all
CREATE POLICY ta_select
  ON public.trace_attachments FOR SELECT
  USING (
    uploader_id = auth.uid()
    OR (
      owner_type = 'listing'
      AND owner_id IN (
        SELECT id FROM public.listings WHERE seller_id = auth.uid()
      )
    )
    OR (
      owner_type = 'listing'
      AND public.current_role() = 'buyer'
      AND owner_id IN (
        SELECT id FROM public.listings WHERE is_active = true
      )
    )
    OR public.is_admin()
  );

-- UPDATE: only visibility toggling by uploader or admin, nothing else
CREATE POLICY ta_update_visibility
  ON public.trace_attachments FOR UPDATE
  USING (uploader_id = auth.uid() OR public.is_admin())
  WITH CHECK (uploader_id = auth.uid() OR public.is_admin());

-- No DELETE policy — client cannot delete attachments
