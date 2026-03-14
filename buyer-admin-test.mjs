import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotDir = join(__dirname, 'buyer-admin-test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBuyerAndAdmin() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  const results = [];
  const consoleLogs = [];
  const errors = [];
  
  // Capture console logs
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Capture errors
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    console.log('\n========== PART A: BUYER LOGIN ==========\n');
    
    // 1. Go to login page
    console.log('1. Navigating to http://localhost:5173/login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'load', timeout: 60000 });
    await sleep(3000);
    await page.screenshot({ path: join(screenshotDir, '01-login-page.png'), fullPage: true });
    
    // 2. Click Buyer role button
    console.log('2. Clicking Buyer role button');
    const buyerButton = page.locator('button:has-text("Buyer"), button:has-text("buyer"), [data-role="buyer"]').first();
    await buyerButton.click();
    await sleep(1000);
    await page.screenshot({ path: join(screenshotDir, '02-buyer-selected.png'), fullPage: true });
    
    // 3. Enter credentials
    console.log('3. Entering Buyer credentials');
    await page.fill('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]', '9900000104');
    await sleep(500);
    await page.fill('input[type="password"]', 'Dummy@12345');
    await sleep(500);
    await page.screenshot({ path: join(screenshotDir, '03-buyer-credentials-filled.png'), fullPage: true });
    
    // 4. Click Sign In
    console.log('4. Clicking Sign In button');
    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("sign in"), button[type="submit"]').first();
    await signInButton.click();
    
    // 5. Wait for navigation (up to 30 seconds for Edge Function)
    console.log('5. Waiting for page to load (up to 30 seconds)');
    await sleep(30000);
    
    // 6. Take screenshot of where we end up
    console.log('6. Taking screenshot of Buyer dashboard');
    await page.screenshot({ path: join(screenshotDir, '04-buyer-after-login.png'), fullPage: true });
    const buyerDashboardUrl = page.url();
    const buyerDashboardContent = await page.textContent('body');
    results.push({
      page: 'Buyer Dashboard',
      url: buyerDashboardUrl,
      hasContent: buyerDashboardContent.length > 100,
      screenshot: '04-buyer-after-login.png'
    });
    console.log(`   Current URL: ${buyerDashboardUrl}`);
    console.log(`   Page has content: ${buyerDashboardContent.length > 100}`);
    
    // 7. Navigate to Browse page
    console.log('7. Navigating to /marketplace/browse');
    await page.goto('http://localhost:5173/marketplace/browse', { waitUntil: 'load', timeout: 60000 });
    await sleep(10000);
    await page.screenshot({ path: join(screenshotDir, '05-buyer-browse.png'), fullPage: true });
    const browseContent = await page.textContent('body');
    results.push({
      page: 'Buyer Browse',
      url: page.url(),
      hasContent: browseContent.length > 100,
      screenshot: '05-buyer-browse.png'
    });
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Page has content: ${browseContent.length > 100}`);
    
    // 8. Navigate to Orders page
    console.log('8. Navigating to /marketplace/orders');
    await page.goto('http://localhost:5173/marketplace/orders', { waitUntil: 'load', timeout: 60000 });
    await sleep(10000);
    await page.screenshot({ path: join(screenshotDir, '05-buyer-orders.png'), fullPage: true });
    const ordersContent = await page.textContent('body');
    results.push({
      page: 'Buyer Orders',
      url: page.url(),
      hasContent: ordersContent.length > 100,
      screenshot: '05-buyer-orders.png'
    });
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Page has content: ${ordersContent.length > 100}`);
    
    console.log('\n========== PART B: ADMIN LOGIN ==========\n');
    
    // Clear session for admin login
    console.log('9a. Clearing browser session');
    await context.clearCookies();
    await context.clearPermissions();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // 9. Go to login page
    console.log('9. Navigating to http://localhost:5173/login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'load', timeout: 60000 });
    await sleep(3000);
    await page.screenshot({ path: join(screenshotDir, '06-admin-login-page.png'), fullPage: true });
    
    // 10. Click Admin role button
    console.log('10. Clicking Admin role button');
    const adminButton = page.locator('button:has-text("Admin"), button:has-text("admin"), [data-role="admin"]').first();
    await adminButton.click();
    await sleep(1000);
    await page.screenshot({ path: join(screenshotDir, '06-admin-selected.png'), fullPage: true });
    
    // 11. Enter credentials
    console.log('11. Entering Admin credentials');
    await page.fill('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]', '9900000105');
    await sleep(500);
    await page.fill('input[type="password"]', 'Dummy@12345');
    await sleep(500);
    await page.screenshot({ path: join(screenshotDir, '07-admin-credentials-filled.png'), fullPage: true });
    
    // 12. Click Sign In
    console.log('12. Clicking Sign In button');
    const adminSignInButton = page.locator('button:has-text("Sign In"), button:has-text("sign in"), button[type="submit"]').first();
    await adminSignInButton.click();
    
    // 13. Wait for navigation (up to 30 seconds for Edge Function)
    console.log('13. Waiting for page to load (up to 30 seconds)');
    await sleep(30000);
    
    // 14. Take screenshot of where we end up
    console.log('14. Taking screenshot of Admin dashboard');
    await page.screenshot({ path: join(screenshotDir, '08-admin-after-login.png'), fullPage: true });
    const adminDashboardUrl = page.url();
    const adminDashboardContent = await page.textContent('body');
    results.push({
      page: 'Admin Dashboard',
      url: adminDashboardUrl,
      hasContent: adminDashboardContent.length > 100,
      screenshot: '08-admin-after-login.png'
    });
    console.log(`   Current URL: ${adminDashboardUrl}`);
    console.log(`   Page has content: ${adminDashboardContent.length > 100}`);
    
    // 15. Navigate to Disputes page
    console.log('15. Navigating to /admin/disputes');
    await page.goto('http://localhost:5173/admin/disputes', { waitUntil: 'load', timeout: 60000 });
    await sleep(10000);
    await page.screenshot({ path: join(screenshotDir, '09-admin-disputes.png'), fullPage: true });
    const disputesContent = await page.textContent('body');
    results.push({
      page: 'Admin Disputes',
      url: page.url(),
      hasContent: disputesContent.length > 100,
      screenshot: '09-admin-disputes.png'
    });
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Page has content: ${disputesContent.length > 100}`);
    
    // 16. Navigate to System Health page
    console.log('16. Navigating to /admin/system-health');
    await page.goto('http://localhost:5173/admin/system-health', { waitUntil: 'load', timeout: 60000 });
    await sleep(10000);
    await page.screenshot({ path: join(screenshotDir, '09-admin-system-health.png'), fullPage: true });
    const systemHealthContent = await page.textContent('body');
    results.push({
      page: 'Admin System Health',
      url: page.url(),
      hasContent: systemHealthContent.length > 100,
      screenshot: '09-admin-system-health.png'
    });
    console.log(`   Current URL: ${page.url()}`);
    console.log(`   Page has content: ${systemHealthContent.length > 100}`);
    
    console.log('\n========== TEST RESULTS ==========\n');
    results.forEach(result => {
      console.log(`${result.page}:`);
      console.log(`  URL: ${result.url}`);
      console.log(`  Has Content: ${result.hasContent}`);
      console.log(`  Screenshot: ${result.screenshot}`);
      console.log('');
    });
    
    // Save results to JSON
    fs.writeFileSync(
      join(screenshotDir, 'test-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    // Save console logs
    fs.writeFileSync(
      join(screenshotDir, 'console-logs.txt'),
      consoleLogs.join('\n')
    );
    
    // Save errors
    fs.writeFileSync(
      join(screenshotDir, 'errors.txt'),
      errors.join('\n')
    );
    
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: join(screenshotDir, 'error-screenshot.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

testBuyerAndAdmin().catch(console.error);
