-- P1 MEDIUM: Create ai_transport_logs table.
-- Referenced in useLogisticsDashboard.tsx (useAITransportLogs hook) but the table
-- did not exist — only ai_farmer_logs existed (202602161100_ai_farmer_logs_web_cache.sql).
-- Without this table, every logistics AI log query returns a 404 PostgREST error.

CREATE TABLE IF NOT EXISTS public.ai_transport_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_type        text        NOT NULL,
  input_data      jsonb,
  output_text     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_transport_logs_transporter_id
  ON public.ai_transport_logs(transporter_id);

CREATE INDEX IF NOT EXISTS idx_ai_transport_logs_created_at
  ON public.ai_transport_logs(created_at DESC);

ALTER TABLE public.ai_transport_logs ENABLE ROW LEVEL SECURITY;

-- Transporters can only see their own logs
CREATE POLICY ai_transport_logs_select ON public.ai_transport_logs
  FOR SELECT USING (transporter_id = auth.uid() OR public.is_admin());

-- Transporters (and service-role Edge Functions) can insert
CREATE POLICY ai_transport_logs_insert ON public.ai_transport_logs
  FOR INSERT WITH CHECK (transporter_id = auth.uid());
