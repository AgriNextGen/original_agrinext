-- ============================================================
-- PHASE B1: Critical Security Fixes
-- Migration: 202602210001_phase_b1_critical_security.sql
--
-- Scope: 6 P1-priority tables with active security holes
-- Rules: Additive only. No table/column drops. No renames.
-- Depends on: Phase A helper functions (current_role, is_admin, is_agent_assigned)
-- ============================================================

-- ============================================================
-- 1. trace_attachments
-- Was: INSERT = true (anyone), SELECT = true (anyone)
-- Now: Authenticated-only read/insert. No UPDATE/DELETE.
-- ============================================================

DROP POLICY IF EXISTS trace_attachments_insert ON public.trace_attachments;
DROP POLICY IF EXISTS trace_attachments_select ON public.trace_attachments;
DROP POLICY IF EXISTS trace_attachments_select_auth ON public.trace_attachments;
DROP POLICY IF EXISTS trace_attachments_insert_auth ON public.trace_attachments;

CREATE POLICY trace_attachments_select_auth
  ON public.trace_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL OR public.is_admin());

CREATE POLICY trace_attachments_insert_auth
  ON public.trace_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. transport_status_events
-- Was: SELECT = true (anyone), INSERT = actor_id check
-- Now: Scoped SELECT via transport_request/trip ownership. Append-only.
-- ============================================================

DROP POLICY IF EXISTS transport_status_events_select ON public.transport_status_events;
DROP POLICY IF EXISTS transport_status_events_insert ON public.transport_status_events;
DROP POLICY IF EXISTS tse_select ON public.transport_status_events;
DROP POLICY IF EXISTS tse_insert ON public.transport_status_events;

CREATE POLICY tse_select ON public.transport_status_events FOR SELECT
  USING (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.transport_requests tr
      WHERE tr.id = transport_status_events.transport_request_id
      AND tr.farmer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = transport_status_events.trip_id
      AND t.transporter_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY tse_insert ON public.transport_status_events FOR INSERT
  WITH CHECK (actor_id = auth.uid());

-- ============================================================
-- 3. agent_activity_logs
-- Was: SELECT = true (anyone can read all agent logs)
-- Now: Agent sees own logs only + admin. INSERT unchanged.
-- ============================================================

DROP POLICY IF EXISTS agent_activity_logs_select ON public.agent_activity_logs;
DROP POLICY IF EXISTS aal_select ON public.agent_activity_logs;

CREATE POLICY aal_select ON public.agent_activity_logs FOR SELECT
  USING (actor_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 4. agent_data
-- Was: FOR ALL = agent_id (agent can DELETE; no admin; no farmer)
-- Now: Explicit per-op. Farmer can see data about them. No DELETE.
-- ============================================================

DROP POLICY IF EXISTS agent_data_agent ON public.agent_data;
DROP POLICY IF EXISTS agent_data_select ON public.agent_data;
DROP POLICY IF EXISTS agent_data_insert ON public.agent_data;
DROP POLICY IF EXISTS agent_data_update ON public.agent_data;

CREATE POLICY agent_data_select ON public.agent_data FOR SELECT
  USING (
    agent_id = auth.uid()
    OR farmer_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY agent_data_insert ON public.agent_data FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY agent_data_update ON public.agent_data FOR UPDATE
  USING (agent_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 5. agent_visits
-- Was: FOR ALL = agent_id (agent can DELETE; no admin)
-- Now: Explicit per-op. Farmer can see visits. No DELETE.
-- ============================================================

DROP POLICY IF EXISTS agent_visits_agent ON public.agent_visits;
DROP POLICY IF EXISTS agent_visits_select ON public.agent_visits;
DROP POLICY IF EXISTS agent_visits_insert ON public.agent_visits;
DROP POLICY IF EXISTS agent_visits_update ON public.agent_visits;

CREATE POLICY agent_visits_select ON public.agent_visits FOR SELECT
  USING (
    agent_id = auth.uid()
    OR farmer_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY agent_visits_insert ON public.agent_visits FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY agent_visits_update ON public.agent_visits FOR UPDATE
  USING (agent_id = auth.uid() OR public.is_admin());

-- ============================================================
-- 6. agent_voice_notes
-- Was: FOR ALL = agent_id (agent can DELETE; no admin)
-- Now: Explicit per-op. Farmer can see notes. Immutable (no UPDATE/DELETE).
-- ============================================================

DROP POLICY IF EXISTS agent_voice_notes_agent ON public.agent_voice_notes;
DROP POLICY IF EXISTS agent_voice_notes_select ON public.agent_voice_notes;
DROP POLICY IF EXISTS agent_voice_notes_insert ON public.agent_voice_notes;

CREATE POLICY agent_voice_notes_select ON public.agent_voice_notes FOR SELECT
  USING (
    agent_id = auth.uid()
    OR farmer_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY agent_voice_notes_insert ON public.agent_voice_notes FOR INSERT
  WITH CHECK (agent_id = auth.uid());

-- END OF PHASE B1
