insert into public.roles (name)
values
  ('super_admin'),
  ('state_admin'),
  ('district_admin'),
  ('field_agent'),
  ('farmer'),
  ('transporter'),
  ('buyer'),
  ('storage_manager')
on conflict (name) do nothing;
