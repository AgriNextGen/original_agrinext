import { createAdminClient } from './common.mjs';

const supabase = createAdminClient();

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
