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
  console.log('🚀 Starting Farmer Pages Test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  const results = [];

  try {
    // Check if already logged in
    console.log('→ Checking login status...');
    await page.goto(`${BASE_URL}/farmer/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/onboard')) {
      console.log('→ Not logged in. Logging in...\n');
      
      // Navigate to login
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      
      // Select Farmer role
      console.log('→ Selecting Farmer role...');
      const farmerButton = await page.locator('button:has-text("Farmer"), button:has-text("ರೈತ")').first();
      await farmerButton.click();
      await page.waitForTimeout(500);
      
      // Fill credentials
      console.log('→ Filling credentials...');
      await page.fill('input[type="tel"]', FARMER_CREDENTIALS.phone);
      await page.waitForTimeout(300);
      await page.fill('input[type="password"]', FARMER_CREDENTIALS.password);
      await page.waitForTimeout(300);
      
      // Click Sign In
      console.log('→ Clicking Sign In...');
      const signInButton = await page.locator('button:has-text("Sign In"), button:has-text("ಸೈನ್ ಇನ್")').first();
      await signInButton.click();
      
      // Wait for navigation
      await page.waitForURL(/\/(farmer|onboard)/, { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      console.log('✓ Logged in successfully\n');
    } else {
      console.log('✓ Already logged in\n');
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
        status: 'unknown',
        screenshot: '',
        errors: [],
        consoleErrors: [],
        visibleContent: false
      };

      // Listen for console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      try {
        // Navigate to the page
        console.log(`→ Navigating to ${BASE_URL}${testPage.url}...`);
        await page.goto(`${BASE_URL}${testPage.url}`, { 
          waitUntil: 'domcontentloaded', 
          timeout: 30000 
        });
        
        // Wait for page to stabilize
        await page.waitForTimeout(2000);

        // Check for visible errors on the page
        const errorTexts = await page.locator('text=/error|404|not found|something went wrong/i').allTextContents();
        if (errorTexts.length > 0) {
          result.errors = errorTexts;
          result.status = 'error';
        }

        // Check if page has content
        const bodyText = await page.locator('body').textContent();
        result.visibleContent = bodyText.trim().length > 100;

        // Check for blank page
        const mainContent = await page.locator('main, [role="main"], .content').count();
        if (mainContent === 0 && bodyText.trim().length < 100) {
          result.status = 'blank';
        } else if (result.status !== 'error') {
          result.status = 'rendered';
        }

        // Take screenshot
        const screenshotName = `test-farmer-${testPage.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        await page.screenshot({ 
          path: screenshotName,
          fullPage: true 
        });
        result.screenshot = screenshotName;
        console.log(`📸 Screenshot saved: ${screenshotName}`);

        // Store console errors
        result.consoleErrors = [...consoleErrors];

        // Log result
        if (result.status === 'rendered') {
          console.log(`✓ Page rendered successfully`);
        } else if (result.status === 'blank') {
          console.log(`⚠️  Page appears blank`);
        } else if (result.status === 'error') {
          console.log(`❌ Page shows errors: ${result.errors.join(', ')}`);
        }

        if (result.consoleErrors.length > 0) {
          console.log(`⚠️  Console errors detected: ${result.consoleErrors.length}`);
        }

      } catch (error) {
        result.status = 'failed';
        result.errors = [error.message];
        console.log(`❌ Failed to load page: ${error.message}`);
      }

      results.push(result);
      console.log('');
    }

    // Try to logout
    console.log('════════════════════════════');
    console.log('LOGGING OUT');
    console.log('════════════════════════════');
    
    try {
      // Look for logout button in sidebar or menu
      const logoutButton = await page.locator('button:has-text("Logout"), button:has-text("ಲಾಗ್ ಔಟ್"), a:has-text("Logout"), a:has-text("ಲಾಗ್ ಔಟ್")').first();
      
      if (await logoutButton.isVisible({ timeout: 2000 })) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
        console.log('✓ Logged out successfully');
      } else {
        console.log('⚠️  Logout button not found');
      }
    } catch (error) {
      console.log('⚠️  Could not logout:', error.message);
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

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name} (${result.url})`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Screenshot: ${result.screenshot || 'N/A'}`);
    console.log(`   Visible Content: ${result.visibleContent ? 'Yes' : 'No'}`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors on page: ${result.errors.slice(0, 3).join('; ')}`);
    }
    
    if (result.consoleErrors.length > 0) {
      console.log(`   Console errors: ${result.consoleErrors.length} detected`);
      console.log(`   First error: ${result.consoleErrors[0].substring(0, 100)}...`);
    }
    
    console.log('');
  });

  // Save JSON report
  const reportData = {
    testDate: new Date().toISOString(),
    results: results
  };
  writeFileSync('test-farmer-pages-report.json', JSON.stringify(reportData, null, 2));
  console.log('📄 Full report saved to: test-farmer-pages-report.json');

  return results;
}

testFarmerPages().catch(console.error);
