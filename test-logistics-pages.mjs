import { chromium } from '@playwright/test';

async function testLogisticsPages() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('\n=== STEP 1: Login as LOGISTICS ===');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'logistics-test-01-login-page.png', fullPage: true });
    console.log('✓ Login page loaded');

    // Click Logistics role button
    console.log('Clicking Logistics role button...');
    await page.click('button:has-text("Logistics")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'logistics-test-02-role-selected.png', fullPage: true });
    console.log('✓ Logistics role selected');

    // Enter phone number
    console.log('Entering phone number...');
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('9900000103');
    await page.waitForTimeout(500);

    // Enter password
    console.log('Entering password...');
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'logistics-test-03-credentials-filled.png', fullPage: true });
    console.log('✓ Credentials filled');

    // Click Sign In
    console.log('Clicking Sign In...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'logistics-test-04-after-login.png', fullPage: true });
    console.log('✓ Login submitted, current URL:', page.url());

    console.log('\n=== STEP 2: Navigate to /logistics/trips ===');
    await page.goto('http://localhost:5173/logistics/trips');
    console.log('Waiting 10 seconds for page to load...');
    await page.waitForTimeout(10000);
    
    // Check for errors in console
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    
    // Check for error text on page
    const pageContent = await page.content();
    const hasError = pageContent.includes('TypeError') || 
                     pageContent.includes('Cannot read properties') || 
                     pageContent.includes('Something went wrong');
    
    await page.screenshot({ path: 'logistics-test-05-trips-page.png', fullPage: true });
    console.log('✓ Trips page screenshot taken');
    console.log('  Current URL:', page.url());
    console.log('  Has error text on page:', hasError);
    
    // Get page title and check if content is visible
    const title = await page.title();
    const mainContent = await page.locator('main').count();
    console.log('  Page title:', title);
    console.log('  Main content elements:', mainContent);

    console.log('\n=== STEP 3: Navigate to /logistics/loads ===');
    await page.goto('http://localhost:5173/logistics/loads');
    console.log('Waiting 10 seconds for page to load...');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'logistics-test-06-loads-page.png', fullPage: true });
    console.log('✓ Loads page screenshot taken');
    console.log('  Current URL:', page.url());

    console.log('\n=== STEP 4: Navigate to /logistics/dashboard ===');
    await page.goto('http://localhost:5173/logistics/dashboard');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'logistics-test-07-dashboard-page.png', fullPage: true });
    console.log('✓ Dashboard page screenshot taken');
    console.log('  Current URL:', page.url());

    console.log('\n=== TEST SUMMARY ===');
    console.log('All pages navigated successfully.');
    console.log('Screenshots saved to project root.');
    console.log('\nCheck the following screenshots:');
    console.log('  - logistics-test-05-trips-page.png (Previously crashed with TypeError)');
    console.log('  - logistics-test-06-loads-page.png');
    console.log('  - logistics-test-07-dashboard-page.png');

  } catch (error) {
    console.error('\n❌ ERROR during test:', error.message);
    await page.screenshot({ path: 'logistics-test-error.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

testLogisticsPages().catch(console.error);
