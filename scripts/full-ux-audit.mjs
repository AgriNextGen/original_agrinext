import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:5173';
const PHONE = '9888880101';
const PASSWORD = 'SmokeTest@99';
const OUT = join(process.cwd(), 'screenshots', 'full-audit-2026-03-14');

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

let shotIndex = 0;

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function screenshot(page, name, opts = {}) {
  shotIndex++;
  const prefix = String(shotIndex).padStart(2, '0');
  const path = join(OUT, `${prefix}-${name}.png`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path, fullPage: opts.fullPage ?? false });
  console.log(`  [${prefix}] ${name}`);
  return path;
}

async function loginAs(page, role) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const roleBtn = page.locator(`button:has-text("${role}"), [role="button"]:has-text("${role}")`).first();
  if (await roleBtn.count() > 0) {
    await roleBtn.click();
    await page.waitForTimeout(500);
  }

  const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[name="phone"]').first();
  if (await phoneInput.count() > 0) await phoneInput.fill(PHONE);

  const passInput = page.locator('input[type="password"]').first();
  if (await passInput.count() > 0) await passInput.fill(PASSWORD);

  const signIn = page.locator('button:has-text("Sign In")').first();
  if (await signIn.count() > 0) await signIn.click();

  await page.waitForTimeout(4000);
}

