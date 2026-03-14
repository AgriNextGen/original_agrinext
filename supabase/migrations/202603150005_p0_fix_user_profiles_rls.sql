-- P0 CRITICAL: Add missing RLS policies to user_profiles table.
-- Migration 202602240101_create_user_profiles.sql created the table and enabled RLS
-- but defined ZERO policies. With RLS ON and no policies, every authenticated user
-- is denied access — the table behaves as if it's always empty.
--
-- Impact: useAuth.tsx (line 90) queries user_profiles as the PRIMARY source for
-- role determination. If this query returns empty (RLS block), the fallback chain
-- queries user_roles (admin-only RLS) → also blocked → realRole = null →
-- ALL users are treated as unauthenticated after login.

CREATE POLICY user_profiles_select ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_profiles_insert ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to update their own profile (e.g. display_name, is_active)
-- signup-by-phone uses upsert, so UPDATE permission is also needed
CREATE POLICY user_profiles_update ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
