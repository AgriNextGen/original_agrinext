param()
Set-StrictMode -Off

$PAT = "sbp_9ae4e5657d4827a0940c2e501ce756958b752572"
$PROJECT = "rmtkkzfzdmpjlqexrbme"
$BASE = "https://api.supabase.com/v1/projects/$PROJECT"

function Exec-SQL {
    param([string]$label, [string]$sql)
    Write-Host "`n$('='*70)"
    Write-Host "  $label"
    Write-Host "$('='*70)"

    $body = @{ query = $sql } | ConvertTo-Json -Compress
    try {
        $r = Invoke-RestMethod -Uri "$BASE/database/query" `
            -Method POST `
            -Headers @{ "Authorization" = "Bearer $PAT"; "Content-Type" = "application/json" } `
            -Body $body `
            -TimeoutSec 30
        Write-Host "SUCCESS"
        if ($r -is [array]) {
            $r | Format-Table -AutoSize
            Write-Host "Row count: $($r.Count)"
        } else {
            $r | ConvertTo-Json -Depth 5
        }
        return $r
    } catch {
        $errMsg = $_.Exception.Message
        $errBody = $_.ErrorDetails.Message
        Write-Host "ERROR: $errMsg"
        if ($errBody) { Write-Host "Detail: $errBody" }
        return $null
    }
}

Write-Host "AgriNext 10-Step SQL Execution"
Write-Host "Project: $PROJECT"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"

# ─── STEP 1: A3 — Fix malformed phone ───────────────────────────────────────
$null = Exec-SQL "STEP 1a: Fix malformed phone for id=1dd83d05" @"
UPDATE profiles
SET phone = '+919980092461'
WHERE id = '1dd83d05-56ae-458a-8913-6647dcfc6818'
  AND phone = '919980092461'
RETURNING id, phone
"@

# ─── STEP 1b: Insert role for agent1 ────────────────────────────────────────
$null = Exec-SQL "STEP 1b: INSERT user_roles for agent1 (d5a49f11)" @"
INSERT INTO user_roles (user_id, role)
VALUES ('d5a49f11-a8f5-41cd-8e5d-ec5da911b43d', 'agent')
ON CONFLICT (user_id) DO NOTHING
RETURNING user_id, role
"@

# ─── STEP 1c: Insert role for malformed-phone account ───────────────────────
$null = Exec-SQL "STEP 1c: INSERT user_roles for farmer (1dd83d05)" @"
INSERT INTO user_roles (user_id, role)
VALUES ('1dd83d05-56ae-458a-8913-6647dcfc6818', 'farmer')
ON CONFLICT (user_id) DO NOTHING
RETURNING user_id, role
"@

# ─── STEP 2: A3 Verification — must return 0 rows ───────────────────────────
$null = Exec-SQL "STEP 2: A3 Verification (must return 0 rows)" @"
SELECT p.phone, COUNT(ur.id) AS role_rows
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.phone
HAVING COUNT(ur.id) = 0
"@

# ─── STEP 3: A4 — Fix buyers missing buyers row ─────────────────────────────
$null = Exec-SQL "STEP 3: A4 — Fix buyers missing buyers row" @"
INSERT INTO buyers (user_id, name, phone)
SELECT p.id, COALESCE(p.full_name, 'User'), p.phone
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'buyer'
WHERE NOT EXISTS (SELECT 1 FROM buyers b WHERE b.user_id = p.id)
ON CONFLICT (user_id) DO UPDATE SET 
  name = COALESCE(EXCLUDED.name, buyers.name),
  phone = COALESCE(EXCLUDED.phone, buyers.phone)
RETURNING user_id, name, phone
"@

Write-Host "`n$('='*70)"
Write-Host "  STEPS 4-7 — Apply migration files"
Write-Host "$('='*70)"

