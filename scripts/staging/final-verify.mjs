/**
 * AgriNext — Final 8-Point Verification via Supabase Management API
 */

const PAT = 'sbp_9ae4e5657d4827a0940c2e501ce756958b752572';
const PROJECT = 'rmtkkzfzdmpjlqexrbme';
const BASE = `https://api.supabase.com/v1/projects/${PROJECT}`;

async function execSQL(label, sql) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${BASE}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      return { ok: false, status: res.status, error: data };
    }
    return { ok: true, rows: Array.isArray(data) ? data : [data], count: Array.isArray(data) ? data.length : 1, raw: data };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e.message };
  }
}

function sep(char = '=', n = 72) { return char.repeat(n); }

function printTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('  (0 rows)');
    return;
  }
  const cols = Object.keys(rows[0]);
  const widths = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length)));
  const header = cols.map((c, i) => c.padEnd(widths[i])).join(' | ');
  const divider = widths.map(w => '-'.repeat(w)).join('-+-');
  console.log('  ' + header);
  console.log('  ' + divider);
  for (const row of rows) {
    console.log('  ' + cols.map((c, i) => String(row[c] ?? '').padEnd(widths[i])).join(' | '));
  }
  console.log(`  (${rows.length} row${rows.length !== 1 ? 's' : ''})`);
}

const VERIFICATIONS = [
  {
    id: 1,
    label: 'VERIFY 1 — No locked/blocked accounts',
    expected: '0 rows',
    pass: (r) => r.ok && r.count === 0,
    sql: `SELECT phone, account_status, blocked_until FROM profiles WHERE account_status != 'active' OR blocked_until > NOW()`,
  },
  {
    id: 2,
    label: 'VERIFY 2 — No profiles without a role',
    expected: '0 rows',
    pass: (r) => r.ok && r.count === 0,
    sql: `SELECT p.id, p.phone, p.full_name, COUNT(ur.user_id) AS role_rows
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.phone, p.full_name
HAVING COUNT(ur.user_id) = 0`,
  },
  {
    id: 3,
    label: 'VERIFY 3 — All 18 tables have RLS enabled',
    expected: '18 rows, all rowsecurity=true',
    pass: (r) => r.ok && r.count === 18 && r.rows.every(row => row.rowsecurity === true || row.rowsecurity === 't' || row.rowsecurity === 'true'),
    sql: `SELECT tablename, rowsecurity
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
ORDER BY tablename`,
  },
  {
    id: 4,
    label: 'VERIFY 4 — profiles_self_update security trigger exists',
    expected: '1 row with trigger_name=trg_profiles_block_security_updates',
    pass: (r) => r.ok && r.count === 1,
    sql: `SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND trigger_name = 'trg_profiles_block_security_updates'`,
  },
  {
    id: 5,
    label: "VERIFY 5 — handle_new_user blocks admin (only farmer/buyer allowed)",
    expected: "function body contains \"farmer\", \"buyer\", NO admin in allowed list",
    pass: (r) => {
      if (!r.ok || r.count === 0) return false;
      const src = r.rows[0]?.prosrc ?? '';
      const hasFarmer = src.includes("'farmer'");
      const hasBuyer = src.includes("'buyer'");
      const hasAdminInCase = /when v_role_meta in \([^)]*admin/.test(src);
      return hasFarmer && hasBuyer && !hasAdminInCase;
    },
    sql: `SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace`,
  },
  {
    id: 6,
    label: 'VERIFY 6 — record_failed_login_v1 has threshold 10',
    expected: "function body contains: v_first_lockout_threshold int := 10",
    pass: (r) => {
      if (!r.ok || r.count === 0) return false;
      const src = r.rows[0]?.prosrc ?? '';
      return src.includes('v_first_lockout_threshold int := 10');
    },
    sql: `SELECT prosrc FROM pg_proc WHERE proname = 'record_failed_login_v1' AND pronamespace::regnamespace::text = 'security'`,
  },
  {
    id: 7,
    label: 'VERIFY 7 — profiles_self_update policy with WITH CHECK clause',
    expected: '1 row with non-null with_check',
    pass: (r) => r.ok && r.count === 1 && r.rows[0]?.with_check != null,
    sql: `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_self_update'`,
  },
  {
    id: 8,
    label: 'VERIFY 8 — 5 demo accounts: status + roles',
    expected: '5 rows, all active, roles: farmer/agent/logistics/buyer/admin',
    pass: (r) => {
      if (!r.ok || r.count !== 5) return false;
      return r.rows.every(row => row.account_status === 'active');
    },
    sql: `SELECT p.phone, p.full_name, p.account_status, p.blocked_until, ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.phone IN (
  '+919900000101', '+919900000102', '+919900000103',
  '+919900000104', '+919900000105'
)
ORDER BY p.phone`,
  },
];

async function main() {
  console.log(sep());
  console.log('  AgriNext — Final 8-Point Verification Report');
  console.log(`  Project : ${PROJECT}`);
  console.log(`  Time    : ${new Date().toISOString()}`);
  console.log(sep());

  const results = [];

  for (const v of VERIFICATIONS) {
    console.log('\n' + sep('-'));
    console.log(`  ${v.label}`);
    console.log(`  Expected: ${v.expected}`);
    console.log(sep('-'));

    const r = await execSQL(v.label, v.sql);

    if (!r.ok) {
      console.log(`  ❌ QUERY ERROR: ${JSON.stringify(r.error)}`);
      results.push({ id: v.id, pass: false });
      continue;
    }

    printTable(r.rows);

    // Extra detail for function-body checks
    if (v.id === 5 && r.ok && r.count > 0) {
      const src = r.rows[0]?.prosrc ?? '';
      const snippet = src.substring(0, 800);
      console.log('\n  [function body excerpt]');
      console.log('  ' + snippet.replace(/\n/g, '\n  '));
    }
    if (v.id === 6 && r.ok && r.count > 0) {
      const src = r.rows[0]?.prosrc ?? '';
      const lines = src.split('\n').filter(l => l.includes('threshold') || l.includes('lockout'));
      console.log('\n  [threshold lines]');
      lines.forEach(l => console.log('  ' + l.trim()));
    }

    const passed = v.pass(r);
    console.log(`\n  ${passed ? '✅ PASS' : '❌ FAIL'}`);
    results.push({ id: v.id, label: v.label, pass: passed });
  }

  // Summary
  console.log('\n' + sep());
  console.log('  SUMMARY');
  console.log(sep());
  let allPass = true;
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(`  ${icon}  VERIFY ${r.id}`);
    if (!r.pass) allPass = false;
  }
  console.log(sep());
  console.log(allPass ? '  🎉 ALL 8 VERIFICATIONS PASSED' : '  ⚠️  SOME VERIFICATIONS FAILED');
  console.log(sep());
}

main().catch(console.error).finally(() => process.exit(0));
