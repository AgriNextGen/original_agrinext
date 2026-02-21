create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  village text,
  district text,
  state text,
  consent_status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  assigned_village text,
  performance_score numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transporters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  village text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farm_plots (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  plot_name text,
  area_acres numeric(10,2),
  soil_type text,
  irrigation_type text,
  geo_lat numeric(10,7),
  geo_long numeric(10,7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crops (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  plot_id uuid references public.farm_plots(id) on delete set null,
  crop_name text not null,
  variety text,
  sowing_date date,
  expected_harvest_date date,
  estimated_yield numeric(12,2),
  current_stage text not null default 'growing',
  is_ready_for_harvest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crop_photos (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references public.crops(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  image_url text not null,
  geo_lat numeric(10,7),
  geo_long numeric(10,7),
  captured_at timestamptz not null default now()
);

create table if not exists public.agent_visits (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  purpose text not null,
  notes text,
  geo_lat numeric(10,7),
  geo_long numeric(10,7),
  visited_at timestamptz not null default now()
);

drop trigger if exists trg_farmers_updated_at on public.farmers;
create trigger trg_farmers_updated_at
before update on public.farmers
for each row
execute function public.set_updated_at();

drop trigger if exists trg_agents_updated_at on public.agents;
create trigger trg_agents_updated_at
before update on public.agents
for each row
execute function public.set_updated_at();

drop trigger if exists trg_transporters_updated_at on public.transporters;
create trigger trg_transporters_updated_at
before update on public.transporters
for each row
execute function public.set_updated_at();

drop trigger if exists trg_farm_plots_updated_at on public.farm_plots;
create trigger trg_farm_plots_updated_at
before update on public.farm_plots
for each row
execute function public.set_updated_at();

drop trigger if exists trg_crops_updated_at on public.crops;
create trigger trg_crops_updated_at
before update on public.crops
for each row
execute function public.set_updated_at();

create index if not exists idx_farm_plots_farmer_id on public.farm_plots(farmer_id);
create index if not exists idx_crops_farmer_id on public.crops(farmer_id);
create index if not exists idx_crops_plot_id on public.crops(plot_id);
create index if not exists idx_crop_photos_crop_id on public.crop_photos(crop_id);
create index if not exists idx_agent_visits_agent_id on public.agent_visits(agent_id);
