import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testLogisticsTrips() {
  console.log('🚀 Starting Logistics Trips Page Test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // Step 1: Navigate to login
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('✅ Login page loaded\n');

    // Step 2: Click Logistics role
    console.log('Step 2: Selecting Logistics role...');
    const logisticsButton = page.locator('button:has-text("Logistics")').first();
    await logisticsButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Logistics role selected\n');

    // Step 3: Enter phone
    console.log('Step 3: Entering phone number...');
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill('9900000103');
    await page.waitForTimeout(500);
    console.log('✅ Phone entered\n');

    // Step 4: Enter password
    console.log('Step 4: Entering password...');
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(500);
    console.log('✅ Password entered\n');

    // Take screenshot before signin
    await page.screenshot({ path: 'test-logistics-00-before-signin.png', fullPage: false });
    console.log('📸 Screenshot: test-logistics-00-before-signin.png\n');

    // Step 5: Click Sign In
    console.log('Step 5: Clicking Sign In...');
    const signInButton = page.locator('button:has-text("Sign In")');
    await signInButton.click();
    console.log('✅ Sign In clicked\n');

    // Step 6: Wait for redirect to dashboard
    console.log('Step 6: Waiting for dashboard redirect...');
    await page.waitForURL('**/logistics/dashboard', { timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('✅ Redirected to dashboard\n');

    // Take screenshot of dashboard
    await page.screenshot({ path: 'test-logistics-01-dashboard.png', fullPage: true });
    console.log('📸 Screenshot: test-logistics-01-dashboard.png\n');

    // Step 7: Navigate to trips page
    console.log('Step 7: Navigating to /logistics/trips...');
    await page.goto('http://localhost:5173/logistics/trips', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Navigation initiated\n');

    // Step 8: Wait 15 seconds
    console.log('Step 8: Waiting 15 seconds for page to stabilize...');
    await page.waitForTimeout(15000);
    console.log('✅ Wait complete\n');

    // Step 9: Take screenshot
    console.log('Step 9: Taking screenshot of trips page...');
    await page.screenshot({ path: 'test-logistics-02-trips-page.png', fullPage: true });
    console.log('📸 Screenshot: test-logistics-02-trips-page.png\n');

    // Analyze page content
    console.log('📊 ANALYZING TRIPS PAGE CONTENT:\n');
    
    const pageTitle = await page.title();
    console.log(`   Page title: "${pageTitle}"`);
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Check for error messages
    const errorMessages = await page.locator('text=/something went wrong/i').count();
    const hasError = errorMessages > 0;
    console.log(`   Error messages found: ${hasError ? '❌ YES' : '✅ NO'}`);

    // Check for trip cards
    const tripCards = await page.locator('[data-testid*="trip"], .trip-card, [class*="trip"]').count();
    console.log(`   Trip elements found: ${tripCards}`);

    // Check for empty state
    const emptyState = await page.locator('text=/no trips/i, text=/no data/i, text=/empty/i').count();
    const hasEmptyState = emptyState > 0;
    console.log(`   Empty state found: ${hasEmptyState ? '✅ YES' : 'NO'}`);

    // Check for loading indicators
    const loadingIndicators = await page.locator('text=/loading/i, [role="progressbar"]').count();
    const isLoading = loadingIndicators > 0;
    console.log(`   Loading indicators: ${isLoading ? 'YES' : 'NO'}`);

    console.log('\n' + '='.repeat(60));
    console.log('VERDICT:');
    if (hasError) {
      console.log('❌ PAGE STILL CRASHES - Error message detected');
    } else if (hasEmptyState || tripCards > 0) {
      console.log('✅ PAGE WORKS - Shows content (trip cards or empty state)');
    } else if (isLoading) {
      console.log('⏳ PAGE IS LOADING - May need more time');
    } else {
      console.log('⚠️  UNCLEAR - No error, but no clear content either');
    }
    console.log('='.repeat(60) + '\n');

    // BONUS: Test loads page
    console.log('BONUS TEST: Checking /logistics/loads page...\n');
    await page.goto('http://localhost:5173/logistics/loads', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'test-logistics-03-loads-page.png', fullPage: true });
    console.log('📸 Screenshot: test-logistics-03-loads-page.png\n');

    const loadsErrorMessages = await page.locator('text=/something went wrong/i').count();
    const loadsHasError = loadsErrorMessages > 0;
    console.log(`   Loads page error: ${loadsHasError ? '❌ YES' : '✅ NO'}`);

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-logistics-error.png', fullPage: true });
    console.log('📸 Error screenshot saved: test-logistics-error.png\n');
  } finally {
    await browser.close();
  }
}

testLogisticsTrips().catch(console.error);
