-- Migrate existing user_roles into user_profiles (one profile per role)
INSERT INTO public.user_profiles (user_id, profile_type, display_name, phone)
SELECT
  ur.user_id,
  ur.role AS profile_type,
  COALESCE(p.full_name, u.email, 'Profile') AS display_name,
  COALESCE(p.phone, '') AS phone
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
LEFT JOIN auth.users u ON u.id = ur.user_id
ON CONFLICT (user_id, profile_type) DO NOTHING;

