-- Phase 5.3: Ops UI + AI-Assisted Operations
-- Additive only. Does NOT weaken RLS.

-- ============================================================
-- 1.1  Enhance public.support_tickets (additive ALTER)
-- ============================================================

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS entity_type text NULL,
  ADD COLUMN IF NOT EXISTS role text NULL,
  ADD COLUMN IF NOT EXISTS assigned_admin uuid NULL;

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.support_tickets
        ADD CONSTRAINT support_tickets_assigned_admin_fkey
        FOREIGN KEY (assigned_admin) REFERENCES auth.users(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- Widen category CHECK to include payment + kyc
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN ('trip','order','listing','account','payment','kyc','other'));

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority_updated
  ON public.support_tickets (status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_entity
  ON public.support_tickets (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_creator
  ON public.support_tickets (created_by, created_at DESC);


-- ============================================================
-- 1.2  public.ops_inbox_items (admin-only materialized inbox)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ops_inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','snoozed','resolved')),
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ops_inbox_item UNIQUE (item_type, entity_type, entity_id)
);

ALTER TABLE public.ops_inbox_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY ops_inbox_select_admin ON public.ops_inbox_items
  FOR SELECT USING (public.is_admin());
CREATE POLICY ops_inbox_insert_admin ON public.ops_inbox_items
  FOR INSERT WITH CHECK (public.is_admin() OR current_setting('app.rpc',true) = 'true');
CREATE POLICY ops_inbox_update_admin ON public.ops_inbox_items
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ops_inbox_delete_admin ON public.ops_inbox_items
  FOR DELETE USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_ops_inbox_status_severity
  ON public.ops_inbox_items (status, severity, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_inbox_item_type
  ON public.ops_inbox_items (item_type, status, updated_at DESC);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_ops_inbox_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_ops_inbox_updated_at
  BEFORE UPDATE ON public.ops_inbox_items
  FOR EACH ROW EXECUTE FUNCTION public.update_ops_inbox_updated_at();


-- ============================================================
-- 1.3  audit.ai_outputs (admin-only AI suggestion store)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit.ai_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'fallback',
  input_hash text NULL,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NULL,
  status text NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','accepted','rejected')),
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit.ai_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_outputs_select_admin ON audit.ai_outputs
  FOR SELECT USING (public.is_admin());
CREATE POLICY ai_outputs_insert_rpc ON audit.ai_outputs
  FOR INSERT WITH CHECK (public.is_admin() OR current_setting('app.rpc',true) = 'true');
CREATE POLICY ai_outputs_update_admin ON audit.ai_outputs
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_ai_outputs_target
  ON audit.ai_outputs (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_status
  ON audit.ai_outputs (status, created_at DESC);


-- ============================================================
-- 1.4  public.agent_voice_note_summaries
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_voice_note_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_note_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  summary text,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF to_regclass('public.agent_voice_notes') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.agent_voice_note_summaries
        ADD CONSTRAINT avns_voice_note_fkey FOREIGN KEY (voice_note_id) REFERENCES public.agent_voice_notes(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  BEGIN
    ALTER TABLE public.agent_voice_note_summaries
      ADD CONSTRAINT avns_agent_fkey FOREIGN KEY (agent_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$ LANGUAGE plpgsql;

ALTER TABLE public.agent_voice_note_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY avns_select_own ON public.agent_voice_note_summaries
  FOR SELECT USING (agent_id = auth.uid() OR public.is_admin());
CREATE POLICY avns_insert_rpc ON public.agent_voice_note_summaries
  FOR INSERT WITH CHECK (public.is_admin() OR current_setting('app.rpc',true) = 'true');
CREATE POLICY avns_update_own ON public.agent_voice_note_summaries
  FOR UPDATE USING (agent_id = auth.uid() OR public.is_admin())
  WITH CHECK (agent_id = auth.uid() OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_avns_voice_note
  ON public.agent_voice_note_summaries (voice_note_id);
CREATE INDEX IF NOT EXISTS idx_avns_agent
  ON public.agent_voice_note_summaries (agent_id, created_at DESC);


-- ============================================================
-- 2.1  RPC: admin.get_ops_inbox_v1 (cursor-paginated)
-- ============================================================

CREATE OR REPLACE FUNCTION admin.get_ops_inbox_v1(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz;
  v_cursor_id uuid;
  v_where text := '';
  v_sql text;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb;
  v_count int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  IF p_filters ? 'item_type' THEN
    v_where := v_where || format(' AND item_type = %L', p_filters->>'item_type');
  END IF;
  IF p_filters ? 'severity' THEN
    v_where := v_where || format(' AND severity = %L', p_filters->>'severity');
  END IF;
  IF p_filters ? 'status' THEN
    v_where := v_where || format(' AND status = %L', p_filters->>'status');
  ELSE
    v_where := v_where || ' AND status = ''open''';
  END IF;
  IF p_filters ? 'entity_type' THEN
    v_where := v_where || format(' AND entity_type = %L', p_filters->>'entity_type');
  END IF;

  v_sql := 'SELECT id, item_type, entity_type, entity_id, severity, status, summary, metadata, updated_at FROM public.ops_inbox_items WHERE 1=1 ' || v_where;

  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (updated_at, id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY updated_at DESC, id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE _tmp_ops ON COMMIT DROP AS %s', v_sql);
  SELECT count(*) INTO v_count FROM _tmp_ops;
  SELECT jsonb_agg(row_to_json(t)) INTO v_items
    FROM (SELECT * FROM _tmp_ops ORDER BY updated_at DESC, id DESC LIMIT v_limit) t;

  IF v_count > v_limit THEN
    SELECT row_to_json(r)::jsonb INTO v_next_cursor
      FROM (SELECT updated_at, id FROM _tmp_ops ORDER BY updated_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items,'[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.get_ops_inbox_v1(jsonb,int,jsonb) TO authenticated;


-- ============================================================
-- 2.2  RPC: admin.build_ops_inbox_item_v1 (upsert, dedup)
-- ============================================================

CREATE OR REPLACE FUNCTION admin.build_ops_inbox_item_v1(
  p_item_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_severity text DEFAULT 'medium',
  p_summary text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT (public.is_admin() OR current_setting('app.rpc',true) = 'true') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  PERFORM set_config('app.rpc','true',true);

  INSERT INTO public.ops_inbox_items (item_type, entity_type, entity_id, severity, summary, metadata)
  VALUES (p_item_type, p_entity_type, p_entity_id, p_severity, p_summary, p_metadata)
  ON CONFLICT ON CONSTRAINT uq_ops_inbox_item
  DO UPDATE SET severity = EXCLUDED.severity, summary = EXCLUDED.summary,
    metadata = EXCLUDED.metadata, status = 'open', updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION admin.build_ops_inbox_item_v1(text,text,uuid,text,text,jsonb) TO authenticated;


-- ============================================================
-- 2.3  RPC: admin.entity_360_v1
-- ============================================================

CREATE OR REPLACE FUNCTION admin.entity_360_v1(
  p_entity_type text,
  p_entity_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_core jsonb;
  v_timeline jsonb;
  v_tickets jsonb;
  v_security_count int;
  v_related jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  -- core entity
  IF p_entity_type = 'user' THEN
    SELECT row_to_json(t)::jsonb INTO v_core FROM (
      SELECT p.id, p.full_name, p.phone, p.email, p.village, p.district, p.taluk, p.is_locked, p.created_at,
        (SELECT array_agg(ur.role) FROM user_roles ur WHERE ur.user_id = p.id) AS roles
      FROM profiles p WHERE p.id = p_entity_id
    ) t;
  ELSIF p_entity_type = 'order' THEN
    SELECT row_to_json(t)::jsonb INTO v_core FROM (
      SELECT mo.id, mo.status, mo.payment_status, mo.total_amount, mo.buyer_id, mo.farmer_id, mo.crop_id, mo.listing_id, mo.updated_at,
        (SELECT full_name FROM profiles WHERE id = mo.farmer_id) AS farmer_name,
        (SELECT full_name FROM profiles WHERE id = mo.buyer_id) AS buyer_name
      FROM market_orders mo WHERE mo.id = p_entity_id
    ) t;
    IF v_core IS NOT NULL THEN
      v_related := jsonb_build_object(
        'listing_id', v_core->>'listing_id',
        'crop_id', v_core->>'crop_id',
        'buyer_id', v_core->>'buyer_id',
        'farmer_id', v_core->>'farmer_id'
      );
    END IF;
  ELSIF p_entity_type = 'trip' THEN
    SELECT row_to_json(t)::jsonb INTO v_core FROM (
      SELECT tr.id, tr.status::text AS status, tr.transporter_id, tr.transport_request_id, tr.updated_at,
        (SELECT full_name FROM profiles WHERE id = tr.transporter_id) AS transporter_name,
        (SELECT farmer_id FROM transport_requests WHERE id = tr.transport_request_id) AS farmer_id
      FROM trips tr WHERE tr.id = p_entity_id
    ) t;
    IF v_core IS NOT NULL THEN
      v_related := jsonb_build_object(
        'transport_request_id', v_core->>'transport_request_id',
        'transporter_id', v_core->>'transporter_id',
        'farmer_id', v_core->>'farmer_id'
      );
    END IF;
  ELSIF p_entity_type = 'listing' THEN
    SELECT row_to_json(t)::jsonb INTO v_core FROM (
      SELECT l.id, l.status, l.crop_name, l.variety, l.price_per_unit, l.available_quantity, l.seller_id, l.updated_at,
        (SELECT full_name FROM profiles WHERE id = l.seller_id) AS seller_name
      FROM listings l WHERE l.id = p_entity_id
    ) t;
    IF v_core IS NOT NULL THEN
      v_related := jsonb_build_object('seller_id', v_core->>'seller_id');
    END IF;
  END IF;

  -- timeline (last 50 events)
  SELECT jsonb_agg(row_to_json(ev)) INTO v_timeline FROM (
    SELECT w.created_at, w.event_type, w.actor_user_id, w.metadata
    FROM audit.workflow_events w
    WHERE w.entity_type = p_entity_type AND w.entity_id = p_entity_id
    ORDER BY w.created_at DESC LIMIT 50
  ) ev;

  -- open support tickets
  SELECT jsonb_agg(row_to_json(tk)) INTO v_tickets FROM (
    SELECT st.id, st.category, st.message, st.status, st.priority, st.created_at
    FROM public.support_tickets st
    WHERE (st.entity_id = p_entity_id OR st.entity_type = p_entity_type)
      AND st.entity_id = p_entity_id
      AND st.status IN ('open','in_progress')
    ORDER BY st.created_at DESC LIMIT 20
  ) tk;

  -- security events count
  SELECT count(*) INTO v_security_count
  FROM audit.security_events
  WHERE metadata->>'entity_id' = p_entity_id::text
    AND created_at > now() - interval '30 days';

  RETURN jsonb_build_object(
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'core', v_core,
    'timeline', COALESCE(v_timeline, '[]'::jsonb),
    'tickets', COALESCE(v_tickets, '[]'::jsonb),
    'related', v_related,
    'security_events_30d', v_security_count
  );
END;
$$;
GRANT EXECUTE ON FUNCTION admin.entity_360_v1(text,uuid) TO authenticated;


-- ============================================================
-- 2.4  RPC: admin.assign_ticket_v1
-- ============================================================

CREATE OR REPLACE FUNCTION admin.assign_ticket_v1(
  p_ticket_id uuid,
  p_admin_user_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  UPDATE public.support_tickets SET assigned_admin = p_admin_user_id WHERE id = p_ticket_id;

  PERFORM audit.log_admin_action_v1(
    v_req, 'TICKET_ASSIGNED', auth.uid(), 'admin',
    NULL, 'support_ticket', p_ticket_id,
    'Assigned to ' || p_admin_user_id::text,
    NULL, jsonb_build_object('assigned_admin', p_admin_user_id)
  );
  PERFORM audit.log_workflow_event_v1(
    v_req, 'support_ticket', p_ticket_id, 'TICKET_ASSIGNED',
    auth.uid(), 'admin', NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('assigned_admin', p_admin_user_id)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION admin.assign_ticket_v1(uuid,uuid) TO authenticated;


-- ============================================================
-- 2.5  RPC: admin.update_ticket_status_v2 (enhanced with audit)
-- ============================================================

CREATE OR REPLACE FUNCTION admin.update_ticket_status_v2(
  p_ticket_id uuid,
  p_status text,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_old_status text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  SELECT status INTO v_old_status FROM public.support_tickets WHERE id = p_ticket_id;
  UPDATE public.support_tickets SET status = p_status WHERE id = p_ticket_id;

  PERFORM audit.log_admin_action_v1(
    v_req, 'TICKET_STATUS_UPDATED', auth.uid(), 'admin',
    NULL, 'support_ticket', p_ticket_id, p_note,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_status)
  );
  PERFORM audit.log_workflow_event_v1(
    v_req, 'support_ticket', p_ticket_id, 'TICKET_STATUS_UPDATED',
    auth.uid(), 'admin', NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('old_status', v_old_status, 'new_status', p_status, 'note', p_note)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION admin.update_ticket_status_v2(uuid,text,text) TO authenticated;


-- ============================================================
-- 2.6  RPC: admin.override_trip_status_v1
-- ============================================================

CREATE OR REPLACE FUNCTION admin.override_trip_status_v1(
  p_trip_id uuid,
  p_new_status text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_old_status text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  SELECT status::text INTO v_old_status FROM public.trips WHERE id = p_trip_id;
  IF v_old_status IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  UPDATE public.trips SET status = p_new_status::trip_status, updated_at = now() WHERE id = p_trip_id;

  PERFORM audit.log_admin_action_v1(
    v_req, 'TRIP_ADMIN_OVERRIDE', auth.uid(), 'admin',
    NULL, 'trip', p_trip_id, p_reason,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_new_status)
  );
  PERFORM audit.log_workflow_event_v1(
    v_req, 'trip', p_trip_id, 'TRIP_ADMIN_OVERRIDE',
    auth.uid(), 'admin', NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status, 'reason', p_reason)
  );

  RETURN jsonb_build_object('ok', true, 'request_id', v_req);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.override_trip_status_v1(uuid,text,text) TO authenticated;


-- ============================================================
-- 2.7  RPC: admin.unlock_user_v1
-- ============================================================

CREATE OR REPLACE FUNCTION admin.unlock_user_v1(
  p_user_id uuid,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  UPDATE public.profiles SET is_locked = false WHERE user_id = p_user_id;

  PERFORM audit.log_admin_action_v1(
    v_req, 'USER_UNLOCKED', auth.uid(), 'admin',
    p_user_id, 'user', p_user_id, p_reason,
    jsonb_build_object('is_locked', true),
    jsonb_build_object('is_locked', false)
  );
  PERFORM audit.log_workflow_event_v1(
    v_req, 'user', p_user_id, 'USER_UNLOCKED',
    auth.uid(), 'admin', NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION admin.unlock_user_v1(uuid,text) TO authenticated;


-- ============================================================
-- 2.8  RPC: admin.accept_ai_suggestion_v1
-- ============================================================

CREATE OR REPLACE FUNCTION admin.accept_ai_suggestion_v1(
  p_ai_output_id uuid,
  p_accept boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_output record;
  v_new_status text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  SELECT * INTO v_output FROM audit.ai_outputs WHERE id = p_ai_output_id;
  IF v_output.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  v_new_status := CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END;
  UPDATE audit.ai_outputs SET status = v_new_status WHERE id = p_ai_output_id;

  -- If accepting a ticket triage, apply the suggestions
  IF p_accept AND v_output.target_type = 'ticket' THEN
    UPDATE public.support_tickets
    SET category = COALESCE((v_output.output->>'suggested_category'), category),
        priority = COALESCE((v_output.output->>'suggested_priority'), priority)
    WHERE id = v_output.target_id;
  END IF;

  PERFORM audit.log_admin_action_v1(
    v_req, 'AI_SUGGESTION_' || upper(v_new_status), auth.uid(), 'admin',
    NULL, v_output.target_type, v_output.target_id, NULL,
    jsonb_build_object('ai_output_id', p_ai_output_id, 'status', 'suggested'),
    jsonb_build_object('ai_output_id', p_ai_output_id, 'status', v_new_status)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION admin.accept_ai_suggestion_v1(uuid,boolean) TO authenticated;


-- ============================================================
-- 2.9  RPC: public.create_support_ticket_v2 (entity_type + enqueue triage)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_support_ticket_v2(
  p_category text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_message text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_id uuid;
  v_role text;
  v_req uuid := audit.new_request_id_v1();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.support_tickets (created_by, category, entity_type, entity_id, message, role)
  VALUES (auth.uid(), p_category, p_entity_type, p_entity_id, p_message, v_role)
  RETURNING id INTO v_id;

  -- audit
  PERFORM audit.log_workflow_event_v1(
    v_req, 'support_ticket', v_id, 'SUPPORT_TICKET_CREATED',
    auth.uid(), v_role, NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('category', p_category, 'entity_type', p_entity_type, 'entity_id', p_entity_id)
  );

  -- enqueue AI triage job
  PERFORM public.enqueue_job_v1(
    'ai_ticket_triage_v1',
    jsonb_build_object('ticket_id', v_id),
    now(),
    v_id::text
  );

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_support_ticket_v2(text,text,uuid,text) TO authenticated;


-- ============================================================
-- 2.10  RPC: admin.list_tickets_v1 (cursor-paginated)
-- ============================================================

CREATE OR REPLACE FUNCTION admin.list_tickets_v1(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz;
  v_cursor_id uuid;
  v_where text := '';
  v_sql text;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb;
  v_count int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  IF p_filters ? 'status' THEN
    v_where := v_where || format(' AND status = %L', p_filters->>'status');
  END IF;
  IF p_filters ? 'priority' THEN
    v_where := v_where || format(' AND priority = %L', p_filters->>'priority');
  END IF;
  IF p_filters ? 'category' THEN
    v_where := v_where || format(' AND category = %L', p_filters->>'category');
  END IF;

  v_sql := 'SELECT id, created_by, category, entity_type, entity_id, message, status, priority, assigned_admin, role, updated_at, created_at FROM public.support_tickets WHERE 1=1 ' || v_where;
  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (updated_at, id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY updated_at DESC, id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE _tmp_tickets ON COMMIT DROP AS %s', v_sql);
  SELECT count(*) INTO v_count FROM _tmp_tickets;
  SELECT jsonb_agg(row_to_json(t)) INTO v_items
    FROM (SELECT * FROM _tmp_tickets ORDER BY updated_at DESC, id DESC LIMIT v_limit) t;

  IF v_count > v_limit THEN
    SELECT row_to_json(r)::jsonb INTO v_next_cursor
      FROM (SELECT updated_at, id FROM _tmp_tickets ORDER BY updated_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items,'[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.list_tickets_v1(jsonb,int,jsonb) TO authenticated;


-- ============================================================
-- 2.11  RPC: admin.list_ai_outputs_v1 (cursor-paginated)
-- ============================================================

CREATE OR REPLACE FUNCTION admin.list_ai_outputs_v1(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = audit
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz;
  v_cursor_id uuid;
  v_where text := '';
  v_sql text;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb;
  v_count int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'created_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  IF p_filters ? 'status' THEN
    v_where := v_where || format(' AND status = %L', p_filters->>'status');
  END IF;
  IF p_filters ? 'target_type' THEN
    v_where := v_where || format(' AND target_type = %L', p_filters->>'target_type');
  END IF;

  v_sql := 'SELECT id, target_type, target_id, provider, output, confidence, status, created_at FROM audit.ai_outputs WHERE 1=1 ' || v_where;
  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (created_at, id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY created_at DESC, id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE _tmp_ai ON COMMIT DROP AS %s', v_sql);
  SELECT count(*) INTO v_count FROM _tmp_ai;
  SELECT jsonb_agg(row_to_json(t)) INTO v_items
    FROM (SELECT * FROM _tmp_ai ORDER BY created_at DESC, id DESC LIMIT v_limit) t;

  IF v_count > v_limit THEN
    SELECT row_to_json(r)::jsonb INTO v_next_cursor
      FROM (SELECT created_at, id FROM _tmp_ai ORDER BY created_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items,'[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.list_ai_outputs_v1(jsonb,int,jsonb) TO authenticated;


-- ============================================================
-- Done: Phase 5.3 migration complete
-- ============================================================
