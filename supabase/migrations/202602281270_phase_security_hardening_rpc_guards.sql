BEGIN;

-- Helper: central dev-tools eligibility check (admin role or allowlist entry)
CREATE OR REPLACE FUNCTION public.is_dev_tools_user_v1(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
  v_is_allowlisted boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'admin'
  ) INTO v_is_admin;

  IF to_regclass('public.dev_allowlist') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.dev_allowlist
      WHERE user_id = p_user_id
    ) INTO v_is_allowlisted;
  END IF;

  RETURN COALESCE(v_is_admin, false) OR COALESCE(v_is_allowlisted, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_dev_tools_user_v1(uuid) TO authenticated;

-- Harden support ticket creation (search_path + explicit auth check)
CREATE OR REPLACE FUNCTION public.create_support_ticket_v1(p_category text, p_entity_id uuid, p_message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true',true);

  INSERT INTO public.support_tickets (created_by, category, entity_id, message)
  VALUES (auth.uid(), p_category, p_entity_id, p_message)
  RETURNING id INTO v_id;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, payload, created_at)
    VALUES (
      auth.uid(),
      'SUPPORT_TICKET_CREATED',
      jsonb_build_object('ticket_id', v_id, 'category', p_category, 'entity_id', p_entity_id)::jsonb,
      now()
    );
  END IF;

  RETURN v_id;
END;
$$;

-- Harden admin RPCs (search_path + explicit admin authz)
CREATE OR REPLACE FUNCTION admin.update_ticket_status_v1(p_ticket_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, admin, audit
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true',true);
  UPDATE public.support_tickets SET status = p_status WHERE id = p_ticket_id;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, payload, created_at)
    VALUES (auth.uid(), 'SUPPORT_TICKET_STATUS_UPDATED', jsonb_build_object('ticket_id', p_ticket_id, 'status', p_status)::jsonb, now());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin.lock_user_v1(p_user_id uuid, p_lock boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, admin, audit
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true',true);
  UPDATE public.profiles SET is_locked = p_lock WHERE id = p_user_id;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, payload, created_at)
    VALUES (auth.uid(), 'ADMIN_USER_LOCK_TOGGLE', jsonb_build_object('user_id', p_user_id, 'locked', p_lock), now());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin.force_logout_user_v1(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, admin, audit
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM set_config('app.rpc','true',true);

  IF to_regclass('auth.refresh_tokens') IS NOT NULL THEN
    DELETE FROM auth.refresh_tokens WHERE user_id = p_user_id;
  END IF;

  IF to_regclass('audit.workflow_events') IS NOT NULL THEN
    INSERT INTO audit.workflow_events (actor_user_id, event_type, payload, created_at)
    VALUES (auth.uid(), 'ADMIN_FORCE_LOGOUT', jsonb_build_object('user_id', p_user_id), now());
  END IF;
END;
$$;

COMMIT;
