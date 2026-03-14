import { chromium } from '@playwright/test';
import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const FARMER_CREDENTIALS = {
  phone: '9900000101',
  password: 'Dummy@12345'
};

const PAGES_TO_TEST = [
  { name: 'Transport', url: '/farmer/transport' },
  { name: 'Crops', url: '/farmer/crops' },
  { name: 'Settings', url: '/farmer/settings' },
  { name: 'Orders', url: '/farmer/orders' },
  { name: 'My Day', url: '/farmer/my-day' },
  { name: 'Notifications', url: '/farmer/notifications' }
];

async function testFarmerPages() {
  console.log('🚀 Starting Farmer Pages Test v2...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  const results = [];
  let consoleErrors = [];

  // Listen for console errors throughout
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Step 1: Login
    console.log('════════════════════════════');
    console.log('STEP 1: LOGIN');
    console.log('════════════════════════════\n');
    
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    console.log('→ Selecting Farmer role...');
    const farmerButton = await page.locator('button:has-text("Farmer"), button:has-text("ರೈತ")').first();
    await farmerButton.click();
    await page.waitForTimeout(500);
    
    console.log('→ Filling credentials...');
    await page.fill('input[type="tel"]', FARMER_CREDENTIALS.phone);
    await page.waitForTimeout(300);
    await page.fill('input[type="password"]', FARMER_CREDENTIALS.password);
    await page.waitForTimeout(300);
    
    console.log('→ Clicking Sign In...');
    const signInButton = await page.locator('button:has-text("Sign In"), button:has-text("ಸೈನ್ ಇನ್")').first();
    await signInButton.click();
    
    // Wait for navigation to dashboard or onboard
    try {
      await page.waitForURL(/\/(farmer|onboard)/, { timeout: 15000 });
      await page.waitForTimeout(3000);
      console.log('✓ Logged in successfully');
      console.log(`Current URL: ${page.url()}\n`);
    } catch (error) {
      console.log('❌ Login may have failed');
      console.log(`Current URL: ${page.url()}\n`);
    }

    // Test each page
    for (let i = 0; i < PAGES_TO_TEST.length; i++) {
      const testPage = PAGES_TO_TEST[i];
      console.log(`════════════════════════════`);
      console.log(`TEST ${i + 1}/${PAGES_TO_TEST.length}: ${testPage.name.toUpperCase()}`);
      console.log(`════════════════════════════`);
      
      const result = {
        name: testPage.name,
        url: testPage.url,
        actualUrl: '',
        status: 'unknown',
        screenshot: '',
        errors: [],
        consoleErrors: [],
        visibleContent: false,
        redirectedToLogin: false
      };

      // Clear console errors for this page
      consoleErrors = [];

      try {
        // Navigate to the page
        console.log(`→ Navigating to ${BASE_URL}${testPage.url}...`);
        await page.goto(`${BASE_URL}${testPage.url}`, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        
        // Wait for page to stabilize
        await page.waitForTimeout(3000);

        // Check actual URL
        result.actualUrl = page.url();
        console.log(`→ Actual URL: ${result.actualUrl}`);

        // Check if redirected to login
        if (result.actualUrl.includes('/login')) {
          result.redirectedToLogin = true;
          result.status = 'redirected_to_login';
          console.log('⚠️  Page redirected to login (auth issue)');
        }

        // Check for visible errors on the page
        const errorTexts = await page.locator('text=/error|404|not found|something went wrong/i').allTextContents();
        if (errorTexts.length > 0) {
          result.errors = errorTexts;
          if (result.status !== 'redirected_to_login') {
            result.status = 'error';
          }
        }

        // Check if page has content
        const bodyText = await page.locator('body').textContent();
        result.visibleContent = bodyText.trim().length > 100;

        // Check for blank page
        const mainContent = await page.locator('main, [role="main"], .content, .page').count();
        if (mainContent === 0 && bodyText.trim().length < 100 && result.status === 'unknown') {
          result.status = 'blank';
        } else if (result.status === 'unknown') {
          result.status = 'rendered';
        }

        // Take screenshot
        const screenshotName = `test-farmer-v2-${testPage.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        try {
          await page.screenshot({ 
            path: screenshotName,
            fullPage: false,
            timeout: 10000
          });
          result.screenshot = screenshotName;
          console.log(`📸 Screenshot saved: ${screenshotName}`);
        } catch (screenshotError) {
          console.log(`⚠️  Could not save screenshot: ${screenshotError.message}`);
        }

        // Store console errors
        result.consoleErrors = [...consoleErrors];

        // Log result
        if (result.status === 'rendered') {
          console.log(`✓ Page rendered successfully`);
        } else if (result.status === 'blank') {
          console.log(`⚠️  Page appears blank`);
        } else if (result.status === 'error') {
          console.log(`❌ Page shows errors: ${result.errors.join(', ')}`);
        } else if (result.status === 'redirected_to_login') {
          console.log(`❌ Authentication failed - redirected to login`);
        }

        if (result.consoleErrors.length > 0) {
          console.log(`⚠️  Console errors: ${result.consoleErrors.length}`);
          console.log(`   First error: ${result.consoleErrors[0].substring(0, 100)}`);
        }

      } catch (error) {
        result.status = 'failed';
        result.errors = [error.message];
        console.log(`❌ Failed to load page: ${error.message}`);
      }

      results.push(result);
      console.log('');

      // Wait between tests
      await page.waitForTimeout(1000);
    }

  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n');
  console.log('════════════════════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('════════════════════════════════════════════════════\n');

  let passCount = 0;
  let failCount = 0;
  let redirectCount = 0;

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name} (${result.url})`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Actual URL: ${result.actualUrl}`);
    console.log(`   Screenshot: ${result.screenshot || 'N/A'}`);
    
    if (result.redirectedToLogin) {
      console.log(`   ⚠️  REDIRECTED TO LOGIN - Auth/routing issue`);
      redirectCount++;
    }
    
    if (result.status === 'rendered') {
      passCount++;
    } else {
      failCount++;
    }
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.slice(0, 2).join('; ')}`);
    }
    
    if (result.consoleErrors.length > 0) {
      console.log(`   Console errors: ${result.consoleErrors.length}`);
    }
    
    console.log('');
  });

  console.log(`TOTAL: ${results.length} pages tested`);
  console.log(`✓ Rendered: ${passCount}`);
  console.log(`❌ Failed/Blank/Error: ${failCount}`);
  console.log(`⚠️  Redirected to login: ${redirectCount}`);

  // Save JSON report
  const reportData = {
    testDate: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: passCount,
      failed: failCount,
      redirectedToLogin: redirectCount
    },
    results: results
  };
  writeFileSync('test-farmer-pages-report-v2.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Full report saved to: test-farmer-pages-report-v2.json');

  return results;
}

testFarmerPages().catch(console.error);
