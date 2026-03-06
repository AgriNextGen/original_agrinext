-- repair-auth.sql
-- Run this in Supabase Dashboard → SQL Editor
-- Diagnoses and fixes the 5 dummy test accounts.
--
-- Step 1: See current state
SELECT
  p.id,
  p.full_name,
  p.phone,
  p.account_status,
  p.blocked_until,
  p.failed_login_count_window,
  p.failed_login_window_started_at,
  ur.role AS role_in_db
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.phone IN (
  '+919900000101',
  '+919900000102',
  '+919900000103',
  '+919900000104',
  '+919900000105'
)
ORDER BY p.phone;

-- Step 2: Reset all lockout state (run after reviewing Step 1)
UPDATE profiles
SET
  account_status              = 'active',
  blocked_until               = NULL,
  failed_login_count_window   = 0,
  failed_login_window_started_at = NULL,
  last_failed_login_at        = NULL
WHERE phone IN (
  '+919900000101',
  '+919900000102',
  '+919900000103',
  '+919900000104',
  '+919900000105'
);

-- Step 3: Ensure user_roles rows exist (safe: ON CONFLICT DO NOTHING)
INSERT INTO user_roles (user_id, role, created_at)
SELECT p.id, 'farmer', NOW()
FROM profiles p WHERE p.phone = '+919900000101'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role, created_at)
SELECT p.id, 'agent', NOW()
FROM profiles p WHERE p.phone = '+919900000102'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role, created_at)
SELECT p.id, 'logistics', NOW()
FROM profiles p WHERE p.phone = '+919900000103'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role, created_at)
SELECT p.id, 'buyer', NOW()
FROM profiles p WHERE p.phone = '+919900000104'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role, created_at)
SELECT p.id, 'admin', NOW()
FROM profiles p WHERE p.phone = '+919900000105'
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify final state (re-run Step 1 query)
SELECT
  p.full_name,
  p.phone,
  p.account_status,
  p.blocked_until,
  p.failed_login_count_window,
  ur.role AS role_in_db,
  CASE
    WHEN p.account_status = 'active' AND p.blocked_until IS NULL AND ur.role IS NOT NULL
    THEN 'READY'
    ELSE 'NEEDS ATTENTION'
  END AS status
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.phone IN (
  '+919900000101',
  '+919900000102',
  '+919900000103',
  '+919900000104',
  '+919900000105'
)
ORDER BY p.phone;
