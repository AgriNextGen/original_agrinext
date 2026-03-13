import { getSupabaseConfig, createAdminClient } from './common.mjs';

const { url: SUPABASE_URL, serviceRoleKey: SERVICE_ROLE_KEY } = getSupabaseConfig();
const supabase = createAdminClient();

async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  return res.json();
}

// Use the supabase management API instead
async function execSQL(query) {
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

// Fallback: use supabase-js RPC if we have an exec_sql function
async function execViaRPC(query) {
  const { data, error } = await supabase.rpc('exec_sql', { query });
  if (error) throw error;
  return data;
}

// Try direct DB via pg if available
async function tryPg(query) {
  const { default: pg } = await import('pg');
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  const poolerUrl = `postgresql://postgres.${projectRef}:${process.env.DB_PASSWORD}@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`;
  const client = new pg.Client({ connectionString: poolerUrl });
  await client.connect();
  const result = await client.query(query);
  await client.end();
  return result;
}

async function main() {
  console.log('=== Testing SQL execution method ===\n');

  // Try management API first
  try {
    const r = await execSQL('SELECT 1 as test');
    console.log('Management API works:', r);
  } catch (e) {
    console.log('Management API failed:', e.message);
  }

  // Try RPC
  try {
    const r = await execViaRPC('SELECT 1 as test');
    console.log('RPC works:', r);
  } catch (e) {
    console.log('RPC failed:', e.message);
  }
}

main().catch(console.error);
