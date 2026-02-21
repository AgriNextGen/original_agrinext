-- Standardize notifications to use user_id (matches frontend and types)
-- profile_id and user_id hold same value (auth.users.id)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='profile_id') then
    alter table public.notifications rename column profile_id to user_id;
    drop index if exists public.idx_notifications_profile_id;
    create index if not exists idx_notifications_user_id on public.notifications(user_id);
  end if;
end $$;

-- Add type column for notification filtering (price, weather, crop, pickup, info)
alter table public.notifications add column if not exists type text default 'info';
