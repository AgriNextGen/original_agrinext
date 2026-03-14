import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, 'screenshots', 'logistics-audit-complete');

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

async function captureLogisticsAudit() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('=== LOGISTICS DASHBOARD AUDIT - SCREENSHOT CAPTURE ===\n');

    // Step 1: Login
    console.log('Step 1: Navigate to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(OUTPUT_DIR, '01-login-initial.png'), fullPage: true });
    console.log('✓ Captured: 01-login-initial.png');

    console.log('\nStep 2: Select Logistics role...');
    await page.click('text=Logistics');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(OUTPUT_DIR, '02-login-logistics-selected.png'), fullPage: true });
    console.log('✓ Captured: 02-login-logistics-selected.png');

    console.log('\nStep 3: Fill credentials...');
    await page.waitForSelector('input[type="tel"], input[type="text"]');
    const phoneInput = await page.locator('input[type="tel"], input[type="text"]').first();
    await phoneInput.fill('9900000103');
    await page.waitForTimeout(500);
    
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUTPUT_DIR, '03-login-filled.png'), fullPage: true });
    console.log('✓ Captured: 03-login-filled.png');

    console.log('\nStep 4: Sign in and wait...');
    await page.click('button:has-text("Sign In"), button[type="submit"]');
    console.log('Waiting 20 seconds for authentication...');
    await page.waitForTimeout(20000);
    await page.screenshot({ path: join(OUTPUT_DIR, '04-after-login.png'), fullPage: true });
    console.log('✓ Captured: 04-after-login.png');

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (!currentUrl.includes('/logistics')) {
      console.error('❌ Not logged in to logistics dashboard');
      return;
    }

    console.log('\n=== DESKTOP SCREENSHOTS (1280x900) ===\n');

    // A. Dashboard
    console.log('A. Dashboard...');
    await page.goto('http://localhost:5173/logistics/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '05-dashboard-desktop.png'), fullPage: true });
    console.log('✓ Captured: 05-dashboard-desktop.png');

    // B. Loads
    console.log('B. Loads...');
    await page.goto('http://localhost:5173/logistics/loads', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '06-loads-desktop.png'), fullPage: true });
    console.log('✓ Captured: 06-loads-desktop.png');

    // C. Trips
    console.log('C. Trips...');
    await page.goto('http://localhost:5173/logistics/trips', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '07-trips-desktop.png'), fullPage: true });
    console.log('✓ Captured: 07-trips-desktop.png');

    // D. Completed
    console.log('D. Completed...');
    await page.goto('http://localhost:5173/logistics/completed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '08-completed-desktop.png'), fullPage: true });
    console.log('✓ Captured: 08-completed-desktop.png');

    // E. Vehicles
    console.log('E. Vehicles...');
    await page.goto('http://localhost:5173/logistics/vehicles', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '09-vehicles-desktop.png'), fullPage: true });
    console.log('✓ Captured: 09-vehicles-desktop.png');

    // F. Service Area
    console.log('F. Service Area...');
    await page.goto('http://localhost:5173/logistics/service-area', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '10-service-area-desktop.png'), fullPage: true });
    console.log('✓ Captured: 10-service-area-desktop.png');

    // G. Profile
    console.log('G. Profile...');
    await page.goto('http://localhost:5173/logistics/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '11-profile-desktop.png'), fullPage: true });
    console.log('✓ Captured: 11-profile-desktop.png');

    console.log('\n=== MOBILE SCREENSHOTS (375x812) ===\n');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    // H. Dashboard Mobile
    console.log('H. Dashboard (Mobile)...');
    await page.goto('http://localhost:5173/logistics/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '12-dashboard-mobile.png'), fullPage: true });
    console.log('✓ Captured: 12-dashboard-mobile.png');

    // I. Loads Mobile
    console.log('I. Loads (Mobile)...');
    await page.goto('http://localhost:5173/logistics/loads', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '13-loads-mobile.png'), fullPage: true });
    console.log('✓ Captured: 13-loads-mobile.png');

    // J. Trips Mobile
    console.log('J. Trips (Mobile)...');
    await page.goto('http://localhost:5173/logistics/trips', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(OUTPUT_DIR, '14-trips-mobile.png'), fullPage: true });
    console.log('✓ Captured: 14-trips-mobile.png');

    console.log('\n✅ ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
    console.log(`\nScreenshots saved to: ${OUTPUT_DIR}`);
    console.log('\nTotal screenshots: 14');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: join(OUTPUT_DIR, 'error-screenshot.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

captureLogisticsAudit().catch(console.error);
