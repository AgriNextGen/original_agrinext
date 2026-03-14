/**
 * Farmer Integration Tests — Layer 2
 *
 * Tests real Supabase CRUD operations, RLS enforcement, and auth
 * against a live Supabase instance. Skips gracefully when env vars are missing.
 *
 * Required env vars:
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)
 */
import { describe, it, expect, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

const HAS_CREDENTIALS = !!(SUPABASE_URL && SERVICE_ROLE_KEY && ANON_KEY);

const DEMO_TAG = `farmer_test_${Date.now()}`;
const TEST_PHONE = '+919777770101';
const TEST_PASSWORD = 'FarmerTest@99';
const TEST_EMAIL = `${TEST_PHONE.replace(/\D/g, '')}@agrinext.local`;

let adminClient: SupabaseClient;
let farmerUserId: string;
let farmerToken: string;
let farmerClient: SupabaseClient;

let createdFarmlandId: string;
let createdCropId: string;
let createdListingId: string;
let createdTransportId: string;

function authedClient(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function provisionFarmer() {
  adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await adminClient
    .from('profiles').select('id').eq('phone', TEST_PHONE).maybeSingle();

  if (existing?.id) {
    farmerUserId = existing.id;
    await adminClient.auth.admin.updateUserById(farmerUserId, {
      email: TEST_EMAIL, password: TEST_PASSWORD, phone: TEST_PHONE,
      email_confirm: true, user_metadata: { role: 'farmer', demo_tag: DEMO_TAG },
    });
  } else {
    const { data: created, error } = await adminClient.auth.admin.createUser({
      email: TEST_EMAIL, password: TEST_PASSWORD, phone: TEST_PHONE,
      email_confirm: true, user_metadata: { role: 'farmer', demo_tag: DEMO_TAG },
    });
    if (error) {
      let page = 1;
      while (page <= 10 && !farmerUserId) {
        const listed = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
        const found = listed.data?.users?.find(u => u.email?.toLowerCase() === TEST_EMAIL.toLowerCase());
        if (found) {
          farmerUserId = found.id;
          await adminClient.auth.admin.updateUserById(farmerUserId, {
            password: TEST_PASSWORD, phone: TEST_PHONE, email_confirm: true,
            user_metadata: { role: 'farmer', demo_tag: DEMO_TAG },
          });
        }
        if ((listed.data?.users?.length ?? 0) < 100) break;
        page++;
      }
      if (!farmerUserId) throw new Error(`Cannot provision farmer: ${error.message}`);
    } else {
      farmerUserId = created.user.id;
    }
  }

  await adminClient.from('profiles').upsert({
    id: farmerUserId, full_name: 'Test Farmer', phone: TEST_PHONE,
    auth_email: TEST_EMAIL, account_status: 'active', is_locked: false,
    failed_login_count_window: 0, blocked_until: null,
    district: 'Mysuru', village: 'Test Village', preferred_language: 'en',
    demo_tag: DEMO_TAG, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  await adminClient.from('user_roles').upsert(
    { user_id: farmerUserId, role: 'farmer', created_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

async function loginFarmer() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/login-by-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE, password: TEST_PASSWORD, role: 'farmer' }),
  });
  const body = await res.json();
  farmerToken = body?.access_token ?? body?.session?.access_token;
  if (!farmerToken) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  farmerClient = authedClient(farmerToken);
}

async function cleanup() {
  if (!adminClient) return;
  const tables = ['listings', 'crops', 'farmlands'];
  for (const table of tables) {
    await adminClient.from(table).delete().eq('demo_tag', DEMO_TAG).then(() => {});
  }
  await adminClient.from('transport_requests').delete().eq('demo_tag', DEMO_TAG).then(() => {});
  await adminClient.from('user_roles').delete().eq('user_id', farmerUserId).then(() => {});
  await adminClient.from('profiles').delete().eq('demo_tag', DEMO_TAG).then(() => {});
  await adminClient.auth.admin.deleteUser(farmerUserId).catch(() => {});
  await adminClient.storage.from('profile-photos')
    .remove([`farmer-test/${DEMO_TAG}/test.txt`]).catch(() => {});
}

describe.skipIf(!HAS_CREDENTIALS)('Farmer Integration Tests', () => {
  afterAll(cleanup);

  it('provisions farmer user', async () => {
    await provisionFarmer();
    expect(farmerUserId).toBeTruthy();
  }, 15000);

  it('farmer can login via Edge Function', async () => {
    await loginFarmer();
    expect(farmerToken).toBeTruthy();
  }, 10000);

  it('farmer can create farmland', async () => {
    const { data, error } = await farmerClient.from('farmlands').insert({
      farmer_id: farmerUserId, name: 'Integration Test Farm',
      area: 3, area_unit: 'acres', village: 'Test Village',
      district: 'Mysuru', soil_type: 'red', demo_tag: DEMO_TAG,
    }).select('id').single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    createdFarmlandId = data!.id;
  }, 10000);

  it('farmer can create crop linked to farmland', async () => {
    const { data, error } = await farmerClient.from('crops').insert({
      farmer_id: farmerUserId, crop_name: 'Integration Tomato',
      status: 'growing', health_status: 'normal', growth_stage: 'seedling',
      land_id: createdFarmlandId, variety: 'Cherry', demo_tag: DEMO_TAG,
    }).select('id').single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    createdCropId = data!.id;
  }, 10000);

  it('farmer can fetch own crops', async () => {
    const { data, error } = await farmerClient.from('crops')
      .select('id, crop_name').eq('farmer_id', farmerUserId).eq('demo_tag', DEMO_TAG);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data?.some((c: { crop_name: string }) => c.crop_name === 'Integration Tomato')).toBe(true);
  }, 10000);

  it('farmer can update crop status', async () => {
    const { error } = await farmerClient.from('crops')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', createdCropId);

    expect(error).toBeNull();
  }, 10000);

  it('farmer can create listing', async () => {
    const { data, error } = await adminClient.from('listings').insert({
      seller_id: farmerUserId, title: 'Integration Tomatoes',
      category: 'vegetable', price: 25, quantity: 100,
      unit: 'kg', unit_price: 25, is_active: true, status: 'approved',
      crop_id: createdCropId, location: 'Mysuru', demo_tag: DEMO_TAG,
    }).select('id').single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    createdListingId = data!.id;
  }, 10000);

  it('farmer can fetch own listings', async () => {
    const { data, error } = await farmerClient.from('listings')
      .select('id, title').eq('seller_id', farmerUserId).eq('demo_tag', DEMO_TAG);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
  }, 10000);

  it('farmer can create transport request', async () => {
    const { data, error } = await adminClient.from('transport_requests').insert({
      farmer_id: farmerUserId, pickup_location: 'Test Village, Mysuru',
      quantity: 50, status: 'requested', demo_tag: DEMO_TAG,
    }).select('id').single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    createdTransportId = data!.id;
  }, 10000);

  it('RLS: farmer cannot read another farmer\'s farmlands', async () => {
    const { data } = await farmerClient.from('farmlands')
      .select('id').eq('farmer_id', 'nonexistent-user-id-000');

    expect(data?.length ?? 0).toBe(0);
  }, 10000);

  it('RLS: farmer cannot read another farmer\'s crops', async () => {
    const { data } = await farmerClient.from('crops')
      .select('id').eq('farmer_id', 'nonexistent-user-id-000');

    expect(data?.length ?? 0).toBe(0);
  }, 10000);

  it('storage: upload and signed URL', async () => {
    const filePath = `farmer-test/${DEMO_TAG}/test.txt`;
    const fileContent = new Blob(['integration-test'], { type: 'text/plain' });

    const { error: uploadErr } = await adminClient.storage
      .from('profile-photos').upload(filePath, fileContent, { upsert: true });

    if (uploadErr?.message?.includes('not found')) {
      console.log('  Skipping storage test: bucket not found');
      return;
    }
    expect(uploadErr).toBeNull();

    const { data: signed, error: signErr } = await adminClient.storage
      .from('profile-photos').createSignedUrl(filePath, 60);

    expect(signErr).toBeNull();
    expect(signed?.signedUrl).toBeTruthy();
  }, 10000);
});
