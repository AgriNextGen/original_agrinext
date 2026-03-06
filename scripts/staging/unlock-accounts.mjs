/**
 * unlock-accounts.mjs
 *
 * Unlocks the 4 locked accounts by calling a stored procedure
 * that sets app.rpc = true to bypass the trigger.
 *
 * Uses the Supabase REST API via service role key.
 */

import { createAdminClient, assertStagingEnvironment } from "./common.mjs";

assertStagingEnvironment();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const LOCKED_IDS = [
  '40c76d46-5fea-413a-ae2b-234fe5486e90',
  'eb33d43c-e84d-474b-863a-84152fd070bd',
  'cd3770cd-6b19-4e8b-b1ad-ea01348be84e',
  '226162e4-33be-4458-9d47-cb596018ca8c',
];

async function callRpc(fnName, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function main() {
  console.log('=== STEP 1 — A2: Unlock 4 locked accounts ===\n');

  // Check current state first
  const admin = createAdminClient();

  const { data: before } = await admin
    .from('profiles')
    .select('id, phone, account_status, blocked_until')
    .in('id', LOCKED_IDS);

  console.log('Current state of 4 accounts:');
  console.table(before);

  const toUnlock = before.filter(r =>
    r.account_status !== 'active' || (r.blocked_until && new Date(r.blocked_until) > new Date())
  );
  console.log(`\nAccounts matching condition (account_status != 'active' OR blocked_until > NOW()): ${toUnlock.length}`);

  if (toUnlock.length === 0) {
    console.log('UPDATE 0 — no rows matched the WHERE condition (already active with no future block)');
  } else {
    // Use admin.set_account_status_v1 via REST for each one
    let updated = 0;
    for (const acct of toUnlock) {
      const result = await callRpc('admin.set_account_status_v1', {
        p_user_id: acct.id,
        p_new_status: 'active',
        p_reason: 'Manual unlock: demo account A2 fix',
        p_blocked_until: null,
      });

      if (result.status >= 200 && result.status < 300) {
        updated++;
        console.log(`  ✓ Unlocked ${acct.phone} (${acct.id})`);
      } else {
        console.log(`  ✗ Failed to unlock ${acct.phone}: HTTP ${result.status} — ${result.body}`);
      }
    }
    console.log(`\nUPDATE ${updated} (via admin.set_account_status_v1)`);
  }

  // ---- STEP 2 VERIFICATION ----
  console.log('\n=== STEP 2 — A2 Verification (must return 0 rows) ===\n');

  const now = new Date().toISOString();
  const { data: locked, error: lockErr } = await admin
    .from('profiles')
    .select('phone, account_status, blocked_until')
    .or(`account_status.neq.active,blocked_until.gt.${now}`);

  if (lockErr) {
    console.log('Error:', lockErr.message);
  } else {
    console.log(`Row count: ${locked.length}`);
    if (locked.length === 0) {
      console.log('✓ PASSED — 0 rows (no locked/blocked accounts)');
    } else {
      console.table(locked);
      console.log('✗ FAILED — some accounts still locked');
    }
  }

  // ---- STEP 3: Check role-less accounts ----
  console.log('\n=== STEP 3 — A3: Check 2 role-less accounts ===\n');

  const ROLELESS_IDS = [
    'd5a49f11-a8f5-41cd-8e5d-ec5da911b43d',
    '1dd83d05-56ae-458a-8913-6647dcfc6818',
  ];

  const { data: roleless3, error: r3err } = await admin
    .from('profiles')
    .select('id, full_name, phone, account_status, created_at')
    .in('id', ROLELESS_IDS);

  if (r3err) {
    console.log('Error:', r3err.message);
  } else {
    console.log(`Rows returned: ${roleless3.length}`);
    console.table(roleless3);
  }

  // ---- STEP 4: Verify no role-less profiles ----
  console.log('\n=== STEP 4 — A3 Verification: profiles with 0 user_roles ===\n');

  const { data: allProfiles } = await admin.from('profiles').select('id, phone');
  const { data: allRoles } = await admin.from('user_roles').select('user_id, role');

  const usersWithRoles = new Set((allRoles || []).map(r => r.user_id));
  const zeroRoles = (allProfiles || []).filter(p => !usersWithRoles.has(p.id));

  console.log(`Profiles with 0 role rows: ${zeroRoles.length}`);
  if (zeroRoles.length === 0) {
    console.log('✓ PASSED — 0 rows (all profiles have at least 1 role)');
  } else {
    console.table(zeroRoles);
    console.log('Note: These profiles need user_roles entries assigned.');
  }
}

main().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
