import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotsDir = join(__dirname, 'logistics-final-test-screenshots');

async function testLogisticsPagesFinal() {
  console.log('='.repeat(60));
  console.log('LOGISTICS PAGES RE-TEST');
  console.log('='.repeat(60));
  console.log('\nThis test will:');
  console.log('1. Login as LOGISTICS user');
  console.log('2. Test /logistics/loads page');
  console.log('3. Test /logistics/trips page');
  console.log('4. Test /logistics/completed page');
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Create screenshots directory
  try {
    mkdirSync(screenshotsDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000); // 60 second timeout for all operations
  
  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    logs.push(text);
    if (msg.type() === 'error') {
      console.log(`  Browser console: ${text}`);
    }
  });
  page.on('pageerror', err => {
    const text = `[PAGE ERROR] ${err.message}`;
    logs.push(text);
    console.log(`  ${text}`);
  });

  const testResults = {
    loginSuccess: false,
    loads: { success: false, details: {} },
    trips: { success: false, details: {} },
    completed: { success: false, details: {} }
  };

  try {
    // STEP 1: LOGIN
    console.log('STEP 1: LOGIN AS LOGISTICS USER');
    console.log('-'.repeat(60));
    console.log('Navigating to login page...');
    
    await page.goto('http://localhost:5173/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: join(screenshotsDir, '01-login-page.png'), fullPage: true });
    console.log('✓ Screenshot: 01-login-page.png');
    
    // Select Logistics role
    console.log('\nSelecting Logistics role...');
    await page.locator('button:has-text("Logistics")').first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(screenshotsDir, '02-logistics-selected.png'), fullPage: true });
    console.log('✓ Screenshot: 02-logistics-selected.png');
    
    // Enter credentials
    console.log('\nEntering phone: 9900000103...');
    await page.locator('input[type="tel"]').first().fill('9900000103');
    await page.waitForTimeout(500);
    
    console.log('Entering password...');
    await page.locator('input[type="password"]').first().fill('Dummy@12345');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(screenshotsDir, '03-credentials-filled.png'), fullPage: true });
    console.log('✓ Screenshot: 03-credentials-filled.png');
    
    // Submit login
    console.log('\nSubmitting login form...');
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for navigation OR error with long timeout
    console.log('Waiting for login response (60 seconds max)...');
    
    try {
      await Promise.race([
        page.waitForURL(/\/(logistics|dashboard)/, { timeout: 60000 }),
        page.waitForTimeout(60000)
      ]);
    } catch (e) {
      console.log('  Login wait completed (may have timed out)');
    }
    
    await page.waitForTimeout(3000); // Extra wait for any post-login setup
    
    const loginUrl = page.url();
    console.log(`\nCurrent URL: ${loginUrl}`);
    
    if (loginUrl.includes('/logistics') && !loginUrl.includes('/login')) {
      console.log('✓ LOGIN SUCCESSFUL');
      testResults.loginSuccess = true;
    } else {
      console.log('⚠️ Still on login page - checking for errors...');
      const errors = await page.locator('[role="alert"], .text-destructive').allInnerTexts();
      if (errors.length > 0) {
        console.log(`Error messages: ${errors.join('; ')}`);
      }
    }
    
    await page.screenshot({ path: join(screenshotsDir, '04-after-login.png'), fullPage: true });
    console.log('✓ Screenshot: 04-after-login.png');
    
    // STEP 2: TEST THE THREE PAGES
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: TESTING LOGISTICS PAGES');
    console.log('='.repeat(60) + '\n');
    
    // PAGE 1: /logistics/loads
    console.log('PAGE 1: /logistics/loads');
    console.log('-'.repeat(60));
    
    try {
      await page.goto('http://localhost:5173/logistics/loads', { 
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      
      console.log('Waiting 10 seconds for content...');
      await page.waitForTimeout(10000);
      
      const loadsUrl = page.url();
      const loadsTitle = await page.title();
      const bodyText = await page.locator('body').innerText();
      
      // Analyze page content
      testResults.loads.url = loadsUrl;
      testResults.loads.title = loadsTitle;
      testResults.loads.bodyTextLength = bodyText.length;
      testResults.loads.preview = bodyText.slice(0, 200).replace(/\s+/g, ' ');
      
      // Check for specific UI states
      testResults.loads.hasSpinner = bodyText.toLowerCase().includes('loading') || 
                                     await page.locator('[role="status"]').count() > 0;
      testResults.loads.hasEmptyState = bodyText.toLowerCase().includes('no loads') ||
                                        bodyText.toLowerCase().includes('empty');
      testResults.loads.hasError = bodyText.toLowerCase().includes('error') ||
                                   bodyText.toLowerCase().includes('failed');
      testResults.loads.hasSetupMessage = bodyText.includes('Setting up') ||
                                          bodyText.includes('setup is taking');
      testResults.loads.hasTableOrList = await page.locator('table, [role="table"], ul[class*="list"]').count() > 0;
      testResults.loads.cardCount = await page.locator('[class*="card"]').count();
      
      testResults.loads.success = true;
      
      console.log(`URL: ${loadsUrl}`);
      console.log(`Title: ${loadsTitle}`);
      console.log(`Body text length: ${bodyText.length} chars`);
      console.log(`Preview: "${testResults.loads.preview}..."`);
      console.log(`Has spinner/loading: ${testResults.loads.hasSpinner}`);
      console.log(`Has empty state: ${testResults.loads.hasEmptyState}`);
      console.log(`Has error: ${testResults.loads.hasError}`);
      console.log(`Has setup message: ${testResults.loads.hasSetupMessage}`);
      console.log(`Has table/list: ${testResults.loads.hasTableOrList}`);
      console.log(`Card count: ${testResults.loads.cardCount}`);
      
      await page.screenshot({ path: join(screenshotsDir, '05-loads-page.png'), fullPage: true });
      console.log('✓ Screenshot: 05-loads-page.png');
      
    } catch (error) {
      console.log(`❌ Error testing loads page: ${error.message}`);
      testResults.loads.error = error.message;
      await page.screenshot({ path: join(screenshotsDir, '05-loads-page-ERROR.png'), fullPage: true });
    }
    
    // PAGE 2: /logistics/trips
    console.log('\n' + 'PAGE 2: /logistics/trips');
    console.log('-'.repeat(60));
    
    try {
      await page.goto('http://localhost:5173/logistics/trips', { 
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      
      console.log('Waiting 10 seconds for content...');
      await page.waitForTimeout(10000);
      
      const tripsUrl = page.url();
      const tripsTitle = await page.title();
      const bodyText = await page.locator('body').innerText();
      
      testResults.trips.url = tripsUrl;
      testResults.trips.title = tripsTitle;
      testResults.trips.bodyTextLength = bodyText.length;
      testResults.trips.preview = bodyText.slice(0, 200).replace(/\s+/g, ' ');
      
      testResults.trips.hasSpinner = bodyText.toLowerCase().includes('loading') || 
                                     await page.locator('[role="status"]').count() > 0;
      testResults.trips.hasEmptyState = bodyText.toLowerCase().includes('no trips') ||
                                        bodyText.toLowerCase().includes('empty');
      testResults.trips.hasError = bodyText.toLowerCase().includes('error') ||
                                   bodyText.toLowerCase().includes('failed');
      testResults.trips.hasSetupMessage = bodyText.includes('Setting up') ||
                                          bodyText.includes('setup is taking');
      testResults.trips.hasTableOrList = await page.locator('table, [role="table"], ul[class*="list"]').count() > 0;
      testResults.trips.cardCount = await page.locator('[class*="card"]').count();
      
      testResults.trips.success = true;
      
      console.log(`URL: ${tripsUrl}`);
      console.log(`Title: ${tripsTitle}`);
      console.log(`Body text length: ${bodyText.length} chars`);
      console.log(`Preview: "${testResults.trips.preview}..."`);
      console.log(`Has spinner/loading: ${testResults.trips.hasSpinner}`);
      console.log(`Has empty state: ${testResults.trips.hasEmptyState}`);
      console.log(`Has error: ${testResults.trips.hasError}`);
      console.log(`Has setup message: ${testResults.trips.hasSetupMessage}`);
      console.log(`Has table/list: ${testResults.trips.hasTableOrList}`);
      console.log(`Card count: ${testResults.trips.cardCount}`);
      
      await page.screenshot({ path: join(screenshotsDir, '06-trips-page.png'), fullPage: true });
      console.log('✓ Screenshot: 06-trips-page.png');
      
    } catch (error) {
      console.log(`❌ Error testing trips page: ${error.message}`);
      testResults.trips.error = error.message;
      await page.screenshot({ path: join(screenshotsDir, '06-trips-page-ERROR.png'), fullPage: true });
    }
    
    // PAGE 3: /logistics/completed
    console.log('\n' + 'PAGE 3: /logistics/completed');
    console.log('-'.repeat(60));
    
    try {
      await page.goto('http://localhost:5173/logistics/completed', { 
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      
      console.log('Waiting 5 seconds for content...');
      await page.waitForTimeout(5000);
      
      const completedUrl = page.url();
      const completedTitle = await page.title();
      const bodyText = await page.locator('body').innerText();
      
      testResults.completed.url = completedUrl;
      testResults.completed.title = completedTitle;
      testResults.completed.bodyTextLength = bodyText.length;
      testResults.completed.preview = bodyText.slice(0, 200).replace(/\s+/g, ' ');
      
      testResults.completed.hasSpinner = bodyText.toLowerCase().includes('loading') || 
                                         await page.locator('[role="status"]').count() > 0;
      testResults.completed.hasEmptyState = bodyText.toLowerCase().includes('no trips') ||
                                            bodyText.toLowerCase().includes('empty');
      testResults.completed.hasError = bodyText.toLowerCase().includes('error') ||
                                       bodyText.toLowerCase().includes('failed');
      testResults.completed.hasSetupMessage = bodyText.includes('Setting up') ||
                                              bodyText.includes('setup is taking');
      testResults.completed.hasTableOrList = await page.locator('table, [role="table"], ul[class*="list"]').count() > 0;
      testResults.completed.cardCount = await page.locator('[class*="card"]').count();
      
      testResults.completed.success = true;
      
      console.log(`URL: ${completedUrl}`);
      console.log(`Title: ${completedTitle}`);
      console.log(`Body text length: ${bodyText.length} chars`);
      console.log(`Preview: "${testResults.completed.preview}..."`);
      console.log(`Has spinner/loading: ${testResults.completed.hasSpinner}`);
      console.log(`Has empty state: ${testResults.completed.hasEmptyState}`);
      console.log(`Has error: ${testResults.completed.hasError}`);
      console.log(`Has setup message: ${testResults.completed.hasSetupMessage}`);
      console.log(`Has table/list: ${testResults.completed.hasTableOrList}`);
      console.log(`Card count: ${testResults.completed.cardCount}`);
      
      await page.screenshot({ path: join(screenshotsDir, '07-completed-page.png'), fullPage: true });
      console.log('✓ Screenshot: 07-completed-page.png');
      
    } catch (error) {
      console.log(`❌ Error testing completed page: ${error.message}`);
      testResults.completed.error = error.message;
      await page.screenshot({ path: join(screenshotsDir, '07-completed-page-ERROR.png'), fullPage: true });
    }
    
    // Save logs and results
    console.log('\n' + '='.repeat(60));
    console.log('SAVING RESULTS');
    console.log('='.repeat(60));
    
    writeFileSync(join(screenshotsDir, 'console-logs.txt'), logs.join('\n'));
    console.log('✓ Saved: console-logs.txt');
    
    writeFileSync(join(screenshotsDir, 'test-results.json'), JSON.stringify(testResults, null, 2));
    console.log('✓ Saved: test-results.json');
    
    // Generate summary report
    const report = `
LOGISTICS PAGES RE-TEST REPORT
===============================
Generated: ${new Date().toISOString()}

LOGIN
-----
Success: ${testResults.loginSuccess ? 'YES ✓' : 'NO ✗'}

PAGE TESTS
----------

1. /logistics/loads
   Success: ${testResults.loads.success ? 'YES ✓' : 'NO ✗'}
   URL: ${testResults.loads.url || 'N/A'}
   ${testResults.loads.hasSetupMessage ? '  ⚠️ Showing setup message' : ''}
   ${testResults.loads.hasEmptyState ? '  ℹ️ Showing empty state' : ''}
   ${testResults.loads.hasError ? '  ❌ Showing error' : ''}
   ${testResults.loads.hasSpinner ? '  ⏳ Showing loading spinner' : ''}
   Preview: "${testResults.loads.preview || 'N/A'}"

2. /logistics/trips
   Success: ${testResults.trips.success ? 'YES ✓' : 'NO ✗'}
   URL: ${testResults.trips.url || 'N/A'}
   ${testResults.trips.hasSetupMessage ? '  ⚠️ Showing setup message' : ''}
   ${testResults.trips.hasEmptyState ? '  ℹ️ Showing empty state' : ''}
   ${testResults.trips.hasError ? '  ❌ Showing error' : ''}
   ${testResults.trips.hasSpinner ? '  ⏳ Showing loading spinner' : ''}
   Preview: "${testResults.trips.preview || 'N/A'}"

3. /logistics/completed
   Success: ${testResults.completed.success ? 'YES ✓' : 'NO ✗'}
   URL: ${testResults.completed.url || 'N/A'}
   ${testResults.completed.hasSetupMessage ? '  ⚠️ Showing setup message' : ''}
   ${testResults.completed.hasEmptyState ? '  ℹ️ Showing empty state' : ''}
   ${testResults.completed.hasError ? '  ❌ Showing error' : ''}
   ${testResults.completed.hasSpinner ? '  ⏳ Showing loading spinner' : ''}
   Preview: "${testResults.completed.preview || 'N/A'}"

SCREENSHOTS
-----------
All screenshots saved to: ${screenshotsDir}
`;
    
    writeFileSync(join(screenshotsDir, 'TEST-REPORT.txt'), report);
    console.log('✓ Saved: TEST-REPORT.txt');
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nAll results saved to: ${screenshotsDir}\n`);
    
  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    await page.screenshot({ path: join(screenshotsDir, 'FATAL-ERROR.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

testLogisticsPagesFinal().catch(console.error);
