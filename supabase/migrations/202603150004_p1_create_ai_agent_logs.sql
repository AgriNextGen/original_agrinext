-- P1 MEDIUM: Create ai_agent_logs table.
-- Referenced in useAgentDashboard.tsx (useAIVisitPrioritization, useAIClusterSummary,
-- useAILogs hooks) but the table did not exist.
-- Without this table, every agent AI call would log a 404 PostgREST error after
-- successfully getting the AI response — and history queries would always fail.

CREATE TABLE IF NOT EXISTS public.ai_agent_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_type      text        NOT NULL,
  input_context jsonb,
  output_text   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_agent_id
  ON public.ai_agent_logs(agent_id);

CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_created_at
  ON public.ai_agent_logs(created_at DESC);

ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;

-- Agents can only see their own logs
CREATE POLICY ai_agent_logs_select ON public.ai_agent_logs
  FOR SELECT USING (agent_id = auth.uid() OR public.is_admin());

-- Agents (and service-role Edge Functions) can insert
CREATE POLICY ai_agent_logs_insert ON public.ai_agent_logs
  FOR INSERT WITH CHECK (agent_id = auth.uid());
