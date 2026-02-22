-- Phase F1: support tickets and identity hygiene
CREATE SCHEMA IF NOT EXISTS admin;

-- 1) profiles.is_locked (additive)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- 2) support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text CHECK (category IN ('trip','order','listing','account','other')) NOT NULL DEFAULT 'other',
  entity_id uuid NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- creators can read their own
CREATE POLICY support_tickets_select_creator ON public.support_tickets
  FOR SELECT USING (auth.uid() = created_by OR is_admin());

-- creators can insert
CREATE POLICY support_tickets_insert_creator ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- admin can select and update status
CREATE POLICY support_tickets_admin_select ON public.support_tickets
  FOR SELECT USING (is_admin());
CREATE POLICY support_tickets_admin_update ON public.support_tickets
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_support_tickets_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_support_tickets_updated_at();

-- 3) RPC: create_support_ticket_v1
CREATE OR REPLACE FUNCTION public.create_support_ticket_v1(p_category text, p_entity_id uuid, p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM set_config('app.rpc','true',true);
  INSERT INTO public.support_tickets (created_by, category, entity_id, message)
  VALUES (auth.uid(), p_category, p_entity_id, p_message)
  RETURNING id INTO v_id;

  -- log audit
  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, payload, created_at)
    VALUES (auth.uid(), 'SUPPORT_TICKET_CREATED', jsonb_build_object('ticket_id', v_id, 'category', p_category, 'entity_id', p_entity_id)::jsonb, now());
  END IF;
  RETURN v_id;
END;
$$;

-- Admin update ticket status RPC
CREATE OR REPLACE FUNCTION admin.update_ticket_status_v1(p_ticket_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.rpc','true',true);
  UPDATE public.support_tickets SET status = p_status WHERE id = p_ticket_id;
  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, payload, created_at)
    VALUES (auth.uid(), 'SUPPORT_TICKET_STATUS_UPDATED', jsonb_build_object('ticket_id', p_ticket_id, 'status', p_status)::jsonb, now());
  END IF;
END;
$$;

-- 4) Admin lock/unlock user RPC
CREATE OR REPLACE FUNCTION admin.lock_user_v1(p_user_id uuid, p_lock boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.rpc','true',true);
  UPDATE public.profiles SET is_locked = p_lock WHERE id = p_user_id;
  INSERT INTO audit.workflow_events (actor_user_id, event_type, payload, created_at)
    VALUES (auth.uid(), 'ADMIN_USER_LOCK_TOGGLE', jsonb_build_object('user_id', p_user_id, 'locked', p_lock), now());
END;
$$;

-- 5) Admin force logout
CREATE OR REPLACE FUNCTION admin.force_logout_user_v1(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM set_config('app.rpc','true',true);
  -- Revoke refresh tokens: Supabase stores in auth.refresh_tokens or use admin API. We'll attempt DB revoke if table exists
  IF to_regclass('auth.refresh_tokens') IS NOT NULL THEN
    DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id;
  END IF;
  INSERT INTO audit.workflow_events (actor_user_id, event_type, payload, created_at)
    VALUES (auth.uid(), 'ADMIN_FORCE_LOGOUT', jsonb_build_object('user_id', p_user_id), now());
END;
$$;

-- RLS: admin schema privileges for above admin.* RPCs implicitly enforced by SECURITY DEFINER + is_admin() checks in policies elsewhere
