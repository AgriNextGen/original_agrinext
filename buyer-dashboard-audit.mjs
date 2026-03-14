import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function auditBuyerDashboard() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(3000);

    console.log('Step 2: Taking screenshot of login page...');
    await page.screenshot({
      path: join(__dirname, 'buyer-audit-01-login-page.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: buyer-audit-01-login-page.png');

    console.log('Step 3: Selecting Buyer role...');
    // Look for buyer role button/card
    const buyerRoleSelector = '[data-role="buyer"], button:has-text("Buyer"), [role="button"]:has-text("Buyer")';
    try {
      await page.click(buyerRoleSelector, { timeout: 5000 });
      console.log('✓ Buyer role selected');
    } catch (e) {
      console.log('Trying alternative selector for Buyer role...');
      await page.click('text=Buyer');
    }
    await page.waitForTimeout(1000);

    console.log('Step 4: Entering phone number...');
    const phoneInput = await page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').first();
    await phoneInput.fill('+919900000104');
    console.log('✓ Phone number entered: +919900000104');

    console.log('Step 5: Entering password...');
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.fill('Dummy@12345');
    console.log('✓ Password entered');

    await page.waitForTimeout(1000);

    console.log('Step 6: Taking screenshot of filled login form...');
    await page.screenshot({
      path: join(__dirname, 'buyer-audit-02-login-filled.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: buyer-audit-02-login-filled.png');

    console.log('Step 7: Clicking Sign In button...');
    const signInButton = await page.locator('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]').first();
    await signInButton.click();
    console.log('✓ Sign In button clicked');

    console.log('Step 8: Waiting for dashboard to load (3+ seconds)...');
    await page.waitForTimeout(5000);
    
    // Wait for dashboard elements to appear
    try {
      await page.waitForSelector('text=Browse Marketplace', { timeout: 10000 });
      console.log('✓ Dashboard loaded successfully');
    } catch (e) {
      console.log('Dashboard may not have loaded completely, continuing with screenshot...');
    }

    console.log('Step 9: Taking screenshot of buyer dashboard...');
    await page.screenshot({
      path: join(__dirname, 'buyer-audit-03-dashboard.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: buyer-audit-03-dashboard.png');

    // Additional detailed screenshot of the viewport (non-scrolled)
    await page.screenshot({
      path: join(__dirname, 'buyer-audit-04-dashboard-viewport.png'),
      fullPage: false
    });
    console.log('✓ Screenshot saved: buyer-audit-04-dashboard-viewport.png');
    
    // Capture mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: join(__dirname, 'buyer-audit-05-dashboard-mobile.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: buyer-audit-05-dashboard-mobile.png');

    console.log('\n=== UI/UX Audit Screenshots Complete ===');
    console.log('Screenshots saved:');
    console.log('  1. buyer-audit-01-login-page.png - Full login page');
    console.log('  2. buyer-audit-02-login-filled.png - Login form with buyer role and credentials');
    console.log('  3. buyer-audit-03-dashboard.png - Full buyer dashboard (scrollable)');
    console.log('  4. buyer-audit-04-dashboard-viewport.png - Buyer dashboard viewport');
    console.log('  5. buyer-audit-05-dashboard-mobile.png - Mobile view of buyer dashboard');

  } catch (error) {
    console.error('Error during audit:', error);
    await page.screenshot({
      path: join(__dirname, 'buyer-audit-error.png'),
      fullPage: true
    });
    throw error;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

auditBuyerDashboard().catch(console.error);
