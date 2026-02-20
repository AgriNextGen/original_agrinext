-- AgriNext Full Schema Migration
-- Aligns remote Supabase with frontend types.ts expectations

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Enums
create type public.app_role as enum ('farmer', 'buyer', 'agent', 'logistics', 'admin');
create type public.crop_status as enum ('growing', 'one_week', 'ready', 'harvested');
create type public.transport_status as enum ('requested', 'assigned', 'en_route', 'picked_up', 'delivered', 'cancelled');
create type public.agent_task_status as enum ('pending', 'in_progress', 'completed', 'approved', 'rejected');
create type public.agent_task_type as enum ('visit', 'verify_crop', 'harvest_check', 'transport_assist', 'onboard_farmer', 'update_profile', 'soil_report_upload', 'field_visit', 'farmer_request');

-- Helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- Roles
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Profiles (auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique,
  avatar_url text,
  preferred_language text default 'en',
  district text,
  district_confidence text,
  district_source text,
  village text,
  taluk text,
  pincode text,
  location text,
  total_land_area numeric,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- User roles
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz default now()
);

-- Farmlands
create table if not exists public.farmlands (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  area numeric not null default 0,
  area_unit text not null default 'acres',
  soil_type text,
  village text,
  district text,
  location_lat numeric,
  location_long numeric,
  geo_verified boolean not null default false,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_farmlands_updated_at before update on public.farmlands
  for each row execute function public.set_updated_at();
create index idx_farmlands_farmer_id on public.farmlands(farmer_id);

-- Crops
create table if not exists public.crops (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references auth.users(id) on delete cascade,
  land_id uuid references public.farmlands(id) on delete set null,
  crop_name text not null,
  variety text,
  status crop_status not null default 'growing',
  sowing_date date,
  harvest_estimate text,
  estimated_quantity numeric,
  quantity_unit text,
  growth_stage text,
  health_status text,
  last_photo_at timestamptz,
  last_observed_issue_at timestamptz,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_crops_updated_at before update on public.crops
  for each row execute function public.set_updated_at();
create index idx_crops_farmer_id on public.crops(farmer_id);
create index idx_crops_land_id on public.crops(land_id);

-- Transporters
create table if not exists public.transporters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  operating_village text,
  operating_district text,
  vehicle_type text,
  vehicle_capacity numeric,
  registration_number text,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_transporters_updated_at before update on public.transporters
  for each row execute function public.set_updated_at();

-- Vehicles
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references public.transporters(id) on delete cascade,
  registration_number text,
  vehicle_type text,
  capacity_kg numeric,
  refrigerated boolean default false,
  created_at timestamptz not null default now()
);

-- Buyers
create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  company_name text,
  buyer_type text,
  district text,
  preferred_crops text[],
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_buyers_updated_at before update on public.buyers
  for each row execute function public.set_updated_at();

-- Transport requests
create table if not exists public.transport_requests (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references auth.users(id) on delete cascade,
  crop_id uuid references public.crops(id) on delete set null,
  transporter_id uuid references auth.users(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  assigned_trip_id uuid,
  pickup_location text not null,
  drop_location text,
  pickup_village text,
  pickup_window_start timestamptz,
  pickup_window_end timestamptz,
  preferred_date date,
  preferred_time text,
  quantity numeric not null,
  quantity_unit text,
  status transport_status not null default 'requested',
  fare_estimate numeric,
  distance_km numeric,
  notes text,
  pickup_photo_url text,
  delivery_photo_url text,
  cancellation_reason text,
  assigned_at timestamptz,
  completed_at timestamptz,
  status_updated_at timestamptz,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_transport_requests_updated_at before update on public.transport_requests
  for each row execute function public.set_updated_at();
create index idx_transport_requests_farmer_id on public.transport_requests(farmer_id);
create index idx_transport_requests_status on public.transport_requests(status);

-- Trips (add FK after creation)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  transport_request_id uuid not null references public.transport_requests(id) on delete cascade,
  transporter_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'assigned',
  assigned_at timestamptz,
  en_route_at timestamptz,
  picked_up_at timestamptz,
  arrived_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  actual_weight_kg numeric,
  pickup_otp_required boolean,
  pickup_otp_verified boolean,
  delivery_otp_required boolean,
  delivery_otp_verified boolean,
  pickup_proofs jsonb,
  delivery_proofs jsonb,
  issue_code text,
  issue_notes text,
  demo_tag text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.transport_requests add constraint transport_requests_assigned_trip_id_fkey
  foreign key (assigned_trip_id) references public.trips(id) on delete set null;
create index idx_trips_transport_request_id on public.trips(transport_request_id);

-- Transport status events
create table if not exists public.transport_status_events (
  id uuid primary key default gen_random_uuid(),
  transport_request_id uuid not null references public.transport_requests(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  actor_id uuid not null,
  actor_role text not null,
  old_status text,
  new_status text not null,
  note text,
  demo_tag text,
  created_at timestamptz default now()
);

-- Listings
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  crop_id uuid references public.crops(id) on delete set null,
  title text not null,
  category text not null,
  description text,
  price numeric not null,
  quantity numeric not null,
  unit text not null default 'kg',
  location text,
  image_url text,
  inputs_summary text,
  test_report_urls jsonb not null default '[]'::jsonb,
  trace_code text,
  trace_settings jsonb default '{}'::jsonb,
  trace_status text default 'pending',
  is_active boolean not null default true,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create index idx_listings_seller_id on public.listings(seller_id);

-- Market orders
create table if not exists public.market_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  farmer_id uuid not null references auth.users(id) on delete cascade,
  crop_id uuid references public.crops(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  quantity numeric not null,
  status text not null default 'requested',
  price_agreed numeric,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_market_orders_buyer_id on public.market_orders(buyer_id);
create index idx_market_orders_farmer_id on public.market_orders(farmer_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_profile_id on public.notifications(profile_id);

-- Karnataka districts
create table if not exists public.karnataka_districts (
  id uuid primary key default gen_random_uuid(),
  district text not null unique,
  created_at timestamptz default now()
);

-- Agent tables
create table if not exists public.agent_farmer_assignments (
  agent_id uuid not null references auth.users(id) on delete cascade,
  farmer_id uuid not null references auth.users(id) on delete cascade,
  active boolean default true,
  assigned_at timestamptz,
  assigned_by uuid references auth.users(id) on delete set null,
  demo_tag text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (agent_id, farmer_id)
);

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  farmer_id uuid not null references auth.users(id) on delete cascade,
  crop_id uuid references public.crops(id) on delete set null,
  task_type agent_task_type not null,
  task_status agent_task_status not null default 'pending',
  due_date timestamptz not null default now(),
  notes text,
  payload jsonb,
  priority int,
  created_by uuid references auth.users(id) on delete set null,
  created_by_role text,
  completed_at timestamptz,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_agent_tasks_agent_id on public.agent_tasks(agent_id);
create index idx_agent_tasks_farmer_id on public.agent_tasks(farmer_id);

create table if not exists public.agent_data (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  farmer_id uuid references auth.users(id) on delete set null,
  crop_type text,
  crop_health text,
  soil_type text,
  soil_ph numeric,
  soil_moisture text,
  farm_location text,
  latitude numeric,
  longitude numeric,
  notes text,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_role text not null,
  action_type text not null,
  farmer_id uuid references auth.users(id) on delete set null,
  details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_visits (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  farmer_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.agent_tasks(id) on delete set null,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  notes text,
  demo_tag text,
  created_at timestamptz default now()
);

create table if not exists public.agent_voice_notes (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  farmer_id uuid references auth.users(id) on delete set null,
  crop_id uuid references public.crops(id) on delete set null,
  task_id uuid references public.agent_tasks(id) on delete set null,
  note_text text,
  audio_path text,
  language_code text default 'en',
  created_at timestamptz not null default now()
);

-- Admin users
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  email text,
  phone text,
  assigned_district text,
  demo_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Soil test reports
create table if not exists public.soil_test_reports (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references auth.users(id) on delete cascade,
  farmland_id uuid not null references public.farmlands(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  report_file_path text not null,
  report_file_type text not null,
  report_mime_type text,
  report_date date not null,
  ph numeric,
  nitrogen numeric,
  phosphorus numeric,
  potassium numeric,
  organic_carbon numeric,
  ec numeric,
  lab_name text,
  notes text,
  extracted_data jsonb,
  consent_captured boolean,
  consent_at timestamptz,
  consent_note text,
  source_role text not null default 'farmer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trace attachments
create table if not exists public.trace_attachments (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  file_type text not null,
  captured_at timestamptz,
  created_at timestamptz default now()
);

-- Crop media
create table if not exists public.crop_media (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references public.crops(id) on delete cascade,
  file_path text not null,
  file_type text,
  captured_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Crop activity logs
create table if not exists public.crop_activity_logs (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references public.crops(id) on delete cascade,
  activity_type text not null,
  notes text,
  media_ids uuid[],
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Market prices (for price display)
create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  crop_name text not null,
  district text,
  mandi_name text,
  min_price numeric,
  max_price numeric,
  modal_price numeric,
  date date not null,
  created_at timestamptz default now()
);
create index idx_market_prices_crop_date on public.market_prices(crop_name, date);

-- Market prices agg (aggregated view)
create table if not exists public.market_prices_agg (
  id uuid primary key default gen_random_uuid(),
  crop_name text not null,
  district text,
  avg_price numeric,
  trend_direction text,
  date date,
  created_at timestamptz default now()
);

-- Supporting tables for DataHealth
create table if not exists public.trusted_sources (
  id uuid primary key default gen_random_uuid(),
  name text,
  url_pattern text,
  created_at timestamptz default now()
);

create table if not exists public.farmer_segments (
  id uuid primary key default gen_random_uuid(),
  segment_key text,
  district text,
  crop_canonical text,
  created_at timestamptz default now()
);

create table if not exists public.web_fetch_logs (
  id uuid primary key default gen_random_uuid(),
  url text,
  status text,
  created_at timestamptz default now()
);
