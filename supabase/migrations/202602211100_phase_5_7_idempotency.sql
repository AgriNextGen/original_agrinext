-- 202602211100_phase_5_7_idempotency.sql
-- Phase 5.7: idempotency_keys table and consume helper

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  response jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_actor_action_key ON public.idempotency_keys(actor_id, action_type, key);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY idempotency_select_owner ON public.idempotency_keys FOR SELECT USING (actor_id = auth.uid() OR public.is_admin());
CREATE POLICY idempotency_insert_rpc ON public.idempotency_keys FOR INSERT WITH CHECK (public.is_admin() OR current_setting('app.rpc', true) = 'true');

-- Helper: consume idempotency key. Returns true if key inserted (not seen before), false if existed.
CREATE OR REPLACE FUNCTION public.consume_idempotency_key_v1(
  p_action_type text,
  p_key text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  PERFORM set_config('app.rpc','true', true);
  SELECT EXISTS (SELECT 1 FROM public.idempotency_keys WHERE actor_id = auth.uid() AND action_type = p_action_type AND key = p_key) INTO v_exists;
  IF v_exists THEN
    RETURN false;
  END IF;
  INSERT INTO public.idempotency_keys(key, actor_id, action_type, entity_type, entity_id) VALUES (p_key, auth.uid(), p_action_type, p_entity_type, p_entity_id);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_idempotency_key_v1(text, text, text, uuid) TO authenticated;

