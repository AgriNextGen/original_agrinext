alter table public.profiles enable row level security;
alter table public.farmers enable row level security;
alter table public.agents enable row level security;
alter table public.transporters enable row level security;
alter table public.farm_plots enable row level security;
alter table public.crops enable row level security;
alter table public.load_requests enable row level security;
alter table public.transport_jobs enable row level security;
alter table public.lots enable row level security;
alter table public.orders enable row level security;
alter table public.storage_bookings enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_logs enable row level security;

-- Ensure role_id exists on profiles before using it in functions/policies
alter table public.profiles
  add column if not exists role_id uuid references public.roles(id) on delete set null;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and r.name in ('super_admin', 'state_admin', 'district_admin')
  );
$$;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
on public.profiles for select
using (id = auth.uid() or public.is_admin_user());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
using (id = auth.uid() or public.is_admin_user());

drop policy if exists "farmers_owner_or_admin_select" on public.farmers;
create policy "farmers_owner_or_admin_select"
on public.farmers for select
using (
  profile_id = auth.uid()
  or public.is_admin_user()
);

drop policy if exists "farmers_owner_or_admin_update" on public.farmers;
create policy "farmers_owner_or_admin_update"
on public.farmers for update
using (
  profile_id = auth.uid()
  or public.is_admin_user()
);

drop policy if exists "agents_owner_or_admin_select" on public.agents;
create policy "agents_owner_or_admin_select"
on public.agents for select
using (
  profile_id = auth.uid()
  or public.is_admin_user()
);

-- Ensure profile_id exists on transporters before creating policies that reference it
alter table public.transporters
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

drop policy if exists "transporters_owner_or_admin_select" on public.transporters;
create policy "transporters_owner_or_admin_select"
on public.transporters for select
using (
  profile_id = auth.uid()
  or public.is_admin_user()
);

drop policy if exists "plots_farmer_or_admin_access" on public.farm_plots;
create policy "plots_farmer_or_admin_access"
on public.farm_plots for all
using (
  exists (
    select 1
    from public.farmers f
    where f.id = farm_plots.farmer_id
      and f.profile_id = auth.uid()
  )
  or public.is_admin_user()
);

drop policy if exists "crops_farmer_or_admin_access" on public.crops;
create policy "crops_farmer_or_admin_access"
on public.crops for all
using (
  exists (
    select 1
    from public.farmers f
    where f.id = crops.farmer_id
      and f.profile_id = auth.uid()
  )
  or public.is_admin_user()
);

drop policy if exists "load_requests_farmer_agent_admin_access" on public.load_requests;
create policy "load_requests_farmer_agent_admin_access"
on public.load_requests for all
using (
  exists (
    select 1
    from public.farmers f
    where f.id = load_requests.farmer_id
      and f.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.agents a
    where a.id = load_requests.requested_by_agent_id
      and a.profile_id = auth.uid()
  )
  or public.is_admin_user()
);

drop policy if exists "notifications_owner_or_admin_select" on public.notifications;
create policy "notifications_owner_or_admin_select"
on public.notifications for select
using (
  profile_id = auth.uid()
  or public.is_admin_user()
);

drop policy if exists "admin_logs_admin_only" on public.admin_logs;
create policy "admin_logs_admin_only"
on public.admin_logs for all
using (public.is_admin_user());
