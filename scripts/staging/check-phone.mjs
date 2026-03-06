const PAT = 'sbp_9ae4e5657d4827a0940c2e501ce756958b752572';
const PROJECT = 'rmtkkzfzdmpjlqexrbme';
const BASE = `https://api.supabase.com/v1/projects/${PROJECT}`;

async function q(sql) {
  const res = await fetch(`${BASE}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return res.json();
}

// Check the phone situation
console.log('=== Phone check ===');
const r1 = await q(`SELECT id, full_name, phone FROM profiles WHERE phone IN ('919980092461', '+919980092461') ORDER BY phone`);
console.log(JSON.stringify(r1, null, 2));

// Check the specific account
console.log('\n=== Account 1dd83d05 current state ===');
const r2 = await q(`SELECT id, full_name, phone FROM profiles WHERE id = '1dd83d05-56ae-458a-8913-6647dcfc6818'`);
console.log(JSON.stringify(r2, null, 2));

// The original SQL tried to set phone='+919980092461' WHERE phone='919980092461'
// If it got duplicate key, it means '+919980092461' already exists in another row
// The constraint name is profiles_phone_key (UNIQUE)
// The account still has phone='919980092461' (unformatted)
// We need to check if the duplicate is a different account

console.log('\n=== Account with +919980092461 ===');
const r3 = await q(`SELECT id, full_name, phone FROM profiles WHERE phone = '+919980092461'`);
console.log(JSON.stringify(r3, null, 2));

process.exit(0);
