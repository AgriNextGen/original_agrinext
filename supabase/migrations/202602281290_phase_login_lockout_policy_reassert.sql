-- Reassert login lockout thresholds with a user-friendly first cooldown.
-- Policy:
--   * 1-9 failed attempts in 15-minute window: log only
--   * 10+ failed attempts: temporary 5-minute block
--   * 25+ failed attempts: restricted for 30 minutes
--   * 50+ failed attempts: locked pending admin review

create or replace function security.record_failed_login_v1(
  p_phone text,
  p_ip text default null,
  p_device_id text default null
)
returns void
language plpgsql
security definer
set search_path = public, audit
as $$
declare
  v_user profiles%rowtype;
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count int;
  v_blocked_until timestamptz := null;
  v_req uuid := audit.new_request_id_v1();
begin
  perform set_config('app.rpc','true', true);

  -- Prefer the newest profile if historical duplicates exist.
  select *
  into v_user
  from public.profiles
  where phone = p_phone
  order by created_at desc nulls last, id desc
  limit 1;

  if not found then
    perform audit.log_security_event_v1(
      v_req,
      'failed_login_unknown_phone',
      'low',
      null,
      null,
      p_ip,
      p_device_id,
      null,
      null,
      null,
      jsonb_build_object('phone', p_phone)
    );
    return;
  end if;

  -- Rolling 15-minute window for failed attempts.
  if v_user.failed_login_window_started_at is null
    or v_user.failed_login_window_started_at < v_now - interval '15 minutes'
  then
    v_window_start := v_now;
    v_count := 1;

    update public.profiles
      set failed_login_window_started_at = v_window_start,
          failed_login_count_window = 1,
          last_failed_login_at = v_now
    where id = v_user.id;
  else
    update public.profiles
      set failed_login_count_window = coalesce(failed_login_count_window, 0) + 1,
          last_failed_login_at = v_now
    where id = v_user.id;

    select failed_login_count_window into v_count
    from public.profiles
    where id = v_user.id;
  end if;

  if v_count >= 50 then
    update public.profiles
      set account_status = 'locked',
          blocked_until = null
    where id = v_user.id;

    perform audit.log_security_event_v1(
      v_req,
      'bruteforce_lock',
      'critical',
      v_user.id,
      null,
      p_ip,
      p_device_id,
      null,
      (select risk_score from public.profiles where id = v_user.id),
      null,
      jsonb_build_object('count', v_count)
    );
  elsif v_count >= 25 then
    v_blocked_until := v_now + interval '30 minutes';

    update public.profiles
      set account_status = 'restricted',
          blocked_until = v_blocked_until
    where id = v_user.id;

    perform audit.log_security_event_v1(
      v_req,
      'bruteforce_restricted',
      'high',
      v_user.id,
      null,
      p_ip,
      p_device_id,
      null,
      (select risk_score from public.profiles where id = v_user.id),
      v_blocked_until,
      jsonb_build_object('count', v_count)
    );
  elsif v_count >= 10 then
    v_blocked_until := v_now + interval '5 minutes';

    update public.profiles
      set blocked_until = v_blocked_until
    where id = v_user.id;

    perform audit.log_security_event_v1(
      v_req,
      'bruteforce_suspected',
      'medium',
      v_user.id,
      null,
      p_ip,
      p_device_id,
      null,
      (select risk_score from public.profiles where id = v_user.id),
      v_blocked_until,
      jsonb_build_object('count', v_count)
    );
  else
    perform audit.log_security_event_v1(
      v_req,
      'failed_login',
      'low',
      v_user.id,
      null,
      p_ip,
      p_device_id,
      null,
      (select risk_score from public.profiles where id = v_user.id),
      null,
      jsonb_build_object('count', v_count)
    );
  end if;
end;
$$;

grant execute on function security.record_failed_login_v1(text,text,text) to authenticated;
