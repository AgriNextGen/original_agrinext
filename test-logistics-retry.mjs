import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotsDir = join(__dirname, 'logistics-retry-test-screenshots');

async function testLogisticsWithRetry() {
  console.log('Starting logistics test with longer timeouts...');
  
  // Create screenshots directory
  try {
    mkdirSync(screenshotsDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Collect console logs and errors
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));

  try {
    // STEP 1: Login with longer waits
    console.log('\n=== STEP 1: LOGIN ===');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log('Taking screenshot: 01-login-page');
    await page.screenshot({ path: join(screenshotsDir, '01-login-page.png'), fullPage: true });
    
    // Click Logistics role button
    console.log('Clicking Logistics role button...');
    const logisticsButton = page.locator('button', { hasText: 'Logistics' }).first();
    await logisticsButton.waitFor({ state: 'visible', timeout: 10000 });
    await logisticsButton.click();
    await page.waitForTimeout(1000);
    
    console.log('Taking screenshot: 02-logistics-selected');
    await page.screenshot({ path: join(screenshotsDir, '02-logistics-selected.png'), fullPage: true });
    
    // Enter phone number
    console.log('Entering phone number...');
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
    await phoneInput.click();
    await phoneInput.fill('9900000103');
    await page.waitForTimeout(1000);
    
    console.log('Taking screenshot: 03-phone-filled');
    await page.screenshot({ path: join(screenshotsDir, '03-phone-filled.png'), fullPage: true });
    
    // Enter password
    console.log('Entering password...');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.click();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(1000);
    
    console.log('Taking screenshot: 04-credentials-filled');
    await page.screenshot({ path: join(screenshotsDir, '04-credentials-filled.png'), fullPage: true });
    
    // Click Sign In button and wait longer
    console.log('Clicking Sign In button...');
    const signInButton = page.locator('button[type="submit"]').first();
    await signInButton.click();
    
    // Wait up to 30 seconds for navigation OR error message
    console.log('Waiting for login response (up to 30 seconds)...');
    
    const loginResult = await Promise.race([
      page.waitForURL(/\/(logistics|dashboard)/, { timeout: 30000 }).then(() => 'success'),
      page.waitForSelector('[role="alert"], .text-destructive', { timeout: 30000 }).then(() => 'error'),
      page.waitForTimeout(30000).then(() => 'timeout')
    ]);
    
    console.log(`Login result: ${loginResult}`);
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Check for error messages
    if (loginResult === 'error' || currentUrl.includes('/login')) {
      const errorElements = await page.locator('[role="alert"], .text-destructive, .text-red-500').all();
      console.log(`Found ${errorElements.length} error elements`);
      
      for (let i = 0; i < errorElements.length; i++) {
        try {
          const errorText = await errorElements[i].innerText({ timeout: 2000 });
          if (errorText.trim()) {
            console.log(`Error ${i + 1}: ${errorText.trim()}`);
          }
        } catch (e) {
          // Skip if can't get text
        }
      }
    }
    
    await page.waitForTimeout(2000);
    console.log('Taking screenshot: 05-after-login');
    await page.screenshot({ path: join(screenshotsDir, '05-after-login.png'), fullPage: true });

    // STEP 2: Test pages regardless of login success
    // (to see what happens when accessing them)
    console.log('\n=== STEP 2: TESTING PAGES ===');
    
    // Test 1: /logistics/loads
    console.log('\n--- Testing /logistics/loads ---');
    await page.goto('http://localhost:5173/logistics/loads', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Waiting 10 seconds for content to load...');
    await page.waitForTimeout(10000);
    
    const loadsUrl = page.url();
    const loadsTitle = await page.title();
    console.log(`URL: ${loadsUrl}`);
    console.log(`Title: ${loadsTitle}`);
    
    // Get page text content
    const loadsBodyText = await page.locator('body').innerText();
    const loadsPreview = loadsBodyText.slice(0, 300).replace(/\s+/g, ' ');
    console.log(`Content preview: ${loadsPreview}...`);
    
    // Check for UI elements
    const loadsChecks = {
      spinner: await page.locator('[role="status"], .animate-spin').count() > 0,
      empty: await page.locator('text=/no.*loads/i').count() > 0 || await page.locator('text=/empty/i').count() > 0,
      error: await page.locator('[role="alert"]').count() > 0 || await page.locator('text=/error/i').count() > 0,
      table: await page.locator('table').count() > 0 || await page.locator('[role="table"]').count() > 0,
      cards: await page.locator('[class*="card"]').count()
    };
    console.log('UI Elements:', JSON.stringify(loadsChecks, null, 2));
    
    await page.screenshot({ path: join(screenshotsDir, '06-loads-page.png'), fullPage: true });
    console.log('✓ Screenshot: 06-loads-page.png');
    
    // Test 2: /logistics/trips
    console.log('\n--- Testing /logistics/trips ---');
    await page.goto('http://localhost:5173/logistics/trips', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Waiting 10 seconds for content to load...');
    await page.waitForTimeout(10000);
    
    const tripsUrl = page.url();
    const tripsTitle = await page.title();
    console.log(`URL: ${tripsUrl}`);
    console.log(`Title: ${tripsTitle}`);
    
    const tripsBodyText = await page.locator('body').innerText();
    const tripsPreview = tripsBodyText.slice(0, 300).replace(/\s+/g, ' ');
    console.log(`Content preview: ${tripsPreview}...`);
    
    const tripsChecks = {
      spinner: await page.locator('[role="status"], .animate-spin').count() > 0,
      empty: await page.locator('text=/no.*trips/i').count() > 0 || await page.locator('text=/empty/i').count() > 0,
      error: await page.locator('[role="alert"]').count() > 0 || await page.locator('text=/error/i').count() > 0,
      table: await page.locator('table').count() > 0 || await page.locator('[role="table"]').count() > 0,
      cards: await page.locator('[class*="card"]').count()
    };
    console.log('UI Elements:', JSON.stringify(tripsChecks, null, 2));
    
    await page.screenshot({ path: join(screenshotsDir, '07-trips-page.png'), fullPage: true });
    console.log('✓ Screenshot: 07-trips-page.png');
    
    // Test 3: /logistics/completed
    console.log('\n--- Testing /logistics/completed ---');
    await page.goto('http://localhost:5173/logistics/completed', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Waiting 5 seconds for content to load...');
    await page.waitForTimeout(5000);
    
    const completedUrl = page.url();
    const completedTitle = await page.title();
    console.log(`URL: ${completedUrl}`);
    console.log(`Title: ${completedTitle}`);
    
    const completedBodyText = await page.locator('body').innerText();
    const completedPreview = completedBodyText.slice(0, 300).replace(/\s+/g, ' ');
    console.log(`Content preview: ${completedPreview}...`);
    
    const completedChecks = {
      spinner: await page.locator('[role="status"], .animate-spin').count() > 0,
      empty: await page.locator('text=/no.*trips/i').count() > 0 || await page.locator('text=/empty/i').count() > 0,
      error: await page.locator('[role="alert"]').count() > 0 || await page.locator('text=/error/i').count() > 0,
      table: await page.locator('table').count() > 0 || await page.locator('[role="table"]').count() > 0,
      cards: await page.locator('[class*="card"]').count()
    };
    console.log('UI Elements:', JSON.stringify(completedChecks, null, 2));
    
    await page.screenshot({ path: join(screenshotsDir, '08-completed-page.png'), fullPage: true });
    console.log('✓ Screenshot: 08-completed-page.png');
    
    // Save logs
    console.log('\nSaving console logs...');
    writeFileSync(join(screenshotsDir, 'console-logs.txt'), logs.join('\n'));
    writeFileSync(join(screenshotsDir, 'test-summary.txt'), `
TEST SUMMARY
============

Login Result: ${loginResult}
Final URL after login: ${currentUrl}

Page Test Results:
------------------

1. /logistics/loads
   URL: ${loadsUrl}
   UI: ${JSON.stringify(loadsChecks)}

2. /logistics/trips
   URL: ${tripsUrl}
   UI: ${JSON.stringify(tripsChecks)}

3. /logistics/completed
   URL: ${completedUrl}
   UI: ${JSON.stringify(completedChecks)}

Screenshots saved to: ${screenshotsDir}
`);
    
    console.log('\n✓ TEST COMPLETE');
    console.log(`\nScreenshots saved to: ${screenshotsDir}`);
    console.log('\nSummary written to: test-summary.txt');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    console.error(error.stack);
    await page.screenshot({ path: join(screenshotsDir, 'error-screenshot.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

testLogisticsWithRetry().catch(console.error);
