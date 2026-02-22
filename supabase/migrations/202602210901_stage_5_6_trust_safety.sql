-- 202602210900_stage_5_6_trust_safety.sql
-- Stage 5.6: Trust, Fraud & Safety v2
-- Add account integrity fields, disputes table, payout_hold integration, RLS and triggers.

-- Add columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS blocked_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS risk_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS failed_login_count_window int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_login_window_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_failed_login_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check CHECK (account_status IN ('active','restricted','locked','under_review'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status_blocked ON public.profiles(account_status, blocked_until);
CREATE INDEX IF NOT EXISTS idx_profiles_risk_score_desc ON public.profiles(risk_score DESC);

-- Disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_role text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution text NULL,
  assigned_admin uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_entity_type_check') THEN
    ALTER TABLE public.disputes ADD CONSTRAINT disputes_entity_type_check CHECK (entity_type IN ('order','trip','payment'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_status_check') THEN
    ALTER TABLE public.disputes ADD CONSTRAINT disputes_status_check CHECK (status IN ('open','under_review','resolved','rejected','closed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_resolution_check') THEN
    ALTER TABLE public.disputes ADD CONSTRAINT disputes_resolution_check CHECK (resolution IS NULL OR resolution IN ('refund','no_refund','partial_refund','replacement','payout_hold','warning','ban'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_disputes_status_updated ON public.disputes(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_entity ON public.disputes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by_created ON public.disputes(opened_by, created_at DESC);

-- Payout hold integration
ALTER TABLE public.market_orders
  ADD COLUMN IF NOT EXISTS payout_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_hold_reason text NULL;

CREATE INDEX IF NOT EXISTS idx_market_orders_payout_hold ON public.market_orders(payout_hold, status);

-- Helper: entity access checker
CREATE OR REPLACE FUNCTION public._ts_can_access_entity(p_actor uuid, p_entity_type text, p_entity_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p_entity_type = 'order' THEN EXISTS (
      SELECT 1 FROM public.market_orders mo
      LEFT JOIN public.buyers b ON b.id = mo.buyer_id
      WHERE mo.id = p_entity_id AND (mo.farmer_id = p_actor OR (b.user_id IS NOT NULL AND b.user_id = p_actor))
    )
    WHEN p_entity_type = 'trip' THEN EXISTS (
      SELECT 1 FROM public.trips t
      LEFT JOIN public.transport_requests tr ON tr.id = t.transport_request_id
      WHERE t.id = p_entity_id AND (t.transporter_id = p_actor OR tr.farmer_id = p_actor)
    )
    WHEN p_entity_type = 'payment' THEN EXISTS (
      SELECT 1 FROM public.market_orders mo
      LEFT JOIN public.buyers b ON b.id = mo.buyer_id
      WHERE mo.id = p_entity_id AND (mo.farmer_id = p_actor OR (b.user_id IS NOT NULL AND b.user_id = p_actor))
    )
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public._ts_can_access_entity(uuid, text, uuid) TO authenticated;

-- RLS on disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY disputes_select_admin ON public.disputes FOR SELECT USING (public.is_admin());
CREATE POLICY disputes_select_owner ON public.disputes FOR SELECT USING (opened_by = auth.uid());
CREATE POLICY disputes_insert_authenticated ON public.disputes FOR INSERT WITH CHECK (public._ts_can_access_entity(auth.uid(), entity_type, entity_id));
CREATE POLICY disputes_update_admin ON public.disputes FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;

-- Triggers to write audit/workflow events on dispute open/update
CREATE OR REPLACE FUNCTION public._disputes_after_insert_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM audit.log_admin_action_v1(audit.new_request_id_v1(), 'DISPUTE_OPENED', auth.uid(), public.current_role(), NULL, 'dispute', NEW.id, NULL, NULL, NULL, NULL, jsonb_build_object('entity_type', NEW.entity_type, 'entity_id', NEW.entity_id, 'category', NEW.category));
  PERFORM audit.log_workflow_event_v1(audit.new_request_id_v1(), 'dispute', NEW.id, 'DISPUTE_OPENED', NEW.opened_by, NEW.opened_role, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('category', NEW.category));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disputes_after_insert ON public.disputes;
CREATE TRIGGER trg_disputes_after_insert AFTER INSERT ON public.disputes FOR EACH ROW EXECUTE PROCEDURE public._disputes_after_insert_trigger();

CREATE OR REPLACE FUNCTION public._disputes_after_update_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM audit.log_admin_action_v1(audit.new_request_id_v1(), 'DISPUTE_UPDATED', auth.uid(), public.current_role(), NULL, 'dispute', NEW.id, NULL, jsonb_build_object('old_status', OLD.status), jsonb_build_object('new_status', NEW.status), NULL, NULL, jsonb_build_object());
  PERFORM audit.log_workflow_event_v1(audit.new_request_id_v1(), 'dispute', NEW.id, 'DISPUTE_UPDATED', auth.uid(), public.current_role(), NULL, NULL, NULL, NULL, NULL, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disputes_after_update ON public.disputes;
CREATE TRIGGER trg_disputes_after_update AFTER UPDATE ON public.disputes FOR EACH ROW EXECUTE PROCEDURE public._disputes_after_update_trigger();

-- End migration
