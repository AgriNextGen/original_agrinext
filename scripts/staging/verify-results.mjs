/**
 * Verify results of all 10 steps — clean JSON output
 */
import { getMgmtApiConfig } from './common.mjs';

const { pat: PAT, projectRef: PROJECT, base: BASE } = getMgmtApiConfig();

async function q(label, sql) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${BASE}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { label, ok: res.ok, status: res.status, rows: Array.isArray(data) ? data.length : null, data };
  } catch (e) {
    clearTimeout(timer);
    return { label, ok: false, error: e.message };
  }
}

const results = [];

// Step 1 verification: check current phone and role for both users
results.push(await q('STEP 1 — current state of 2 accounts', `
  SELECT p.id, p.full_name, p.phone, ur.role
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE p.id IN ('d5a49f11-a8f5-41cd-8e5d-ec5da911b43d','1dd83d05-56ae-458a-8913-6647dcfc6818')
  ORDER BY p.full_name
`));

// Step 2: A3 verification
results.push(await q('STEP 2 — A3 Verification (0 rows = pass)', `
  SELECT p.id, p.phone, COUNT(ur.user_id) AS role_rows
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  GROUP BY p.id, p.phone
  HAVING COUNT(ur.user_id) = 0
`));

// Step 3: A4 buyers check
results.push(await q('STEP 3 — A4 buyers missing check (0 rows = pass)', `
  SELECT p.id, p.full_name
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'buyer'
  WHERE NOT EXISTS (SELECT 1 FROM buyers b WHERE b.user_id = p.id)
`));

// Step 4: function exists check
results.push(await q('STEP 4 — security.record_failed_login_v1 exists', `
  SELECT proname, pronargs, prosecdef
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE proname = 'record_failed_login_v1'
  AND n.nspname = 'security'
`));

// Step 5: RLS check
results.push(await q('STEP 5/8 — B1: RLS status for 18 tables', `
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
  ORDER BY tablename
`));

// Step 9: trigger check
results.push(await q('STEP 9 — B2: trigger trg_profiles_block_security_updates', `
  SELECT trigger_name, event_manipulation, action_statement
  FROM information_schema.triggers
  WHERE event_object_table = 'profiles'
    AND trigger_name = 'trg_profiles_block_security_updates'
`));

// Step 10: handle_new_user source (key sections only)
results.push(await q('STEP 10 — B3: handle_new_user role guard check', `
  SELECT 
    proname,
    CASE 
      WHEN prosrc LIKE '%when v_role_meta in (''farmer'', ''buyer'')%' THEN 'PASS: farmer/buyer guard present'
      ELSE 'FAIL: guard missing'
    END AS role_guard_check,
    CASE 
      WHEN prosrc LIKE '%else ''farmer''::app_role%' THEN 'PASS: default-to-farmer fallback present'
      ELSE 'FAIL: fallback missing'  
    END AS fallback_check,
    CASE 
      WHEN prosrc NOT LIKE '%admin%' OR prosrc LIKE '%when v_role_meta in (''farmer'', ''buyer'')%' THEN 'PASS: admin role blocked from public signup'
      ELSE 'FAIL: admin may be assignable'
    END AS admin_block_check
  FROM pg_proc
  WHERE proname = 'handle_new_user'
    AND pronamespace = 'public'::regnamespace
`));

// Print results
console.log('\n' + '='.repeat(72));
console.log('  VERIFICATION RESULTS');
console.log('='.repeat(72));

for (const r of results) {
  console.log(`\n--- ${r.label} ---`);
  if (!r.ok) {
    console.log('FAILED:', r.error || JSON.stringify(r.data));
    continue;
  }
  if (Array.isArray(r.data)) {
    console.log(`Rows: ${r.data.length}`);
    if (r.data.length > 0) {
      console.log(JSON.stringify(r.data, null, 2));
    } else {
      console.log('(empty result set)');
    }
  } else {
    console.log(JSON.stringify(r.data, null, 2));
  }
}

process.exit(0);
