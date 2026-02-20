-- Add auth_email to profiles for phone-based login lookup
-- auth_email stores the Supabase Auth identifier (user email or synthetic phone@agrinext.local)
alter table public.profiles add column if not exists auth_email text;
create index if not exists idx_profiles_phone on public.profiles(phone);
