-- ============================================================
-- PHASE B3: Reference Data Policy Cleanup
-- Migration: 202602210003_phase_b3_reference_data_cleanup.sql
--
-- Scope: 7 reference/support tables with duplicate or missing write policies
-- Rules: Additive only. No table/column drops. No renames.
-- ============================================================

-- ============================================================
-- 1. karnataka_districts
-- Was: 2 duplicate SELECT = true. No write protection.
-- Now: 1 SELECT = true + admin-only write.
-- ============================================================

DROP POLICY IF EXISTS karnataka_districts_select ON public.karnataka_districts;
DROP POLICY IF EXISTS karnataka_districts_select_all ON public.karnataka_districts;
DROP POLICY IF EXISTS karnataka_districts_read ON public.karnataka_districts;
DROP POLICY IF EXISTS karnataka_districts_admin_write ON public.karnataka_districts;

CREATE POLICY karnataka_districts_read
  ON public.karnataka_districts FOR SELECT
  USING (true);

CREATE POLICY karnataka_districts_admin_write
  ON public.karnataka_districts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 2. market_prices
-- Was: 2 duplicate SELECT = true. No write protection.
-- Now: 1 SELECT = true + admin-only write.
-- ============================================================

DROP POLICY IF EXISTS market_prices_select ON public.market_prices;
DROP POLICY IF EXISTS market_prices_select_all ON public.market_prices;
DROP POLICY IF EXISTS market_prices_read ON public.market_prices;
DROP POLICY IF EXISTS market_prices_admin_write ON public.market_prices;

CREATE POLICY market_prices_read
  ON public.market_prices FOR SELECT
  USING (true);

CREATE POLICY market_prices_admin_write
  ON public.market_prices FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3. market_prices_agg
-- Was: 2 duplicate SELECT = true. No write protection.
-- Now: 1 SELECT = true + admin-only write.
-- ============================================================

DROP POLICY IF EXISTS market_prices_agg_select ON public.market_prices_agg;
DROP POLICY IF EXISTS market_prices_agg_select_all ON public.market_prices_agg;
DROP POLICY IF EXISTS market_prices_agg_read ON public.market_prices_agg;
DROP POLICY IF EXISTS market_prices_agg_admin_write ON public.market_prices_agg;

CREATE POLICY market_prices_agg_read
  ON public.market_prices_agg FOR SELECT
  USING (true);

CREATE POLICY market_prices_agg_admin_write
  ON public.market_prices_agg FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 4. roles (legacy)
-- Was: 2 duplicate SELECT = true. No write protection.
-- Now: 1 SELECT = true + admin-only write.
-- ============================================================

DROP POLICY IF EXISTS roles_select ON public.roles;
DROP POLICY IF EXISTS roles_select_all ON public.roles;
DROP POLICY IF EXISTS roles_read ON public.roles;
DROP POLICY IF EXISTS roles_admin_write ON public.roles;

CREATE POLICY roles_read
  ON public.roles FOR SELECT
  USING (true);

CREATE POLICY roles_admin_write
  ON public.roles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. farmer_segments
-- Was: SELECT = true for authenticated. No write protection.
-- Now: Keep existing SELECT + add admin-only write.
-- ============================================================

DROP POLICY IF EXISTS farmer_segments_admin_write ON public.farmer_segments;

CREATE POLICY farmer_segments_admin_write
  ON public.farmer_segments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 6. trusted_sources
-- Was: SELECT = true for authenticated. No write protection.
-- Now: Keep existing SELECT + add admin-only write.
-- ============================================================

DROP POLICY IF EXISTS trusted_sources_admin_write ON public.trusted_sources;

CREATE POLICY trusted_sources_admin_write
  ON public.trusted_sources FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 7. web_fetch_logs
-- Was: SELECT = true for authenticated. No write protection.
-- Now: Keep existing SELECT + add admin-only write.
-- ============================================================

DROP POLICY IF EXISTS web_fetch_logs_admin_write ON public.web_fetch_logs;

CREATE POLICY web_fetch_logs_admin_write
  ON public.web_fetch_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- END OF PHASE B3
