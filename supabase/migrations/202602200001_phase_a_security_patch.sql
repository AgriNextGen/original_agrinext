-- ============================================================
-- PHASE A: Enterprise Security Patch
-- Migration: 202602200001_phase_a_security_patch.sql
--
-- Scope: 12 target tables in public schema
-- Rules: Additive only. No table drops. No column drops.
--        No renames. Backward compatible.
-- ============================================================

-- ============================================================
-- SECTION 1: Helper Functions
-- These must exist before any policy references them.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_agent_assigned(target_farmer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agent_farmer_assignments
    WHERE agent_id = auth.uid()
    AND farmer_id = target_farmer_id
    AND active = true
  );
$$;

-- ============================================================
-- SECTION 2: profiles
-- Keep existing per-op self policies. Add admin overlay.
-- ============================================================

CREATE POLICY profiles_admin_select
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY profiles_admin_update
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- SECTION 3: user_roles (CRITICAL privilege-escalation fix)
-- Drop client INSERT/UPDATE. Add admin-only write policies.
-- Keep user_roles_select_own (user reads own role).
-- handle_new_user() is SECURITY DEFINER — bypasses RLS.
-- ============================================================

DROP POLICY IF EXISTS user_roles_insert_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_own ON public.user_roles;

CREATE POLICY user_roles_admin_select
  ON public.user_roles FOR SELECT
  USING (public.is_admin());

CREATE POLICY user_roles_admin_insert
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY user_roles_admin_update
  ON public.user_roles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY user_roles_admin_delete
  ON public.user_roles FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- SECTION 4: farmlands
-- Replace FOR ALL with explicit per-op + agent + admin.
-- No DELETE policy (soft delete pattern).
-- ============================================================

DROP POLICY IF EXISTS farmlands_all_own ON public.farmlands;

CREATE POLICY farmlands_select
  ON public.farmlands FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR public.is_agent_assigned(farmer_id)
    OR public.is_admin()
  );

CREATE POLICY farmlands_insert
  ON public.farmlands FOR INSERT
  WITH CHECK (farmer_id = auth.uid());

CREATE POLICY farmlands_update
  ON public.farmlands FOR UPDATE
  USING (
    farmer_id = auth.uid()
    OR public.is_agent_assigned(farmer_id)
    OR public.is_admin()
  );

-- ============================================================
-- SECTION 5: crops
-- Same pattern as farmlands.
-- ============================================================

DROP POLICY IF EXISTS crops_all_own ON public.crops;

CREATE POLICY crops_select
  ON public.crops FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR public.is_agent_assigned(farmer_id)
    OR public.is_admin()
  );

CREATE POLICY crops_insert
  ON public.crops FOR INSERT
  WITH CHECK (farmer_id = auth.uid());

CREATE POLICY crops_update
  ON public.crops FOR UPDATE
  USING (
    farmer_id = auth.uid()
    OR public.is_agent_assigned(farmer_id)
    OR public.is_admin()
  );

-- ============================================================
-- SECTION 6: listings
-- Seller own + Agent assigned + Buyer browse active + Admin all.
-- ============================================================

DROP POLICY IF EXISTS listings_all_own ON public.listings;

CREATE POLICY listings_select
  ON public.listings FOR SELECT
  USING (
    seller_id = auth.uid()
    OR public.is_agent_assigned(seller_id)
    OR (is_active = true AND public.current_role() = 'buyer')
    OR public.is_admin()
  );

CREATE POLICY listings_insert
  ON public.listings FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY listings_update
  ON public.listings FOR UPDATE
  USING (
    seller_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================
-- SECTION 7: transport_requests
-- Farmer own + Logistics assigned/browse open + Admin all.
-- ============================================================

DROP POLICY IF EXISTS transport_requests_farmer_all ON public.transport_requests;
DROP POLICY IF EXISTS transport_requests_transporter_select ON public.transport_requests;

CREATE POLICY transport_requests_select
  ON public.transport_requests FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR transporter_id = auth.uid()
    OR (status = 'requested' AND public.current_role() = 'logistics')
    OR public.is_admin()
  );

CREATE POLICY transport_requests_insert
  ON public.transport_requests FOR INSERT
  WITH CHECK (farmer_id = auth.uid());

CREATE POLICY transport_requests_update
  ON public.transport_requests FOR UPDATE
  USING (
    farmer_id = auth.uid()
    OR transporter_id = auth.uid()
    OR public.is_admin()
  );

-- ============================================================
-- SECTION 8: trips
-- Transporter own + Farmer read via request + Admin.
-- No direct INSERT/UPDATE for non-admin (RPC only).
-- ============================================================

DROP POLICY IF EXISTS trips_transporter_all ON public.trips;

CREATE POLICY trips_select
  ON public.trips FOR SELECT
  USING (
    transporter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.transport_requests tr
      WHERE tr.assigned_trip_id = trips.id
      AND tr.farmer_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY trips_admin_update
  ON public.trips FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- SECTION 9: vehicles
-- Existing 4 per-op policies are correct. Add admin overlay.
-- ============================================================

CREATE POLICY vehicles_admin_select
  ON public.vehicles FOR SELECT
  USING (public.is_admin());

CREATE POLICY vehicles_admin_update
  ON public.vehicles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY vehicles_admin_insert
  ON public.vehicles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY vehicles_admin_delete
  ON public.vehicles FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- SECTION 10: market_orders
-- buyer_id FK references buyers.id, NOT auth.uid() directly.
-- Must join through buyers table for buyer access.
-- ============================================================

DROP POLICY IF EXISTS market_orders_buyer ON public.market_orders;
DROP POLICY IF EXISTS market_orders_farmer ON public.market_orders;

CREATE POLICY market_orders_select
  ON public.market_orders FOR SELECT
  USING (
    buyer_id IN (SELECT id FROM public.buyers WHERE user_id = auth.uid())
    OR farmer_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY market_orders_insert
  ON public.market_orders FOR INSERT
  WITH CHECK (
    buyer_id IN (SELECT id FROM public.buyers WHERE user_id = auth.uid())
  );

CREATE POLICY market_orders_update
  ON public.market_orders FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- SECTION 11: agent_farmer_assignments
-- Drop agent FOR ALL. Split into SELECT + UPDATE only.
-- Keep existing farmer_select policy.
-- ============================================================

DROP POLICY IF EXISTS agent_farmer_assignments_agent ON public.agent_farmer_assignments;

CREATE POLICY afa_agent_select
  ON public.agent_farmer_assignments FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY afa_agent_update
  ON public.agent_farmer_assignments FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY afa_admin_all
  ON public.agent_farmer_assignments FOR ALL
  USING (public.is_admin());

-- ============================================================
-- SECTION 12: agent_tasks
-- Drop agent FOR ALL. Split into SELECT + UPDATE only.
-- Keep existing farmer_select policy.
-- ============================================================

DROP POLICY IF EXISTS agent_tasks_agent ON public.agent_tasks;

CREATE POLICY agent_tasks_agent_select
  ON public.agent_tasks FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY agent_tasks_agent_update
  ON public.agent_tasks FOR UPDATE
  USING (agent_id = auth.uid());

CREATE POLICY agent_tasks_admin_all
  ON public.agent_tasks FOR ALL
  USING (public.is_admin());

-- ============================================================
-- SECTION 13: notifications
-- Replace FOR ALL with explicit per-op.
-- ============================================================

DROP POLICY IF EXISTS notifications_all_own ON public.notifications;

CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY notifications_insert
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- END OF PHASE A SECURITY PATCH
