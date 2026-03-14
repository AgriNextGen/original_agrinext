import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'agent-audit');
const BASE = 'http://localhost:5173';

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

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('=== AgriNext Agent Dashboard Audit ===\n');

  // Step 1: Login
  console.log('[1/4] Logging in...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: path.join(OUT, 'audit-01-login-initial.png'), fullPage: true });
  console.log('  -> Screenshot: login-initial');

  // Click Agent role button
  const agentBtn = page.locator('button:has-text("Agent")').first();
  await agentBtn.click();
  await page.waitForTimeout(500);

  // Fill credentials
  const phoneInput = page.locator('input[type="tel"], input[placeholder*="987"], input[placeholder*="phone"]').first();
  await phoneInput.fill('9900000102');
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('Dummy@12345');
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(OUT, 'audit-02-login-filled.png'), fullPage: true });
  console.log('  -> Screenshot: login-filled');

  // Submit
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In")').first();
  await submitBtn.click();

  // Wait for navigation or error
  try {
    await page.waitForURL('**/agent/**', { timeout: 30000 });
    console.log('  -> Login successful! URL:', page.url());
  } catch {
    // Check if still on login
    const currentUrl = page.url();
    console.log('  -> Login result URL:', currentUrl);
    const errorText = await page.locator('.text-destructive, [role="alert"]').textContent().catch(() => '');
    if (errorText) console.log('  -> Error:', errorText);

    // Try alternate credentials
    console.log('  -> Trying alternate credentials...');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('button:has-text("Agent")').first().click();
    await page.waitForTimeout(300);
    await phoneInput.fill('9888880102');
    await passwordInput.fill('SmokeTest@99');
    await submitBtn.click();

    try {
      await page.waitForURL('**/agent/**', { timeout: 30000 });
      console.log('  -> Alternate login successful!');
    } catch {
      console.log('  -> Both logins failed. Attempting direct navigation...');
    }
  }

  await page.screenshot({ path: path.join(OUT, 'audit-03-post-login.png'), fullPage: true });
  console.log('  -> Screenshot: post-login');

  // Step 2: Desktop pages
  console.log('\n[2/4] Capturing desktop pages...');
  for (const pg of PAGES) {
    try {
      await page.goto(`${BASE}${pg.url}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      const isLoginRedirect = currentUrl.includes('/login');

      await page.screenshot({
        path: path.join(OUT, `audit-desktop-${pg.name}.png`),
        fullPage: true,
      });

      const status = isLoginRedirect ? 'REDIRECTED TO LOGIN' : 'OK';
      console.log(`  [${status}] ${pg.label} -> ${pg.name}.png`);

      // If on dashboard, also scroll down
      if (pg.name === 'dashboard' && !isLoginRedirect) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(OUT, 'audit-desktop-dashboard-bottom.png'),
          fullPage: true,
        });
        console.log('  -> Dashboard bottom captured');
      }

      // If tasks page, try to open create dialog
      if (pg.name === 'tasks' && !isLoginRedirect) {
        const createBtn = page.locator('button:has-text("New Task"), button:has-text("Create")').first();
        if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await createBtn.click();
          await page.waitForTimeout(1000);
          await page.screenshot({
            path: path.join(OUT, 'audit-desktop-tasks-create-dialog.png'),
            fullPage: true,
          });
          console.log('  -> Task create dialog captured');
          await page.keyboard.press('Escape');
        }
      }
    } catch (e) {
      console.log(`  [ERROR] ${pg.label}: ${e.message}`);
    }
  }

  // Step 3: Mobile viewport (375x812)
  console.log('\n[3/4] Capturing mobile views (375x812)...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);

  const mobilePages = ['dashboard', 'tasks', 'my-farmers', 'today'];
  for (const name of mobilePages) {
    try {
      await page.goto(`${BASE}/agent/${name}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);

      const isLogin = page.url().includes('/login');
      await page.screenshot({
        path: path.join(OUT, `audit-mobile-${name}.png`),
        fullPage: true,
      });
      console.log(`  [${isLogin ? 'LOGIN' : 'OK'}] Mobile ${name}`);

      // Open hamburger menu on dashboard
      if (name === 'dashboard' && !isLogin) {
        const hamburger = page.locator('button[aria-label*="menu"], button.md\\:hidden').first();
        if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
          await hamburger.click();
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(OUT, 'audit-mobile-sidebar-open.png'),
            fullPage: true,
          });
          console.log('  -> Mobile sidebar captured');
          await page.keyboard.press('Escape');
        }
      }
    } catch (e) {
      console.log(`  [ERROR] Mobile ${name}: ${e.message}`);
    }
  }

  // Step 4: Tablet viewport (768x1024)
  console.log('\n[4/4] Capturing tablet view (768x1024)...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);

  try {
    await page.goto(`${BASE}/agent/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(OUT, 'audit-tablet-dashboard.png'),
      fullPage: true,
    });
    console.log('  [OK] Tablet dashboard');
  } catch (e) {
    console.log(`  [ERROR] Tablet: ${e.message}`);
  }

  // Login page on mobile
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.screenshot({
    path: path.join(OUT, 'audit-mobile-login.png'),
    fullPage: true,
  });
  console.log('  [OK] Mobile login page');

  await browser.close();

  console.log('\n=== Audit Complete ===');
  console.log(`Screenshots saved to: ${OUT}`);
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
