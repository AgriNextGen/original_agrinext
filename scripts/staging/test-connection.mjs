import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rmtkkzfzdmpjlqexrbme.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGtremZ6ZG1wamxxZXhyYm1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE3MTM0MywiZXhwIjoyMDg2NzQ3MzQzfQ.boHbegytdSBXEhCT_dkg8Bl98W5lyQupb2bGo0nSqR4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const p = new Promise(async (resolve) => {
  try {
    const { data, error } = await supabase.from('profiles').select('id,phone').limit(3);
    if (error) resolve({ ok: false, error: error.message });
    else resolve({ ok: true, rows: data?.length, sample: data });
  } catch (e) {
    resolve({ ok: false, exception: e.message });
  }
});

const timer = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT after 8s')), 8000));

try {
  const result = await Promise.race([p, timer]);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.log('FAILED:', e.message);
}

process.exit(0);