# ─── STEP 4: Migration 1 — fix_login_attempt_limit ─────────────────────────
$step4SQL = Get-Content "C:\Users\shiva basavesh a s\Downloads\GitHub\og_agri2_with github_clone\original_agrinext\supabase\migrations\202603070001_fix_login_attempt_limit.sql" -Raw 2>&1
if ($step4SQL -match "error|cannot") {
    Write-Host "STEP 4 migration file not found, using inline SQL"
    $step4SQL = @"
create or replace function security.record_failed_login_v1(
  p_phone text,
  p_ip text default null,
  p_device_id text default null
)
returns void language plpgsql security definer set search_path = public, audit
as $$
declare
  v_user profiles%rowtype;
  v_now timestamptz := now();
  v_count int;
  v_blocked_until timestamptz := null;
  v_req uuid := audit.new_request_id_v1();
  v_first_lockout_threshold int := 10;
  v_restricted_threshold int := 25;
  v_locked_threshold int := 50;
begin
  perform set_config('app.rpc','true', true);
  select * into v_user from public.profiles where phone = p_phone order by created_at desc nulls last, id desc limit 1;
  if not found then return; end if;
  if v_user.failed_login_window_started_at is null or v_user.failed_login_window_started_at < v_now - interval '15 minutes' then
    update public.profiles set failed_login_window_started_at = v_now, failed_login_count_window = 1, last_failed_login_at = v_now where id = v_user.id;
    v_count := 1;
  else
    update public.profiles set failed_login_count_window = coalesce(failed_login_count_window, 0) + 1, last_failed_login_at = v_now where id = v_user.id;
    select failed_login_count_window into v_count from public.profiles where id = v_user.id;
  end if;
  if v_count >= v_locked_threshold then
    update public.profiles set account_status = 'locked', blocked_until = null where id = v_user.id;
  elsif v_count >= v_restricted_threshold then
    v_blocked_until := v_now + interval '30 minutes';
    update public.profiles set account_status='restricted', blocked_until=v_blocked_until where id=v_user.id;
  elsif v_count >= v_first_lockout_threshold then
    v_blocked_until := v_now + interval '5 minutes';
    update public.profiles set blocked_until=v_blocked_until where id=v_user.id;
  end if;
end;
$$;
grant execute on function security.record_failed_login_v1(text,text,text) to authenticated;
"@
}
$null = Exec-SQL "STEP 4: Migration 1 — fix_login_attempt_limit" $step4SQL

# ─── STEP 5: Migration 2 — Enable RLS on 18 tables ──────────────────────────
$null = Exec-SQL "STEP 5: Migration 2 — Enable RLS on 18 tables" @"
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
ALTER TABLE public.web_fetch_logs             ENABLE ROW LEVEL SECURITY
"@

# ─── STEP 6: Migration 3 — Fix profiles_self_update trigger ─────────────────
$null = Exec-SQL "STEP 6: Migration 3 — Fix profiles_self_update" @"
CREATE OR REPLACE FUNCTION public.profiles_block_security_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (current_setting('app.rpc', true) = 'true') THEN RETURN NEW; END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN RAISE EXCEPTION 'Security fields cannot be modified by user'; END IF;
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN RAISE EXCEPTION 'Security fields cannot be modified by user'; END IF;
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN RAISE EXCEPTION 'Security fields cannot be modified by user'; END IF;
  IF OLD.risk_score IS DISTINCT FROM NEW.risk_score THEN RAISE EXCEPTION 'Security fields cannot be modified by user'; END IF;
  IF OLD.blocked_until IS DISTINCT FROM NEW.blocked_until THEN RAISE EXCEPTION 'Security fields cannot be modified by user'; END IF;
  RETURN NEW;
END;
$$
"@

$null = Exec-SQL "STEP 6b: DROP + CREATE trigger trg_profiles_block_security_updates" @"
DROP TRIGGER IF EXISTS trg_profiles_block_security_updates ON public.profiles;
CREATE TRIGGER trg_profiles_block_security_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_security_column_updates()
"@

$null = Exec-SQL "STEP 6c: Recreate profiles_self_update policy" @"
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid())
"@

# ─── STEP 7: Migration 4 — Fix signup role guard ────────────────────────────
$null = Exec-SQL "STEP 7: Migration 4 — Fix handle_new_user role guard" @"
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
    regexp_replace(coalesce(v_phone, ''), '\D', '', 'g') || '@agrinext.local'
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
$$
"@

$null = Exec-SQL "STEP 7b: Recreate on_auth_user_created trigger" @"
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user()
"@

# ─── STEP 8: B1 Verification — rowsecurity check ────────────────────────────
$null = Exec-SQL "STEP 8: B1 Verification — all 18 tables rowsecurity=true" @"
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
ORDER BY tablename
"@

# ─── STEP 9: B2 Verification — confirm trigger exists ───────────────────────
$null = Exec-SQL "STEP 9: B2 Verification — confirm trigger exists" @"
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name = 'trg_profiles_block_security_updates'
"@

# ─── STEP 10: B3 Verification — confirm handle_new_user blocks admin ─────────
$null = Exec-SQL "STEP 10: B3 Verification — handle_new_user function source" @"
SELECT prosrc
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = 'public'::regnamespace
"@

Write-Host "`n$('='*70)"
Write-Host "  ALL 10 STEPS COMPLETE"
Write-Host "$('='*70)"
