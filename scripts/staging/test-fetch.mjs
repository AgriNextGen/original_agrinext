const SUPABASE_URL = 'https://rmtkkzfzdmpjlqexrbme.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGtremZ6ZG1wamxxZXhyYm1lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE3MTM0MywiZXhwIjoyMDg2NzQ3MzQzfQ.boHbegytdSBXEhCT_dkg8Bl98W5lyQupb2bGo0nSqR4';

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  console.log('Testing fetch to Supabase REST API...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,phone&limit=3`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    signal: controller.signal
  });
  clearTimeout(timeout);
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text.substring(0, 500));
} catch (e) {
  clearTimeout(timeout);
  console.log('Error:', e.name, e.message);
}

process.exit(0);
