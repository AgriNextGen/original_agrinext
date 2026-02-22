-- ============================================================
-- PHASE A COMPLETE HARDENING -- Incremental Tightening
-- Migration: 202602210004_phase_a_complete_hardening.sql
--
-- Scope: 4 remaining gaps after Phase A + Phase B
-- Rules: Additive only. No table/column drops. No renames.
-- Depends on: Phase A helpers (current_role, is_admin, is_agent_assigned)
-- ============================================================

-- ============================================================
-- 1. agent_activity_logs -- Add farmer visibility
-- Was: SELECT = actor_id OR admin (farmer couldn't see logs about them)
-- Now: SELECT = actor_id OR farmer_id OR admin
-- ============================================================

DROP POLICY IF EXISTS aal_select ON public.agent_activity_logs;

CREATE POLICY aal_select ON public.agent_activity_logs FOR SELECT
  USING (
    actor_id = auth.uid()
    OR farmer_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================
-- 2. admin_users -- Tighten to admin-only
-- Was: user_id = auth.uid() OR is_admin() on SELECT/INSERT/UPDATE
-- Now: is_admin() only (redundant with user_roles; only admins use this)
-- ============================================================

DROP POLICY IF EXISTS admin_users_select ON public.admin_users;
DROP POLICY IF EXISTS admin_users_insert ON public.admin_users;
DROP POLICY IF EXISTS admin_users_update ON public.admin_users;

CREATE POLICY admin_users_select ON public.admin_users FOR SELECT
  USING (public.is_admin());

CREATE POLICY admin_users_insert ON public.admin_users FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY admin_users_update ON public.admin_users FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- 3. farmer_segments -- Restrict to admin-only read
-- Was: SELECT = true for authenticated
-- Now: SELECT = admin only (internal segmentation data)
-- ============================================================

DROP POLICY IF EXISTS farmer_segments_select ON public.farmer_segments;
DROP POLICY IF EXISTS farmer_segments_select_admin ON public.farmer_segments;

CREATE POLICY farmer_segments_select_admin
  ON public.farmer_segments FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 4. trusted_sources -- Restrict to admin-only read
-- Was: SELECT = true for authenticated
-- Now: SELECT = admin only (system config data)
-- ============================================================

DROP POLICY IF EXISTS trusted_sources_select ON public.trusted_sources;
DROP POLICY IF EXISTS trusted_sources_select_admin ON public.trusted_sources;

CREATE POLICY trusted_sources_select_admin
  ON public.trusted_sources FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- 5. web_fetch_logs -- Restrict to admin-only read
-- Was: SELECT = true for authenticated
-- Now: SELECT = admin only (internal system logs)
-- ============================================================

DROP POLICY IF EXISTS web_fetch_logs_select ON public.web_fetch_logs;
DROP POLICY IF EXISTS web_fetch_logs_select_admin ON public.web_fetch_logs;

CREATE POLICY web_fetch_logs_select_admin
  ON public.web_fetch_logs FOR SELECT
  USING (public.is_admin());

-- END OF PHASE A COMPLETE HARDENING
