-- handle_new_user: Creates profiles and user_roles when a new auth user is created
-- Supports OAuth, magic link, and email signup; client-side Signup.tsx upsert acts as backup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
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
  v_role := coalesce(NEW.raw_user_meta_data->>'role', 'farmer');
  -- auth_email: Supabase Auth identifier for login-by-phone lookup (email or synthetic phone@agrinext.local)
  v_auth_email := coalesce(
    NEW.raw_user_meta_data->>'auth_email',
    NEW.email,
    regexp_replace(coalesce(v_phone, ''), '\D', '', 'g') || '@agrinext.local'
  );

  insert into public.profiles (id, full_name, phone, auth_email)
  values (NEW.id, v_name, v_phone, v_auth_email)
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    phone = coalesce(excluded.phone, profiles.phone),
    auth_email = coalesce(excluded.auth_email, profiles.auth_email);

  insert into public.user_roles (user_id, role)
  values (
    NEW.id,
    case
      when v_role in ('farmer','buyer','agent','logistics','admin') then v_role::app_role
      else 'farmer'::app_role
    end
  )
  on conflict (user_id) do update set role = excluded.role;

  if v_role = 'buyer' then
    begin
      insert into public.buyers (user_id, name, phone)
      values (NEW.id, v_name, v_phone)
      on conflict (user_id) do update set name = excluded.name, phone = excluded.phone;
    exception when others then
      null;
    end;
  elsif v_role = 'logistics' then
    begin
      insert into public.transporters (user_id, name, phone)
      values (NEW.id, v_name, v_phone)
      on conflict (user_id) do update set name = excluded.name, phone = excluded.phone;
    exception when others then
      null;
    end;
  end if;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
