create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  transporter_id uuid not null references public.transporters(id) on delete cascade,
  registration_number text not null unique,
  vehicle_type text,
  capacity_kg numeric(12,2) not null,
  refrigerated boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.load_requests (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  crop_id uuid references public.crops(id) on delete set null,
  requested_by_agent_id uuid references public.agents(id) on delete set null,
  quantity_kg numeric(12,2) not null,
  pickup_lat numeric(10,7),
  pickup_long numeric(10,7),
  pickup_window_start timestamptz,
  pickup_window_end timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.transport_jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.load_requests(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  assigned_at timestamptz,
  picked_at timestamptz,
  delivered_at timestamptz,
  status text not null default 'assigned',
  created_at timestamptz not null default now()
);

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid references public.crops(id) on delete set null,
  farmer_id uuid not null references public.farmers(id) on delete cascade,
  available_quantity numeric(12,2) not null,
  asking_price numeric(12,2) not null,
  grade text,
  status text not null default 'available',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  buyer_profile_id uuid not null references public.profiles(id) on delete cascade,
  quantity numeric(12,2) not null,
  order_status text not null default 'requested',
  created_at timestamptz not null default now()
);

create table if not exists public.storage_bookings (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  storage_name text not null,
  start_date date not null,
  end_date date,
  status text not null default 'stored',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_vehicles_transporter_id on public.vehicles(transporter_id);
create index if not exists idx_load_requests_farmer_id on public.load_requests(farmer_id);
create index if not exists idx_load_requests_status on public.load_requests(status);
create index if not exists idx_transport_jobs_request_id on public.transport_jobs(request_id);
create index if not exists idx_transport_jobs_status on public.transport_jobs(status);
create index if not exists idx_lots_farmer_id on public.lots(farmer_id);
create index if not exists idx_lots_status on public.lots(status);
create index if not exists idx_orders_lot_id on public.orders(lot_id);
-- Ensure profile_id exists before creating index
alter table public.notifications
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;
create index if not exists idx_notifications_profile_id on public.notifications(profile_id);
