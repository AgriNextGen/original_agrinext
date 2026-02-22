-- Make handle_new_user resilient and add INSERT policy for profiles
-- Replaces function to wrap upserts in exception blocks and emits warnings on error
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
    -- Log a warning so DB logs show the failure, but do not abort auth user creation
    raise warning 'handle_new_user: profiles upsert failed for user %, error: %', NEW.id, SQLERRM;
  end;

  -- User roles upsert (resilient)
  begin
    insert into public.user_roles (user_id, role)
    values (
      NEW.id,
      case
        when v_role in ('farmer','buyer','agent','logistics','admin') then v_role::app_role
        else 'farmer'::app_role
      end
    )
    on conflict (user_id) do update set role = excluded.role;
  exception when others then
    raise warning 'handle_new_user: user_roles upsert failed for user %, error: %', NEW.id, SQLERRM;
  end;

  if v_role = 'buyer' then
    begin
      insert into public.buyers (user_id, name, phone)
      values (NEW.id, v_name, v_phone)
      on conflict (user_id) do update set name = excluded.name, phone = excluded.phone;
    exception when others then
      raise warning 'handle_new_user: buyers upsert failed for user %, error: %', NEW.id, SQLERRM;
    end;
  elsif v_role = 'logistics' then
    begin
      insert into public.transporters (user_id, name, phone)
      values (NEW.id, v_name, v_phone)
      on conflict (user_id) do update set name = excluded.name, phone = excluded.phone;
    exception when others then
      raise warning 'handle_new_user: transporters upsert failed for user %, error: %', NEW.id, SQLERRM;
    end;
  end if;

  return NEW;
end;
$$;

-- Recreate trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ensure a permissive insert policy exists so authenticated users (auth.uid()) can create their own profile rows.
-- This is a WITH CHECK policy to ensure inserted rows have id = auth.uid()
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
  on public.profiles
  for insert
  with check (id = auth.uid());

