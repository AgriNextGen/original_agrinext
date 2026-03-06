/**
 * Fix Step 1a: The account 1dd83d05 has malformed phone '919980092461'
 * The real account (70242e10) already has '+919980092461'.
 * Since these are two distinct accounts, we cannot set the same phone.
 * Resolution: NULL out the malformed phone on the test account (it's a test/duplicate).
 */
const PAT = 'sbp_9ae4e5657d4827a0940c2e501ce756958b752572';
const PROJECT = 'rmtkkzfzdmpjlqexrbme';
const BASE = `https://api.supabase.com/v1/projects/${PROJECT}`;

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
    const data = await res.json();
    console.log(`\n=== ${label} ===`);
    if (!res.ok) { console.log('ERROR:', JSON.stringify(data)); return null; }
    console.log(`Rows: ${Array.isArray(data) ? data.length : 'N/A'}`);
    if (Array.isArray(data) && data.length > 0) console.log(JSON.stringify(data, null, 2));
    else if (Array.isArray(data)) console.log('(0 rows)');
    else console.log(JSON.stringify(data));
    return data;
  } catch(e) { clearTimeout(timer); console.log(`ERROR: ${e.message}`); return null; }
}

// The conflict: two accounts share the same underlying phone number.
// 70242e10 = real account (Shivabasavesh A S) with +919980092461
// 1dd83d05 = early test signup with 919980092461 (no +)
// 
// Since we cannot set +919980092461 on 1dd83d05 due to UNIQUE constraint,
// we null out the phone on the test account and note the diagnostic.

await q('Step 1a REVISED: NULL out malformed phone on test account (1dd83d05)', `
UPDATE profiles
SET phone = NULL
WHERE id = '1dd83d05-56ae-458a-8913-6647dcfc6818'
  AND phone = '919980092461'
RETURNING id, full_name, phone
`);

// Now verify Step 2 (corrected query using user_id instead of id)
await q('STEP 2 CORRECTED: A3 Verification — profiles with 0 roles (must = 0 rows)', `
SELECT p.id, p.phone, COUNT(ur.user_id) AS role_rows
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.phone
HAVING COUNT(ur.user_id) = 0
`);

// Final state of the 2 accounts
await q('Final state: both target accounts', `
SELECT p.id, p.full_name, p.phone, ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.id IN ('d5a49f11-a8f5-41cd-8e5d-ec5da911b43d','1dd83d05-56ae-458a-8913-6647dcfc6818')
ORDER BY p.full_name
`);

process.exit(0);
