-- Phase C5: Storage Lockdown
-- Make all buckets private, replace FOR ALL policies with scoped per-operation policies

-- ============================================================
-- STEP 1: MAKE PUBLIC BUCKETS PRIVATE
-- ============================================================

UPDATE storage.buckets SET public = false WHERE id IN ('crop-media', 'traceability-media');

-- ============================================================
-- STEP 2: DROP ALL EXISTING FOR ALL POLICIES
-- ============================================================

DROP POLICY IF EXISTS "crop-media_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "traceability-media_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "soil-reports_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "trip-proofs_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "voice_media_authenticated" ON storage.objects;

-- ============================================================
-- STEP 3: NEW SELECT POLICIES (read via signed URLs or path prefix)
-- ============================================================

-- Authenticated users can read objects in their own path prefix for any bucket
CREATE POLICY storage_select_own_path
  ON storage.objects FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin can read all storage objects
CREATE POLICY storage_select_admin
  ON storage.objects FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- STEP 4: NEW INSERT POLICIES (restricted to signed URLs only)
-- ============================================================

-- No direct client INSERT policy. Uploads must go through
-- the storage-sign-upload-v1 Edge Function which uses service role.
-- The service role bypasses RLS, so no INSERT policy is needed.

-- ============================================================
-- STEP 5: UPDATE/DELETE — admin only
-- ============================================================

CREATE POLICY storage_update_admin
  ON storage.objects FOR UPDATE
  USING (public.is_admin());

CREATE POLICY storage_delete_admin
  ON storage.objects FOR DELETE
  USING (public.is_admin());
