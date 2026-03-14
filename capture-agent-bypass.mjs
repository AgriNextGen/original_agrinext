import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'agent-audit');
const BASE = 'http://localhost:5173';

const SUPABASE_URL = 'https://rmtkkzfzdmpjlqexrbme.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGtremZ6ZG1wamxxZXhyYm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzEzNDMsImV4cCI6MjA4Njc0NzM0M30.-zSXGm5tasSBBJOONwzMX3Yp6C-stFgAPPmYJfnIMmg';

const PAGES = [
  { name: 'dashboard', url: '/agent/dashboard', label: 'Agent Dashboard' },
  { name: 'today', url: '/agent/today', label: 'Today Page' },
  { name: 'tasks', url: '/agent/tasks', label: 'Tasks Page' },
  { name: 'my-farmers', url: '/agent/my-farmers', label: 'My Farmers' },
  { name: 'farmers', url: '/agent/farmers', label: 'Farmers & Crops' },
  { name: 'transport', url: '/agent/transport', label: 'Transport' },
  { name: 'service-area', url: '/agent/service-area', label: 'Service Area' },
  { name: 'profile', url: '/agent/profile', label: 'Profile' },
];

async function getAgentSession() {
  if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find agent user
  const { data: profile } = await admin
    .from('profiles')
    .select('id, phone')
    .eq('phone', '+919900000102')
    .maybeSingle();

  let userId = profile?.id;

  if (!userId) {
    // Try other phone
    const { data: p2 } = await admin
      .from('profiles')
      .select('id, phone')
      .eq('phone', '+919888880102')
      .maybeSingle();
    userId = p2?.id;
  }

  if (!userId) {
    // List users to find any agent
    const { data: roles } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'agent')
      .limit(1);

    if (roles?.length) userId = roles[0].user_id;
  }

  if (!userId) throw new Error('No agent user found');
  console.log('Agent user ID:', userId);

  // Generate a session token
  const email = `919900000102@agrinext.local`;
  const { data: signIn, error: signInErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });

  // Use signInWithPassword with service role
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: session, error } = await anonClient.auth.signInWithPassword({
    email,
    password: 'Dummy@12345',
  });

  if (error) {
    // Try alternate password
    const { data: s2, error: e2 } = await anonClient.auth.signInWithPassword({
      email,
      password: 'SmokeTest@99',
    });
    if (e2) {
      // Try with different email format
      const { data: s3, error: e3 } = await anonClient.auth.signInWithPassword({
        email: `919888880102@agrinext.local`,
        password: 'SmokeTest@99',
      });
      if (e3) throw new Error(`All sign-in attempts failed: ${e3.message}`);
      return s3.session;
    }
    return s2.session;
  }

  return session.session;
}

