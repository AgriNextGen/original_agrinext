-- 202602220007_signup_login_schema_fix.sql
-- Fix signup/login DB errors by aligning profile columns and transporters schema,
-- and ensuring RLS insert policy for profiles.

-- Profiles: columns required by auth trigger + login-by-phone
alter table public.profiles
  add column if not exists auth_email text,
  add column if not exists account_status text not null default 'active',
  add column if not exists blocked_until timestamptz null,
  add column if not exists risk_score int not null default 0,
  add column if not exists last_login_at timestamptz null,
  add column if not exists failed_login_count_window int not null default 0,
  add column if not exists failed_login_window_started_at timestamptz null,
  add column if not exists last_failed_login_at timestamptz null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_status_check') then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active','restricted','locked','under_review'));
  end if;
end$$;

create index if not exists idx_profiles_phone on public.profiles(phone);
create index if not exists idx_profiles_account_status_blocked on public.profiles(account_status, blocked_until);

-- Transporters: align to user_id-based schema used by frontend + RLS
alter table public.transporters
  add column if not exists user_id uuid,
  add column if not exists name text not null default '',
  add column if not exists phone text,
  add column if not exists operating_village text,
  add column if not exists operating_district text,
  add column if not exists vehicle_type text,
  add column if not exists vehicle_capacity numeric,
  add column if not exists registration_number text,
  add column if not exists demo_tag text;

-- Backfill user_id from legacy profile_id
update public.transporters
set user_id = coalesce(user_id, profile_id)
where user_id is null and profile_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transporters_user_id_key') then
    alter table public.transporters add constraint transporters_user_id_key unique (user_id);
  end if;
end$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transporters' and column_name = 'user_id'
  ) and not exists (select 1 from public.transporters where user_id is null) then
    execute 'alter table public.transporters alter column user_id set not null';
  end if;
end$$;

-- Ensure admin helper exists for policies (idempotent)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
  on public.profiles for insert
  with check (id = auth.uid());

alter table public.transporters enable row level security;
drop policy if exists transporters_owner_or_admin_select on public.transporters;
drop policy if exists transporters_select on public.transporters;
drop policy if exists transporters_insert on public.transporters;
drop policy if exists transporters_update on public.transporters;

create policy transporters_select on public.transporters
  for select using (user_id = auth.uid() or public.is_admin());
create policy transporters_insert on public.transporters
  for insert with check (user_id = auth.uid());
create policy transporters_update on public.transporters
  for update using (user_id = auth.uid() or public.is_admin());
