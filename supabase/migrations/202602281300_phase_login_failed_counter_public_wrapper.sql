-- Public-schema wrapper for failed-login tracking RPC.
-- Edge function calls go through PostgREST RPC (public schema only), so the
-- security schema function is otherwise unreachable and failures get swallowed.

create or replace function public.record_failed_login_v1(
  p_phone text,
  p_ip text default null,
  p_device_id text default null
)
returns void
language plpgsql
security definer
set search_path = public, security, audit
as $$
begin
  perform security.record_failed_login_v1(p_phone, p_ip, p_device_id);
end;
$$;

revoke all on function public.record_failed_login_v1(text,text,text) from public;
revoke all on function public.record_failed_login_v1(text,text,text) from anon;
revoke all on function public.record_failed_login_v1(text,text,text) from authenticated;
grant execute on function public.record_failed_login_v1(text,text,text) to service_role;
