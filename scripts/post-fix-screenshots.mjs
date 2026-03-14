import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:5173';
const PHONE = '9888880101';
const PASSWORD = 'SmokeTest@99';
const OUT = join(process.cwd(), 'screenshots', 'post-fix-2026-03-14');

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

async function run() {
  ensureDir(OUT);
  console.log('Post-Fix Screenshot Capture');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: true });

  // ── PUBLIC PAGES ──
  console.log('\n--- PUBLIC PAGES ---');
  const pubCtx = await browser.newContext({ viewport: DESKTOP });
  const pubPage = await pubCtx.newPage();

  await pubPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await pubPage.waitForTimeout(2000);
  await screenshot(pubPage, 'landing-desktop', { fullPage: true });

  await pubPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await pubPage.waitForTimeout(1500);
  await screenshot(pubPage, 'login-desktop');

  await pubPage.setViewportSize(MOBILE);
  await pubPage.waitForTimeout(800);
  await screenshot(pubPage, 'login-mobile');
  await pubPage.setViewportSize(DESKTOP);

  await pubCtx.close();

  // ── FARMER ──
  console.log('\n--- FARMER ---');
  const farmerCtx = await browser.newContext({ viewport: DESKTOP });
  const farmerPage = await farmerCtx.newPage();
  await loginAs(farmerPage, 'Farmer');

  // Check if we landed on a dashboard
  const currentUrl = farmerPage.url();
  console.log(`  Post-login URL: ${currentUrl}`);

  if (currentUrl.includes('/farmer/') || currentUrl.includes('/login')) {
    await farmerPage.goto(`${BASE_URL}/farmer/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await farmerPage.waitForTimeout(2000);
  }

  await screenshot(farmerPage, 'farmer-dashboard-desktop');
  await farmerPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await screenshot(farmerPage, 'farmer-dashboard-desktop-bottom');

  await farmerPage.setViewportSize(MOBILE);
  await farmerPage.evaluate(() => window.scrollTo(0, 0));
  await farmerPage.waitForTimeout(1000);
  await screenshot(farmerPage, 'farmer-dashboard-mobile');
  await screenshot(farmerPage, 'farmer-mobile-bottomtab');

  await farmerPage.setViewportSize(DESKTOP);
  await farmerPage.goto(`${BASE_URL}/farmer/my-day`, { waitUntil: 'networkidle', timeout: 30000 });
  await farmerPage.waitForTimeout(2000);
  await screenshot(farmerPage, 'farmer-myday-desktop');

  await farmerPage.setViewportSize(MOBILE);
  await farmerPage.waitForTimeout(800);
  await screenshot(farmerPage, 'farmer-myday-mobile');

  await farmerCtx.close();

  // ── AGENT ──
  console.log('\n--- AGENT ---');
  const agentCtx = await browser.newContext({ viewport: DESKTOP });
  const agentPage = await agentCtx.newPage();
  await loginAs(agentPage, 'Agent');

  const agentUrl = agentPage.url();
  console.log(`  Post-login URL: ${agentUrl}`);
  if (!agentUrl.includes('/agent/')) {
    await agentPage.goto(`${BASE_URL}/agent/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await agentPage.waitForTimeout(2000);
  }

  await screenshot(agentPage, 'agent-dashboard-desktop');
  await agentPage.setViewportSize(MOBILE);
  await agentPage.waitForTimeout(800);
  await screenshot(agentPage, 'agent-dashboard-mobile');

  await agentCtx.close();

  // ── LOGISTICS ──
  console.log('\n--- LOGISTICS ---');
  const logCtx = await browser.newContext({ viewport: DESKTOP });
  const logPage = await logCtx.newPage();
  await loginAs(logPage, 'Logistics');

  const logUrl = logPage.url();
  console.log(`  Post-login URL: ${logUrl}`);
  if (!logUrl.includes('/logistics/')) {
    await logPage.goto(`${BASE_URL}/logistics/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await logPage.waitForTimeout(2000);
  }

  await screenshot(logPage, 'logistics-dashboard-desktop');
  await logPage.setViewportSize(MOBILE);
  await logPage.waitForTimeout(800);
  await screenshot(logPage, 'logistics-dashboard-mobile');

  await logCtx.close();

  // ── BUYER ──
  console.log('\n--- BUYER ---');
  const buyCtx = await browser.newContext({ viewport: DESKTOP });
  const buyPage = await buyCtx.newPage();
  await loginAs(buyPage, 'Buyer');

  const buyUrl = buyPage.url();
  console.log(`  Post-login URL: ${buyUrl}`);
  if (!buyUrl.includes('/marketplace/')) {
    await buyPage.goto(`${BASE_URL}/marketplace/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await buyPage.waitForTimeout(2000);
  }

  await screenshot(buyPage, 'buyer-dashboard-desktop');
  await buyPage.setViewportSize(MOBILE);
  await buyPage.waitForTimeout(800);
  await screenshot(buyPage, 'buyer-dashboard-mobile');
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
