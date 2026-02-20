-- ============================================================
-- PHASE B2: Domain Table Lockdown
-- Migration: 202602210002_phase_b2_domain_lockdown.sql
--
-- Scope: 6 P2-priority tables with overly broad FOR ALL policies
-- Rules: Additive only. No table/column drops. No renames.
-- Depends on: Phase A helper functions (current_role, is_admin, is_agent_assigned)
-- ============================================================

-- ============================================================
-- 1. buyers
-- Was: FOR ALL = user_id (buyer can DELETE; no admin)
-- Now: SELECT/INSERT/UPDATE only. No DELETE (FK to market_orders).
-- handle_new_user() is SECURITY DEFINER -- bypasses RLS for signup.
-- ============================================================

DROP POLICY IF EXISTS buyers_all_own ON public.buyers;

CREATE POLICY buyers_select ON public.buyers FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY buyers_insert ON public.buyers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY buyers_update ON public.buyers FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 2. transporters
-- Was: FOR ALL = user_id (transporter can DELETE; no admin)
-- Now: SELECT/INSERT/UPDATE only. No DELETE (FK to vehicles, trips).
-- handle_new_user() is SECURITY DEFINER -- bypasses RLS for signup.
-- ============================================================

DROP POLICY IF EXISTS transporters_all_own ON public.transporters;

CREATE POLICY transporters_select ON public.transporters FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY transporters_insert ON public.transporters FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY transporters_update ON public.transporters FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 3. crop_activity_logs
-- Was: FOR ALL via crop join (farmer can DELETE; no agent; no admin)
-- Now: Append-only. Farmer + assigned agent can SELECT/INSERT. No UPDATE/DELETE.
-- ============================================================

DROP POLICY IF EXISTS crop_activity_logs_via_crop ON public.crop_activity_logs;

CREATE POLICY cal_select ON public.crop_activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_activity_logs.crop_id AND c.farmer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_activity_logs.crop_id AND public.is_agent_assigned(c.farmer_id)
    )
    OR public.is_admin()
  );

CREATE POLICY cal_insert ON public.crop_activity_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_activity_logs.crop_id AND c.farmer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_activity_logs.crop_id AND public.is_agent_assigned(c.farmer_id)
    )
  );

-- ============================================================
-- 4. crop_media
-- Was: FOR ALL via crop join (farmer can DELETE anything; no agent; no admin)
-- Now: Farmer + agent can SELECT/INSERT. Farmer can DELETE own. No UPDATE.
-- ============================================================

DROP POLICY IF EXISTS crop_media_via_crop ON public.crop_media;

CREATE POLICY crop_media_select ON public.crop_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_media.crop_id AND c.farmer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_media.crop_id AND public.is_agent_assigned(c.farmer_id)
    )
    OR public.is_admin()
  );

CREATE POLICY crop_media_insert ON public.crop_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_media.crop_id AND c.farmer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_media.crop_id AND public.is_agent_assigned(c.farmer_id)
    )
  );

CREATE POLICY crop_media_delete ON public.crop_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.crops c
      WHERE c.id = crop_media.crop_id AND c.farmer_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ============================================================
-- 5. soil_test_reports
-- Was: 2x FOR ALL (farmer_id + uploaded_by) -- agent gets full DELETE
-- Now: Farmer + assigned agent SELECT/INSERT. Farmer DELETE own. Admin full.
-- ============================================================

DROP POLICY IF EXISTS soil_test_reports_farmer ON public.soil_test_reports;
DROP POLICY IF EXISTS soil_test_reports_uploader ON public.soil_test_reports;

CREATE POLICY str_select ON public.soil_test_reports FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR public.is_agent_assigned(farmer_id)
    OR public.is_admin()
  );

CREATE POLICY str_insert ON public.soil_test_reports FOR INSERT
  WITH CHECK (
    farmer_id = auth.uid()
    OR public.is_agent_assigned(farmer_id)
  );

CREATE POLICY str_update ON public.soil_test_reports FOR UPDATE
  USING (farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY str_delete ON public.soil_test_reports FOR DELETE
  USING (farmer_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 6. admin_users
-- Was: SELECT only (user_id = auth.uid()) -- no INSERT, no admin-sees-all
-- Now: Admin can see all + INSERT/UPDATE. User can see own + INSERT own.
-- ============================================================

DROP POLICY IF EXISTS admin_users_select ON public.admin_users;

CREATE POLICY admin_users_select ON public.admin_users FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY admin_users_insert ON public.admin_users FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY admin_users_update ON public.admin_users FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- END OF PHASE B2