async function capturePageSet(page, context, pageName, url, rolePrefix) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  await screenshot(page, `${rolePrefix}-${pageName}-desktop`);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await screenshot(page, `${rolePrefix}-${pageName}-desktop-bottom`);

  await page.evaluate(() => window.scrollTo(0, 0));

  await page.setViewportSize(MOBILE);
  await page.waitForTimeout(1000);
  await screenshot(page, `${rolePrefix}-${pageName}-mobile`);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await screenshot(page, `${rolePrefix}-${pageName}-mobile-bottom`);

  await page.setViewportSize(DESKTOP);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function run() {
  ensureDir(OUT);
  console.log('Full UX Audit Screenshot Capture');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });

  // ── SECTION 1: PUBLIC PAGES ──
  console.log('\n--- PUBLIC PAGES ---');
  const pubCtx = await browser.newContext({ viewport: DESKTOP });
  const pubPage = await pubCtx.newPage();

  // Landing page
  await pubPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await pubPage.waitForTimeout(2000);
  await screenshot(pubPage, 'landing-desktop-full', { fullPage: true });
  await screenshot(pubPage, 'landing-desktop-hero');

  await pubPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.3));
  await pubPage.waitForTimeout(500);
  await screenshot(pubPage, 'landing-desktop-platform');

  await pubPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
  await pubPage.waitForTimeout(500);
  await screenshot(pubPage, 'landing-desktop-roles');

  await pubPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pubPage.waitForTimeout(500);
  await screenshot(pubPage, 'landing-desktop-footer');

  await pubPage.setViewportSize(MOBILE);
  await pubPage.evaluate(() => window.scrollTo(0, 0));
  await pubPage.waitForTimeout(1000);
  await screenshot(pubPage, 'landing-mobile-hero');
  await pubPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pubPage.waitForTimeout(500);
  await screenshot(pubPage, 'landing-mobile-footer');
  await pubPage.setViewportSize(DESKTOP);

  // Login page
  await pubPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await pubPage.waitForTimeout(1500);
  await screenshot(pubPage, 'login-desktop-empty');

  // Select each role
  for (const role of ['Farmer', 'Buyer', 'Agent', 'Logistics', 'Admin']) {
    const btn = pubPage.locator(`button:has-text("${role}"), [role="button"]:has-text("${role}")`).first();
    if (await btn.count() > 0) {
      await btn.click();
      await pubPage.waitForTimeout(500);
      await screenshot(pubPage, `login-role-${role.toLowerCase()}`);
    }
  }

  // Fill form
  const phoneInput = pubPage.locator('input[type="tel"], input[placeholder*="phone" i], input[name="phone"]').first();
  if (await phoneInput.count() > 0) await phoneInput.fill(PHONE);
  const passInput = pubPage.locator('input[type="password"]').first();
  if (await passInput.count() > 0) await passInput.fill(PASSWORD);
  await screenshot(pubPage, 'login-desktop-filled');

  // Mobile login
  await pubPage.setViewportSize(MOBILE);
  await pubPage.waitForTimeout(800);
  await screenshot(pubPage, 'login-mobile');
  await pubPage.setViewportSize(DESKTOP);

  // Signup page
  await pubPage.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle', timeout: 30000 });
  await pubPage.waitForTimeout(1500);
  await screenshot(pubPage, 'signup-desktop');
  await pubPage.setViewportSize(MOBILE);
  await pubPage.waitForTimeout(800);
  await screenshot(pubPage, 'signup-mobile');
  await pubPage.setViewportSize(DESKTOP);

  await pubCtx.close();

  // ── SECTION 2: FARMER DASHBOARD ──
  console.log('\n--- FARMER DASHBOARD ---');
  const farmerCtx = await browser.newContext({ viewport: DESKTOP });
  const farmerPage = await farmerCtx.newPage();
  await loginAs(farmerPage, 'Farmer');
  await screenshot(farmerPage, 'farmer-post-login');

  const farmerPages = [
    ['dashboard', '/farmer/dashboard'],
    ['my-day', '/farmer/my-day'],
    ['crops', '/farmer/crops'],
    ['farmlands', '/farmer/farmlands'],
    ['transport', '/farmer/transport'],
    ['listings', '/farmer/listings'],
    ['orders', '/farmer/orders'],
    ['earnings', '/farmer/earnings'],
    ['notifications', '/farmer/notifications'],
    ['settings', '/farmer/settings'],
  ];

  for (const [name, url] of farmerPages) {
    try {
      await capturePageSet(farmerPage, farmerCtx, name, `${BASE_URL}${url}`, 'farmer');
    } catch (e) {
      console.log(`  [SKIP] farmer-${name}: ${e.message}`);
    }
  }

  // Mobile bottom tab bar
  await farmerPage.setViewportSize(MOBILE);
  await farmerPage.goto(`${BASE_URL}/farmer/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await farmerPage.waitForTimeout(2000);
  await screenshot(farmerPage, 'farmer-mobile-bottomtab');

  await farmerCtx.close();

  // ── SECTION 3: AGENT DASHBOARD ──
  console.log('\n--- AGENT DASHBOARD ---');
  const agentCtx = await browser.newContext({ viewport: DESKTOP });
  const agentPage = await agentCtx.newPage();
  await loginAs(agentPage, 'Agent');
  await screenshot(agentPage, 'agent-post-login');

  const agentPages = [
    ['dashboard', '/agent/dashboard'],
    ['today', '/agent/today'],
    ['tasks', '/agent/tasks'],
    ['my-farmers', '/agent/my-farmers'],
    ['farmers', '/agent/farmers'],
    ['transport', '/agent/transport'],
    ['service-area', '/agent/service-area'],
    ['profile', '/agent/profile'],
  ];

  for (const [name, url] of agentPages) {
    try {
      await capturePageSet(agentPage, agentCtx, name, `${BASE_URL}${url}`, 'agent');
    } catch (e) {
      console.log(`  [SKIP] agent-${name}: ${e.message}`);
    }
  }

  await agentCtx.close();

  // ── SECTION 4: LOGISTICS DASHBOARD ──
  console.log('\n--- LOGISTICS DASHBOARD ---');
  const logCtx = await browser.newContext({ viewport: DESKTOP });
  const logPage = await logCtx.newPage();
  await loginAs(logPage, 'Logistics');
  await screenshot(logPage, 'logistics-post-login');

  const logPages = [
    ['dashboard', '/logistics/dashboard'],
    ['loads', '/logistics/loads'],
    ['trips', '/logistics/trips'],
    ['completed', '/logistics/completed'],
    ['vehicles', '/logistics/vehicles'],
    ['service-area', '/logistics/service-area'],
    ['profile', '/logistics/profile'],
  ];

  for (const [name, url] of logPages) {
    try {
      await capturePageSet(logPage, logCtx, name, `${BASE_URL}${url}`, 'logistics');
    } catch (e) {
      console.log(`  [SKIP] logistics-${name}: ${e.message}`);
    }
  }

  await logCtx.close();

  // ── SECTION 5: BUYER DASHBOARD ──
  console.log('\n--- BUYER DASHBOARD ---');
  const buyCtx = await browser.newContext({ viewport: DESKTOP });
  const buyPage = await buyCtx.newPage();
  await loginAs(buyPage, 'Buyer');
  await screenshot(buyPage, 'buyer-post-login');

  const buyPages = [
    ['dashboard', '/marketplace/dashboard'],
    ['browse', '/marketplace/browse'],
    ['orders', '/marketplace/orders'],
    ['profile', '/marketplace/profile'],
  ];

  for (const [name, url] of buyPages) {
    try {
      await capturePageSet(buyPage, buyCtx, name, `${BASE_URL}${url}`, 'buyer');
    } catch (e) {
      console.log(`  [SKIP] buyer-${name}: ${e.message}`);
    }
  }

  // Mobile bottom tab bar for buyer
  await buyPage.setViewportSize(MOBILE);
  await buyPage.goto(`${BASE_URL}/marketplace/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await buyPage.waitForTimeout(2000);
  await screenshot(buyPage, 'buyer-mobile-bottomtab');

  await buyCtx.close();

  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log(`Done! ${shotIndex} screenshots saved to ${OUT}`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
