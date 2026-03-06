import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rmtkkzfzdmpjlqexrbme.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGtremZ6ZG1wamxxZXhyYm1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE3MTM0MywiZXhwIjoyMDg2NzQ3MzQzfQ.boHbegytdSBXEhCT_dkg8Bl98W5lyQupb2bGo0nSqR4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSql(label, sql) {
  console.log(`\n=== ${label} ===`);
  console.log('SQL:', sql.trim().substring(0, 120) + '...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    // Try direct REST call to PostgREST
    console.log('RPC failed:', error.message);
    return null;
  }
  console.log('Result:', JSON.stringify(data, null, 2));
  return data;
}

// Use fetch directly against the Supabase REST API
async function query(label, sql) {
  console.log(`\n=== ${label} ===`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_query: sql }),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

// Actually use direct PostgREST table operations instead

async function step1_unlockAccounts() {
  console.log('\n=== STEP 1 — A2: Unlock 4 locked accounts ===');
  
  const ids = [
    '40c76d46-5fea-413a-ae2b-234fe5486e90',
    'eb33d43c-e84d-474b-863a-84152fd070bd',
    'cd3770cd-6b19-4e8b-b1ad-ea01348be84e',
    '226162e4-33be-4458-9d47-cb596018ca8c',
  ];

  // First check current state of these accounts
  const { data: current, error: checkErr } = await supabase
    .from('profiles')
    .select('id, phone, account_status, blocked_until')
    .in('id', ids);

  if (checkErr) {
    console.log('Check error:', checkErr.message);
    return;
  }
  console.log('Current state of 4 accounts:');
  console.table(current);

  // Filter to only those needing unlock
  const toUnlock = current.filter(r => r.account_status !== 'active' || (r.blocked_until && new Date(r.blocked_until) > new Date()));
  console.log(`Accounts needing unlock: ${toUnlock.length}`);

  if (toUnlock.length === 0) {
    console.log('UPDATE 0 — all accounts already active with no future blocked_until');
    return;
  }

  // Update them
  const unlockIds = toUnlock.map(r => r.id);
  const { data: updated, error: updateErr, count } = await supabase
    .from('profiles')
    .update({ account_status: 'active', blocked_until: null })
    .in('id', unlockIds)
    .select('id, phone, account_status, blocked_until');

  if (updateErr) {
    console.log('Update error:', updateErr.message);
    return;
  }
  console.log(`UPDATE ${updated?.length ?? 0}`);
  console.table(updated);
}

async function step2_verifyNoLocked() {
  console.log('\n=== STEP 2 — A2 Verification (must return 0 rows) ===');
  
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .select('phone, account_status, blocked_until')
    .or(`account_status.neq.active,blocked_until.gt.${now}`);

  if (error) {
    console.log('Error:', error.message);
    return;
  }
  console.log(`Row count: ${data.length}`);
  if (data.length > 0) {
    console.table(data);
  } else {
    console.log('✓ PASSED — 0 rows (no locked/blocked accounts)');
  }
}

async function step3_checkRolelessAccounts() {
  console.log('\n=== STEP 3 — A3: Check 2 role-less accounts ===');
  
  const ids = [
    'd5a49f11-a8f5-41cd-8e5d-ec5da911b43d',
    '1dd83d05-56ae-458a-8913-6647dcfc6818',
  ];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, account_status, created_at')
    .in('id', ids);

  if (error) {
    console.log('Error:', error.message);
    return;
  }
  console.log(`Rows returned: ${data.length}`);
  console.table(data);
  return data;
}

async function step4_verifyNoRoleless() {
  console.log('\n=== STEP 4 — A3 Verification: profiles with 0 user_roles (must return 0 rows after fix) ===');
  
  // Get all profiles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, phone');

  if (pErr) { console.log('Error:', pErr.message); return; }

  // Get all user_roles
  const { data: roles, error: rErr } = await supabase
    .from('user_roles')
    .select('user_id, id');

  if (rErr) { console.log('Error:', rErr.message); return; }

  // Build set of user_ids that have roles
  const usersWithRoles = new Set(roles.map(r => r.user_id));

  // Find profiles with 0 roles
  const roleless = profiles.filter(p => !usersWithRoles.has(p.id));
  
  console.log(`Profiles with 0 role rows: ${roleless.length}`);
  if (roleless.length > 0) {
    console.table(roleless);
  } else {
    console.log('✓ PASSED — 0 rows (all profiles have at least 1 role)');
  }
}

async function main() {
  await step1_unlockAccounts();
  await step2_verifyNoLocked();
  const step3Data = await step3_checkRolelessAccounts();
  await step4_verifyNoRoleless();
}

main().catch(console.error);
