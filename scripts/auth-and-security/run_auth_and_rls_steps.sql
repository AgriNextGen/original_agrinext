-- =============================================================================
-- AUTH DEBUG + PHASE 0 SECURITY — Run in Supabase SQL Editor
-- Run in order. Fill UUIDs/phones from Query 1/2 results before running UPDATE/INSERT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PRE-FLIGHT: RLS status (report any rowsecurity = false)
-- -----------------------------------------------------------------------------
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles','farmlands','buyers','vehicles',
    'agent_farmer_assignments','agent_tasks','agent_data',
    'agent_activity_logs','agent_visits','agent_voice_notes',
    'admin_users','soil_test_reports','trace_attachments',
    'crop_media','crop_activity_logs','trusted_sources',
    'farmer_segments','web_fetch_logs','profiles'
  )
ORDER BY tablename;

-- -----------------------------------------------------------------------------
-- A1 Query 1: Full status of all accounts
-- -----------------------------------------------------------------------------
SELECT
  p.id,
  p.full_name,
  p.phone,
  p.account_status,
  p.blocked_until,
  p.kyc_status,
  ur.role,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
ORDER BY p.created_at DESC
LIMIT 30;

-- -----------------------------------------------------------------------------
-- A1 Query 2: Accounts with problems (use these for A2/A3)
-- -----------------------------------------------------------------------------
SELECT
  p.id,
  p.phone,
  p.account_status,
  p.blocked_until,
  p.kyc_status,
  COUNT(ur.id) AS role_count,
  STRING_AGG(ur.role::text, ', ') AS roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.phone, p.account_status, p.blocked_until, p.kyc_status
HAVING
  p.account_status != 'active'
  OR p.blocked_until > NOW()
  OR COUNT(ur.id) = 0
ORDER BY p.created_at DESC;

-- -----------------------------------------------------------------------------
-- A2: Unlock locked accounts
-- Replace the UUID list below with actual p.id values from Query 2 (locked/blocked only)
-- -----------------------------------------------------------------------------
/*
UPDATE profiles
SET account_status = 'active', blocked_until = NULL
WHERE id IN (
  'uuid-1', 'uuid-2'
)
  AND (account_status != 'active' OR blocked_until > NOW());
*/

-- -----------------------------------------------------------------------------
-- A2 Verification (must return 0 rows after unlock)
-- -----------------------------------------------------------------------------
SELECT phone, account_status, blocked_until
FROM profiles
WHERE account_status != 'active' OR blocked_until > NOW();

-- -----------------------------------------------------------------------------
-- A3: Insert missing user_roles (run one per account missing a role)
-- Replace +91XXXXXXXXXX and 'farmer' with actual phone and correct role
-- -----------------------------------------------------------------------------
/*
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'farmer'::app_role
FROM profiles p
WHERE p.phone = '+91XXXXXXXXXX'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id);
*/

-- -----------------------------------------------------------------------------
-- A3 Verification (must return 0 rows)
-- -----------------------------------------------------------------------------
SELECT p.phone, COUNT(ur.id) AS role_rows
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.phone
HAVING COUNT(ur.id) = 0;

-- -----------------------------------------------------------------------------
-- A4: Buyers missing buyers row (run once; safe if none missing)
-- -----------------------------------------------------------------------------
INSERT INTO buyers (user_id, name, phone)
SELECT p.id, COALESCE(p.full_name, 'User'), p.phone
FROM profiles p
INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'buyer'
WHERE NOT EXISTS (SELECT 1 FROM buyers b WHERE b.user_id = p.id)
ON CONFLICT (user_id) DO UPDATE SET name = COALESCE(EXCLUDED.name, buyers.name), phone = COALESCE(EXCLUDED.phone, buyers.phone);

-- -----------------------------------------------------------------------------
-- B1 Verification (after running migration 202603070002): all rowsecurity = true
-- -----------------------------------------------------------------------------
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_roles','farmlands','buyers','vehicles',
    'agent_farmer_assignments','agent_tasks','agent_data',
    'agent_activity_logs','agent_visits','agent_voice_notes',
    'admin_users','soil_test_reports','trace_attachments',
    'crop_media','crop_activity_logs','trusted_sources',
    'farmer_segments','web_fetch_logs'
  )
ORDER BY tablename;
