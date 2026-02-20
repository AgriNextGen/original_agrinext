-- ai_farmer_logs: AI assistant conversation logs for farmers
-- Used by farmer-assistant / AI chat features
create table if not exists public.ai_farmer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_message text not null,
  router_category text not null,
  ai_response text not null,
  farmer_context_summary jsonb,
  web_context_summary jsonb,
  web_query text,
  used_web boolean not null default false,
  model text,
  created_at timestamptz not null default now()
);
create index idx_ai_farmer_logs_user_id on public.ai_farmer_logs(user_id);
create index idx_ai_farmer_logs_created_at on public.ai_farmer_logs(created_at);

-- web_cache: Cached web-fetched data (prices, weather, etc.) keyed by location/topic
-- Used by DataHealth / market data Edge Functions
create table if not exists public.web_cache (
  cache_key text not null,
  location_key text not null,
  topic text not null,
  crop_key text,
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (cache_key)
);
create index idx_web_cache_location_topic on public.web_cache(location_key, topic);
create index idx_web_cache_fetched_at on public.web_cache(fetched_at);
