-- 202602210915_stage_5_6_rpcs.sql
-- Stage 5.6 RPCs: account admin controls, dispute workflows, security recorders, risk jobs

-- Admin: set account status (audit + workflow)
CREATE OR REPLACE FUNCTION admin.set_account_status_v1(
  p_user_id uuid,
  p_new_status text,
  p_reason text,
  p_blocked_until timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_prev jsonb;
  v_new jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  SELECT jsonb_build_object('account_status', account_status, 'blocked_until', blocked_until, 'risk_score', risk_score) INTO v_prev FROM public.profiles WHERE id = p_user_id;
  UPDATE public.profiles SET account_status = p_new_status, blocked_until = p_blocked_until WHERE id = p_user_id;
  SELECT jsonb_build_object('account_status', p_new_status, 'blocked_until', p_blocked_until) INTO v_new;

  PERFORM audit.log_admin_action_v1(v_req, 'SET_ACCOUNT_STATUS', auth.uid(), 'admin', p_user_id, 'user', p_user_id, p_reason, v_prev, v_new, NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'user', p_user_id, 'USER_STATUS_CHANGED', auth.uid(), 'admin', NULL, NULL, NULL, NULL, NULL, jsonb_build_object('new_status', p_new_status, 'reason', p_reason));
END;
$$;
GRANT EXECUTE ON FUNCTION admin.set_account_status_v1(uuid,text,text,timestamptz) TO authenticated;

-- Admin: reset risk score
CREATE OR REPLACE FUNCTION admin.reset_risk_score_v1(p_user_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_prev jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);
  SELECT jsonb_build_object('risk_score', risk_score, 'failed_login_count_window', failed_login_count_window) INTO v_prev FROM public.profiles WHERE id = p_user_id;
  UPDATE public.profiles SET risk_score = 0, failed_login_count_window = 0, failed_login_window_started_at = NULL WHERE id = p_user_id;
  PERFORM audit.log_admin_action_v1(v_req, 'RESET_RISK_SCORE', auth.uid(), 'admin', p_user_id, 'user', p_user_id, p_reason, v_prev, jsonb_build_object('risk_score', 0), NULL, NULL, '{}'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.reset_risk_score_v1(uuid,text) TO authenticated;

-- Admin: add risk score
CREATE OR REPLACE FUNCTION admin.add_risk_score_v1(p_user_id uuid, p_delta int, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_prev jsonb;
  v_new_score int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);
  SELECT jsonb_build_object('risk_score', risk_score) INTO v_prev FROM public.profiles WHERE id = p_user_id;
  UPDATE public.profiles SET risk_score = GREATEST(0, COALESCE(risk_score,0) + p_delta) WHERE id = p_user_id;
  SELECT risk_score INTO v_new_score FROM public.profiles WHERE id = p_user_id;
  PERFORM audit.log_admin_action_v1(v_req, 'ADD_RISK_SCORE', auth.uid(), 'admin', p_user_id, 'user', p_user_id, p_reason, v_prev, jsonb_build_object('risk_score', v_new_score), NULL, NULL, jsonb_build_object('delta', p_delta));
END;
$$;
GRANT EXECUTE ON FUNCTION admin.add_risk_score_v1(uuid,int,text) TO authenticated;

-- Public: open dispute
CREATE OR REPLACE FUNCTION public.open_dispute_v1(
  p_entity_type text,
  p_entity_id uuid,
  p_category text,
  p_description text
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
  PERFORM set_config('app.rpc','true', true);

  -- access check
  IF NOT public._ts_can_access_entity(auth.uid(), p_entity_type, p_entity_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO public.disputes(entity_type, entity_id, opened_by, opened_role, category, description)
  VALUES (p_entity_type, p_entity_id, auth.uid(), COALESCE(v_role,'unknown'), COALESCE(p_category,'other'), p_description)
  RETURNING id INTO v_id;

  PERFORM audit.log_workflow_event_v1(v_req, 'dispute', v_id, 'DISPUTE_OPENED', auth.uid(), COALESCE(v_role,'unknown'), NULL, NULL, NULL, NULL, NULL, jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'category', p_category));

  IF p_entity_type = 'order' THEN
    UPDATE public.market_orders SET payout_hold = true, payout_hold_reason = 'dispute_open' WHERE id = p_entity_id;
    PERFORM admin.build_ops_inbox_item_v1('dispute_backlog','order', p_entity_id, 'high', 'Order dispute opened, payout held', jsonb_build_object('dispute_id', v_id));
  ELSE
    PERFORM admin.build_ops_inbox_item_v1('dispute_backlog', p_entity_type, p_entity_id, 'medium', 'Dispute opened', jsonb_build_object('dispute_id', v_id));
  END IF;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.open_dispute_v1(text,uuid,text,text) TO authenticated;

-- Admin: assign dispute
CREATE OR REPLACE FUNCTION admin.assign_dispute_v1(p_dispute_id uuid, p_admin_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_prev jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);
  SELECT row_to_json(d.*)::jsonb INTO v_prev FROM public.disputes d WHERE d.id = p_dispute_id;
  UPDATE public.disputes SET assigned_admin = p_admin_id WHERE id = p_dispute_id;
  PERFORM audit.log_admin_action_v1(v_req, 'DISPUTE_ASSIGNED', auth.uid(), 'admin', NULL, 'dispute', p_dispute_id, NULL, v_prev, jsonb_build_object('assigned_admin', p_admin_id), NULL, NULL, '{}'::jsonb);
  PERFORM audit.log_workflow_event_v1(v_req, 'dispute', p_dispute_id, 'DISPUTE_ASSIGNED', auth.uid(), 'admin', NULL, NULL, NULL, NULL, NULL, jsonb_build_object('assigned_admin', p_admin_id));
END;
$$;
GRANT EXECUTE ON FUNCTION admin.assign_dispute_v1(uuid,uuid) TO authenticated;

-- Admin: set dispute status / resolution
CREATE OR REPLACE FUNCTION admin.set_dispute_status_v1(p_dispute_id uuid, p_status text, p_resolution text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_prev jsonb;
  v_row record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);
  SELECT * INTO v_row FROM public.disputes WHERE id = p_dispute_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  v_prev := row_to_json(v_row)::jsonb;

  UPDATE public.disputes SET status = p_status, resolution = p_resolution, resolved_by = auth.uid(), resolved_at = now() WHERE id = p_dispute_id;

  -- If order dispute resolved, clear payout_hold if no other open disputes for same order
  IF v_row.entity_type = 'order' AND p_status IN ('resolved','closed') THEN
    PERFORM 1 FROM public.disputes d WHERE d.entity_type = 'order' AND d.entity_id = v_row.entity_id AND d.id <> p_dispute_id AND d.status IN ('open','under_review');
    IF NOT FOUND THEN
      UPDATE public.market_orders SET payout_hold = false, payout_hold_reason = NULL WHERE id = v_row.entity_id;
    END IF;
  END IF;

  PERFORM audit.log_admin_action_v1(v_req, 'DISPUTE_STATUS_UPDATED', auth.uid(), 'admin', NULL, 'dispute', p_dispute_id, p_note, v_prev, (SELECT row_to_json(d.*)::jsonb FROM public.disputes d WHERE d.id = p_dispute_id), NULL, NULL, jsonb_build_object('note', p_note));
  PERFORM audit.log_workflow_event_v1(v_req, 'dispute', p_dispute_id, 'DISPUTE_RESOLVED', auth.uid(), 'admin', NULL, NULL, NULL, NULL, NULL, jsonb_build_object('status', p_status, 'resolution', p_resolution));
END;
$$;
GRANT EXECUTE ON FUNCTION admin.set_dispute_status_v1(uuid,text,text,text) TO authenticated;

-- Security: record failed login (windowing + thresholds)
CREATE OR REPLACE FUNCTION security.record_failed_login_v1(p_phone text, p_ip text DEFAULT NULL, p_device_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_user profiles%ROWTYPE;
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count int;
  v_blocked_until timestamptz := NULL;
  v_req uuid := audit.new_request_id_v1();
BEGIN
  PERFORM set_config('app.rpc','true', true);
  SELECT * INTO v_user FROM public.profiles WHERE phone = p_phone LIMIT 1;
  IF NOT FOUND THEN
    -- Unknown phone: record security event only
    PERFORM audit.log_security_event_v1(v_req, 'failed_login_unknown_phone', 'low', NULL, NULL, p_ip, p_device_id, NULL, NULL, NULL, jsonb_build_object('phone', p_phone));
    RETURN;
  END IF;

  -- initialize window if needed (15 min window)
  IF v_user.failed_login_window_started_at IS NULL OR v_user.failed_login_window_started_at < v_now - interval '15 minutes' THEN
    v_window_start := v_now;
    v_count := 1;
    UPDATE public.profiles SET failed_login_window_started_at = v_window_start, failed_login_count_window = 1, last_failed_login_at = v_now WHERE id = v_user.id;
  ELSE
    UPDATE public.profiles SET failed_login_count_window = COALESCE(failed_login_count_window,0) + 1, last_failed_login_at = v_now WHERE id = v_user.id;
    SELECT failed_login_count_window INTO v_count FROM public.profiles WHERE id = v_user.id;
  END IF;

  -- thresholds: 5 -> 5min block; 10 -> restricted 30min; 20 -> locked (admin)
  IF v_count >= 20 THEN
    UPDATE public.profiles SET account_status = 'locked', blocked_until = NULL WHERE id = v_user.id;
    PERFORM audit.log_security_event_v1(v_req, 'bruteforce_lock', 'critical', v_user.id, NULL, p_ip, p_device_id, NULL, (SELECT risk_score FROM public.profiles WHERE id = v_user.id), NULL, jsonb_build_object('count', v_count));
  ELSIF v_count >= 10 THEN
    v_blocked_until := v_now + interval '30 minutes';
    UPDATE public.profiles SET account_status = 'restricted', blocked_until = v_blocked_until WHERE id = v_user.id;
    PERFORM audit.log_security_event_v1(v_req, 'bruteforce_restricted', 'high', v_user.id, NULL, p_ip, p_device_id, NULL, (SELECT risk_score FROM public.profiles WHERE id = v_user.id), v_blocked_until, jsonb_build_object('count', v_count));
  ELSIF v_count >= 5 THEN
    v_blocked_until := v_now + interval '5 minutes';
    UPDATE public.profiles SET blocked_until = v_blocked_until WHERE id = v_user.id;
    PERFORM audit.log_security_event_v1(v_req, 'bruteforce_suspected', 'medium', v_user.id, NULL, p_ip, p_device_id, NULL, (SELECT risk_score FROM public.profiles WHERE id = v_user.id), v_blocked_until, jsonb_build_object('count', v_count));
  ELSE
    PERFORM audit.log_security_event_v1(v_req, 'failed_login', 'low', v_user.id, NULL, p_ip, p_device_id, NULL, (SELECT risk_score FROM public.profiles WHERE id = v_user.id), NULL, jsonb_build_object('count', v_count));
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION security.record_failed_login_v1(text,text,text) TO authenticated;

-- Admin: risk evaluation job (aggregates security_events into risk_score and applies restrictions)
CREATE OR REPLACE FUNCTION admin.risk_evaluate_recent_v1(p_lookback_hours int DEFAULT 24)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_from timestamptz := now() - (p_lookback_hours || ' hours')::interval;
  rec record;
  v_req uuid := audit.new_request_id_v1();
  v_changes jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() AND current_setting('app.rpc', true) <> 'true' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  FOR rec IN
    SELECT actor_user_id, severity, event_type, count(*) AS cnt
    FROM audit.security_events
    WHERE created_at >= v_from AND actor_user_id IS NOT NULL
    GROUP BY actor_user_id, severity, event_type
  LOOP
    -- weight by severity
    PERFORM set_config('app.rpc','true', true);
    UPDATE public.profiles
    SET risk_score = GREATEST(0, COALESCE(risk_score,0) + (CASE rec.severity WHEN 'critical' THEN 6 WHEN 'high' THEN 4 WHEN 'medium' THEN 2 ELSE 1 END) * rec.cnt)
    WHERE id = rec.actor_user_id;

    -- capture change for ops inbox when threshold crossed
    PERFORM admin.build_ops_inbox_item_v1('high_risk_payment_activity','user', rec.actor_user_id, 'high', 'High risk signals detected for user', jsonb_build_object('event_type', rec.event_type, 'severity', rec.severity, 'count', rec.cnt));
  END LOOP;

  -- After updates, create workflow event
  PERFORM audit.log_workflow_event_v1(v_req, 'system', NULL, 'RISK_EVALUATION_RUN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('lookback_hours', p_lookback_hours));
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.risk_evaluate_recent_v1(int) TO authenticated;

-- Admin: risk decay job
CREATE OR REPLACE FUNCTION admin.risk_decay_v1(p_days_without_incident int DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_cutoff timestamptz := now() - (p_days_without_incident || ' days')::interval;
  v_req uuid := audit.new_request_id_v1();
BEGIN
  IF NOT public.is_admin() AND current_setting('app.rpc', true) <> 'true' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  -- decrement risk_score by 2 for profiles with no recent security events
  UPDATE public.profiles p
  SET risk_score = GREATEST(0, COALESCE(risk_score,0) - 2)
  WHERE NOT EXISTS (SELECT 1 FROM audit.security_events se WHERE se.actor_user_id = p.id AND se.created_at >= v_cutoff)
    AND COALESCE(p.risk_score,0) > 0
    AND (p.account_status IS DISTINCT FROM 'locked'); -- do not auto-unlock locked

  PERFORM audit.log_workflow_event_v1(v_req, 'system', NULL, 'RISK_DECAY_RUN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('days_without_incident', p_days_without_incident));
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.risk_decay_v1(int) TO authenticated;

-- Admin: dispute SLA watcher
CREATE OR REPLACE FUNCTION admin.dispute_sla_watch_v1(p_max_hours_open int DEFAULT 48)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_cutoff timestamptz := now() - (p_max_hours_open || ' hours')::interval;
  r record;
  v_req uuid := audit.new_request_id_v1();
BEGIN
  IF NOT public.is_admin() AND current_setting('app.rpc', true) <> 'true' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true', true);

  FOR r IN SELECT * FROM public.disputes WHERE status = 'open' AND created_at < v_cutoff LOOP
    PERFORM admin.build_ops_inbox_item_v1('dispute_backlog', 'dispute', r.id, 'high', 'Dispute SLA breached', jsonb_build_object('opened_at', r.created_at));
    PERFORM audit.log_workflow_event_v1(v_req, 'dispute', r.id, 'DISPUTE_SLA_BREACH', NULL, NULL, NULL, NULL, NULL, NULL, NULL, jsonb_build_object('created_at', r.created_at));
  END LOOP;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.dispute_sla_watch_v1(int) TO authenticated;