async function run() {
  console.log('=== AgriNext Agent Dashboard Visual Audit ===\n');

  // Step 1: Get auth session
  console.log('[1] Getting agent auth session...');
  let session;
  try {
    session = await getAgentSession();
    console.log('  Session obtained! Expires:', new Date(session.expires_at * 1000).toISOString());
  } catch (e) {
    console.error('  Auth failed:', e.message);
    console.log('  Continuing without auth (will capture login/redirect states)...');
  }

  // Step 2: Launch browser
  const browser = await chromium.launch({ headless: true });

  // Desktop viewport
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktopCtx.newPage();

  // Step 3: Inject auth tokens into localStorage
  if (session) {
    console.log('\n[2] Injecting auth session into browser...');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

    const storageKey = `sb-rmtkkzfzdmpjlqexrbme-auth-token`;
    const tokenData = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: 'bearer',
      user: session.user,
    });

    await page.evaluate(({ key, data }) => {
      localStorage.setItem(key, data);
    }, { key: storageKey, data: tokenData });

    // Reload to pick up auth
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    console.log('  Auth injected. Current URL:', page.url());
  }

  // Step 4: Capture login page first
  console.log('\n[3] Capturing login page...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, 'audit-01-login-desktop.png'), fullPage: true });
  console.log('  -> audit-01-login-desktop.png');

  // Step 5: Capture all desktop pages
  console.log('\n[4] Capturing desktop agent pages...');
  let idx = 2;
  for (const pg of PAGES) {
    try {
      await page.goto(`${BASE}${pg.url}`, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(3000); // Wait for data to load

      const currentUrl = page.url();
      const isLogin = currentUrl.includes('/login');
      const filename = `audit-${String(idx).padStart(2, '0')}-${pg.name}-desktop.png`;

      await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
      console.log(`  [${isLogin ? 'REDIRECT' : 'OK'}] ${pg.label} -> ${filename}`);
      idx++;

      // Dashboard: capture scrolled view
      if (pg.name === 'dashboard' && !isLogin) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-dashboard-bottom.png`), fullPage: true });
        idx++;
      }

      // Tasks: try to open create dialog
      if (pg.name === 'tasks' && !isLogin) {
        const btn = page.locator('button:has-text("New Task"), button:has-text("Create Task")').first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-tasks-dialog.png`), fullPage: true });
          idx++;
          await page.keyboard.press('Escape');
        }
      }

      // Farmers: try tabs
      if (pg.name === 'farmers' && !isLogin) {
        for (const tab of ['Assigned', 'All']) {
          const tabEl = page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first();
          if (await tabEl.isVisible({ timeout: 1000 }).catch(() => false)) {
            await tabEl.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-farmers-tab-${tab.toLowerCase()}.png`), fullPage: true });
            idx++;
          }
        }
      }
    } catch (e) {
      console.log(`  [ERROR] ${pg.label}: ${e.message.slice(0, 80)}`);
      idx++;
    }
  }

  // Step 6: Header interactions
  console.log('\n[5] Capturing header interactions...');
  try {
    await page.goto(`${BASE}/agent/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    if (!page.url().includes('/login')) {
      // Notification bell
      const bell = page.locator('button:has(svg.lucide-bell), [aria-label*="notification"]').first();
      if (await bell.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bell.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-notifications.png`), fullPage: true });
        idx++;
        await page.keyboard.press('Escape');
      }

      // Profile dropdown
      const avatar = page.locator('button:has(span.rounded-full), button:has(.avatar)').first();
      if (await avatar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await avatar.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-profile-menu.png`), fullPage: true });
        idx++;
      }
    }
  } catch (e) {
    console.log(`  [ERROR] Header: ${e.message.slice(0, 80)}`);
  }

  await desktopCtx.close();

  // Step 7: Mobile screenshots
  console.log('\n[6] Capturing mobile views (375x812)...');
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileCtx.newPage();

  if (session) {
    await mobilePage.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    const storageKey = `sb-rmtkkzfzdmpjlqexrbme-auth-token`;
    const tokenData = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: 'bearer',
      user: session.user,
    });
    await mobilePage.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: storageKey, data: tokenData });
    await mobilePage.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await mobilePage.waitForTimeout(1500);
  }

  // Mobile login
  await mobilePage.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await mobilePage.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-mobile-login.png`), fullPage: true });
  console.log(`  -> Mobile login`);
  idx++;

  const mobilePages = ['dashboard', 'today', 'tasks', 'my-farmers', 'farmers'];
  for (const name of mobilePages) {
    try {
      await mobilePage.goto(`${BASE}/agent/${name}`, { waitUntil: 'networkidle', timeout: 15000 });
      await mobilePage.waitForTimeout(2000);
      const isLogin = mobilePage.url().includes('/login');
      await mobilePage.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-mobile-${name}.png`), fullPage: true });
      console.log(`  [${isLogin ? 'LOGIN' : 'OK'}] Mobile ${name}`);
      idx++;

      // Open sidebar on dashboard
      if (name === 'dashboard' && !isLogin) {
        const hamburger = mobilePage.locator('button.md\\:hidden, button:has(svg.lucide-menu)').first();
        if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
          await hamburger.click();
          await mobilePage.waitForTimeout(500);
          await mobilePage.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-mobile-sidebar.png`), fullPage: true });
          console.log('  -> Mobile sidebar open');
          idx++;
          await mobilePage.keyboard.press('Escape');
        }
      }
    } catch (e) {
      console.log(`  [ERROR] Mobile ${name}: ${e.message.slice(0, 80)}`);
      idx++;
    }
  }

  await mobileCtx.close();

  // Step 8: Tablet
  console.log('\n[7] Capturing tablet view (768x1024)...');
  const tabletCtx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tabletPage = await tabletCtx.newPage();

  if (session) {
    await tabletPage.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    const storageKey = `sb-rmtkkzfzdmpjlqexrbme-auth-token`;
    const tokenData = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: 'bearer',
      user: session.user,
    });
    await tabletPage.evaluate(({ key, data }) => localStorage.setItem(key, data), { key: storageKey, data: tokenData });
    await tabletPage.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await tabletPage.waitForTimeout(1500);
  }

  try {
    await tabletPage.goto(`${BASE}/agent/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await tabletPage.waitForTimeout(2000);
    await tabletPage.screenshot({ path: path.join(OUT, `audit-${String(idx).padStart(2, '0')}-tablet-dashboard.png`), fullPage: true });
    console.log('  -> Tablet dashboard');
    idx++;
  } catch (e) {
    console.log(`  [ERROR] Tablet: ${e.message.slice(0, 80)}`);
  }

  await tabletCtx.close();
  await browser.close();

  console.log(`\n=== Audit Complete === (${idx - 1} screenshots)`);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
