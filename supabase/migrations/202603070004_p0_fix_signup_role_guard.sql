-- P0 SECURITY: Block admin/agent/logistics signup via metadata
-- Public signup can only produce farmer or buyer. Any other role becomes farmer.

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
  v_name := coalesce(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_role_meta := coalesce(NEW.raw_user_meta_data->>'role', 'farmer');

  -- Only farmer and buyer allowed from public signup; any privileged role becomes farmer
  v_role_assign := case
    when v_role_meta in ('farmer', 'buyer') then v_role_meta::app_role
    else 'farmer'::app_role
  end;

  v_auth_email := coalesce(
    NEW.raw_user_meta_data->>'auth_email',
    NEW.email,
    regexp_replace(coalesce(v_phone, ''), '\D', '', 'g') || '@agrinext.local'
  );

  -- Profiles upsert (resilient)
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

  -- User roles upsert: only v_role_assign (farmer or buyer)
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
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
