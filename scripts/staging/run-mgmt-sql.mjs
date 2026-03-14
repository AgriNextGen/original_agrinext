/**
 * AgriNext 10-Step SQL Execution via Supabase Management API
 * Uses PAT (Personal Access Token) from environment variables
 */
import { getMgmtApiConfig } from './common.mjs';

const { pat: PAT, projectRef: PROJECT, base: BASE } = getMgmtApiConfig();

async function execSQL(label, sql) {
  const SEP = '='.repeat(70);
  console.log(`\n${SEP}`);
  console.log(`  ${label}`);
  console.log(SEP);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${BASE}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      console.log(`❌ HTTP ${res.status}:`, JSON.stringify(data, null, 2));
      return null;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        console.log('✓ SUCCESS — 0 rows returned');
      } else {
        console.log(`✓ SUCCESS — ${data.length} row(s):`);
        console.table(data);
      }
    } else {
      console.log('✓ SUCCESS:', JSON.stringify(data, null, 2));
    }
    return data;
  } catch (e) {
    clearTimeout(timer);
    console.log(`❌ ERROR: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('AgriNext — 10-Step SQL Execution via Management API');
  console.log(`Project: ${PROJECT}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // ─── STEP 1a: Fix malformed phone ──────────────────────────────────────────
  await execSQL('STEP 1a: Fix malformed phone (id=1dd83d05)', `
UPDATE profiles
SET phone = '+919980092461'
WHERE id = '1dd83d05-56ae-458a-8913-6647dcfc6818'
  AND phone = '919980092461'
RETURNING id, phone
  `.trim());

  // ─── STEP 1b: Insert role for agent1 ───────────────────────────────────────
  await execSQL('STEP 1b: INSERT user_roles for agent1 (d5a49f11)', `
INSERT INTO user_roles (user_id, role)
VALUES ('d5a49f11-a8f5-41cd-8e5d-ec5da911b43d', 'agent')
ON CONFLICT (user_id) DO NOTHING
RETURNING user_id, role
  `.trim());

  // ─── STEP 1c: Insert role for malformed-phone account ──────────────────────
  await execSQL('STEP 1c: INSERT user_roles for farmer (1dd83d05)', `
INSERT INTO user_roles (user_id, role)
VALUES ('1dd83d05-56ae-458a-8913-6647dcfc6818', 'farmer')
ON CONFLICT (user_id) DO NOTHING
RETURNING user_id, role
  `.trim());

  // ─── STEP 2: A3 Verification ────────────────────────────────────────────────
  await execSQL('STEP 2: A3 Verification — must return 0 rows', `
SELECT p.phone, COUNT(ur.id) AS role_rows
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.phone
HAVING COUNT(ur.id) = 0
  `.trim());

  // ─── STEP 3: A4 — Fix buyers missing buyers row ─────────────────────────────
  await execSQL('STEP 3: A4 — Fix buyers missing buyers row', `
INSERT INTO buyers (user_id, name, phone)
SELECT p.id, COALESCE(p.full_name, 'User'), p.phone
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'buyer'
WHERE NOT EXISTS (SELECT 1 FROM buyers b WHERE b.user_id = p.id)
ON CONFLICT (user_id) DO UPDATE SET 
  name = COALESCE(EXCLUDED.name, buyers.name),
  phone = COALESCE(EXCLUDED.phone, buyers.phone)
RETURNING user_id, name, phone
  `.trim());

  // ─── STEP 4: Migration 1 — fix_login_attempt_limit ─────────────────────────
  await execSQL('STEP 4: Migration 1 — fix_login_attempt_limit', `
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
  v_first_lockout_threshold int := 10;
  v_restricted_threshold int := 25;
  v_locked_threshold int := 50;
begin
  perform set_config('app.rpc','true', true);

  select *
  into v_user
  from public.profiles
  where phone = p_phone
  order by created_at desc nulls last, id desc
  limit 1;

  if not found then
    begin
      perform audit.log_security_event_v1(
        v_req, 'failed_login_unknown_phone', 'low', null, null,
        p_ip, p_device_id, null, null, null,
        jsonb_build_object('phone', p_phone)
      );
    exception when others then null;
    end;
    return;
  end if;

  if v_user.failed_login_window_started_at is null
    or v_user.failed_login_window_started_at < v_now - interval '15 minutes'
  then
    update public.profiles
      set failed_login_window_started_at = v_now,
          failed_login_count_window = 1,
          last_failed_login_at = v_now
    where id = v_user.id;
    v_count := 1;
  else
    update public.profiles
      set failed_login_count_window = coalesce(failed_login_count_window, 0) + 1,
          last_failed_login_at = v_now
    where id = v_user.id;
    select failed_login_count_window into v_count
    from public.profiles where id = v_user.id;
  end if;

  if v_count >= v_locked_threshold then
    update public.profiles set account_status = 'locked', blocked_until = null where id = v_user.id;
    begin
      perform audit.log_security_event_v1(v_req,'bruteforce_lock','critical',v_user.id,null,p_ip,p_device_id,null,(select risk_score from public.profiles where id=v_user.id),null,jsonb_build_object('count',v_count));
    exception when others then null;
    end;
  elsif v_count >= v_restricted_threshold then
    v_blocked_until := v_now + interval '30 minutes';
    update public.profiles set account_status='restricted', blocked_until=v_blocked_until where id=v_user.id;
    begin
      perform audit.log_security_event_v1(v_req,'bruteforce_restricted','high',v_user.id,null,p_ip,p_device_id,null,(select risk_score from public.profiles where id=v_user.id),v_blocked_until,jsonb_build_object('count',v_count));
    exception when others then null;
    end;
  elsif v_count >= v_first_lockout_threshold then
    v_blocked_until := v_now + interval '5 minutes';
    update public.profiles set blocked_until=v_blocked_until where id=v_user.id;
    begin
      perform audit.log_security_event_v1(v_req,'bruteforce_suspected','medium',v_user.id,null,p_ip,p_device_id,null,(select risk_score from public.profiles where id=v_user.id),v_blocked_until,jsonb_build_object('count',v_count));
    exception when others then null;
    end;
  else
    begin
      perform audit.log_security_event_v1(v_req,'failed_login','low',v_user.id,null,p_ip,p_device_id,null,(select risk_score from public.profiles where id=v_user.id),null,jsonb_build_object('count',v_count));
    exception when others then null;
    end;
  end if;
end;
$$;

grant execute on function security.record_failed_login_v1(text,text,text) to authenticated;
  `.trim());

  // ─── STEP 5: Migration 2 — Enable RLS on 18 tables ──────────────────────────
  await execSQL('STEP 5: Migration 2 — Enable RLS on 18 tables', `
ALTER TABLE public.user_roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmlands                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_farmer_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_data                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_visits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_voice_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_test_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trace_attachments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_media                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_activity_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_sources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_segments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_fetch_logs             ENABLE ROW LEVEL SECURITY;
  `.trim());

  // ─── STEP 6: Migration 3 — profiles_self_update trigger ─────────────────────
  await execSQL('STEP 6a: Create profiles_block_security_column_updates function', `
CREATE OR REPLACE FUNCTION public.profiles_block_security_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (current_setting('app.rpc', true) = 'true') THEN RETURN NEW; END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;

  IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;
  IF OLD.risk_score IS DISTINCT FROM NEW.risk_score THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;
  IF OLD.blocked_until IS DISTINCT FROM NEW.blocked_until THEN
    RAISE EXCEPTION 'Security fields cannot be modified by user';
  END IF;

  RETURN NEW;
END;
$$;
  `.trim());

  await execSQL('STEP 6b: Drop + create trigger trg_profiles_block_security_updates', `
DROP TRIGGER IF EXISTS trg_profiles_block_security_updates ON public.profiles;
CREATE TRIGGER trg_profiles_block_security_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_security_column_updates();
  `.trim());

  await execSQL('STEP 6c: Drop + create profiles_self_update policy', `
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
  `.trim());

  // ─── STEP 7: Migration 4 — handle_new_user role guard ───────────────────────
  await execSQL('STEP 7a: Replace handle_new_user function', `
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_meta text;
  v_role_assign app_role;
  v_name text;
  v_phone text;
  v_auth_email text;
begin
  v_name := coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_role_meta := coalesce(NEW.raw_user_meta_data->>'role', 'farmer');

  v_role_assign := case
    when v_role_meta in ('farmer', 'buyer') then v_role_meta::app_role
    else 'farmer'::app_role
  end;

  v_auth_email := coalesce(
    NEW.raw_user_meta_data->>'auth_email',
    NEW.email,
    regexp_replace(coalesce(v_phone, ''), '\\D', '', 'g') || '@agrinext.local'
  );

  begin
    insert into public.profiles (id, full_name, phone, auth_email)
    values (NEW.id, v_name, v_phone, v_auth_email)
    on conflict (id) do update set
      full_name = coalesce(excluded.full_name, profiles.full_name),
      phone = coalesce(excluded.phone, profiles.phone),
      auth_email = coalesce(excluded.auth_email, profiles.auth_email);
  exception when others then
    raise warning 'handle_new_user: profiles upsert failed for user %, error: %', NEW.id, SQLERRM;
  end;

  begin
    insert into public.user_roles (user_id, role)
    values (NEW.id, v_role_assign)
    on conflict (user_id) do update set role = excluded.role;
  exception when others then
    raise warning 'handle_new_user: user_roles upsert failed for user %, error: %', NEW.id, SQLERRM;
  end;

  if v_role_assign = 'buyer' then
    begin
      insert into public.buyers (user_id, name, phone)
      values (NEW.id, v_name, v_phone)
      on conflict (user_id) do update set name = excluded.name, phone = excluded.phone;
    exception when others then
      raise warning 'handle_new_user: buyers upsert failed for user %, error: %', NEW.id, SQLERRM;
    end;
  end if;

  return NEW;
end;
$$;
  `.trim());

  await execSQL('STEP 7b: Recreate on_auth_user_created trigger', `
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
  `.trim());

  // ─── STEP 8: B1 Verification — rowsecurity check ────────────────────────────
  await execSQL('STEP 8: B1 Verification — all 18 tables rowsecurity=true', `
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles','farmlands','buyers','vehicles',
    'agent_farmer_assignments','agent_tasks','agent_data',
    'agent_activity_logs','agent_visits','agent_voice_notes',
    'admin_users','soil_test_reports','trace_attachments',
    'crop_media','crop_activity_logs','trusted_sources',
    'farmer_segments','web_fetch_logs'
  )
ORDER BY tablename;
  `.trim());

  // ─── STEP 9: B2 Verification — confirm trigger exists ───────────────────────
  await execSQL('STEP 9: B2 Verification — confirm trigger exists', `
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name = 'trg_profiles_block_security_updates';
  `.trim());

  // ─── STEP 10: B3 Verification — confirm handle_new_user blocks admin ─────────
  await execSQL('STEP 10: B3 Verification — handle_new_user source', `
SELECT prosrc
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = 'public'::regnamespace;
  `.trim());

  console.log('\n' + '='.repeat(70));
  console.log('  ALL 10 STEPS COMPLETE');
  console.log('='.repeat(70));
}

main().catch(console.error).finally(() => process.exit(0));
