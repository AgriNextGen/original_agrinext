import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotDir = join(__dirname, 'buyer-test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function testBuyerPages() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = [];

  try {
    console.log('Step 1: Logging in as Buyer...');
    
    // Navigate to login page
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Click Buyer role button - try multiple selectors
    console.log('Clicking Buyer role...');
    try {
      // Try to find buyer button
      const buyerButton = page.locator('button').filter({ hasText: /buyer|ಖರೀದಿದಾರ/i });
      await buyerButton.first().click({ timeout: 5000 });
    } catch (e) {
      console.log('Could not click Buyer button, trying alternative...');
      await page.click('button:has-text("Buyer")');
    }
    await page.waitForTimeout(1500);
    
    // Clear and enter phone number
    console.log('Entering phone number...');
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.click();
    await phoneInput.fill('9900000104');
    await page.waitForTimeout(1000);
    
    // Enter password
    console.log('Entering password...');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(1000);
    
    // Click Sign In
    console.log('Clicking Sign In...');
    const signInButton = page.locator('button[type="submit"]').first();
    await signInButton.click();
    
    // Wait for redirect with longer timeout
    console.log('Waiting for redirect...');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('After login URL:', currentUrl);
    
    // Take screenshot of current state
    await page.screenshot({ path: join(screenshotDir, '00-after-login.png'), fullPage: false, timeout: 5000 });

    // Define pages to test
    const pages = [
      { name: 'Dashboard', url: 'http://localhost:5173/marketplace/dashboard', filename: '01-dashboard.png' },
      { name: 'Search/Browse', url: 'http://localhost:5173/marketplace/search', filename: '02-search.png' },
      { name: 'My Orders', url: 'http://localhost:5173/marketplace/orders', filename: '03-orders.png' },
      { name: 'Profile', url: 'http://localhost:5173/marketplace/profile', filename: '04-profile.png' },
      { name: 'Settings', url: 'http://localhost:5173/marketplace/settings', filename: '05-settings.png' }
    ];

    // Test each page
    for (const testPage of pages) {
      console.log(`\nTesting: ${testPage.name} (${testPage.url})`);
      
      try {
        await page.goto(testPage.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);
        
        // Get page content
        const bodyText = await page.textContent('body');
        const pageTitle = await page.title();
        
        // Check for various error indicators
        const hasErrorText = /error|fail|not found|404|500|something went wrong/i.test(bodyText);
        const isBlank = bodyText.trim().length < 100;
        const hasContent = bodyText.length > 500;
        
        // Take screenshot
        await page.screenshot({ path: join(screenshotDir, testPage.filename), fullPage: false, timeout: 5000 });
        
        // Determine status
        let rendersOk = '✅';
        let issues = 'None';
        
        if (hasErrorText) {
          rendersOk = '❌';
          issues = 'Error message detected on page';
        } else if (isBlank) {
          rendersOk = '❌';
          issues = 'Page appears blank/minimal content';
        } else if (!hasContent) {
          rendersOk = '⚠️';
          issues = 'Limited content detected';
        }
        
        results.push({
          page: testPage.name,
          url: testPage.url,
          rendersOk,
          issues
        });
        
        console.log(`  Status: ${rendersOk === '✅' ? 'OK' : 'ISSUES'}`);
        console.log(`  Content length: ${bodyText.length} chars`);
        if (rendersOk !== '✅') {
          console.log(`  Issue: ${issues}`);
        }
        
      } catch (error) {
        console.error(`  Failed: ${error.message}`);
        results.push({
          page: testPage.name,
          url: testPage.url,
          rendersOk: '❌',
          issues: `Navigation failed: ${error.message.substring(0, 50)}`
        });
      }
    }

    // Logout - optional
    console.log('\nAttempting logout...');
    try {
      const logoutButton = page.locator('button').filter({ hasText: /log\s*out|ಲಾಗ್\s*ಔಟ್/i });
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
        await page.waitForTimeout(2000);
        console.log('Logged out successfully');
      } else {
        console.log('No logout button found');
      }
    } catch (error) {
      console.log('Could not logout:', error.message);
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error(error.stack);
    try {
      await page.screenshot({ path: join(screenshotDir, 'error-screenshot.png'), fullPage: false, timeout: 5000 });
    } catch (e) {
      // Ignore screenshot error
    }
  } finally {
    await browser.close();
  }

  // Print summary table
  console.log('\n' + '='.repeat(100));
  console.log('BUYER/MARKETPLACE PAGE TEST SUMMARY');
  console.log('='.repeat(100));
  console.log('| Page            | URL                                          | Renders OK? | Issues                    |');
  console.log('|-----------------|----------------------------------------------|-------------|---------------------------|');
  
  for (const result of results) {
    const page = result.page.padEnd(15);
    const url = result.url.substring(result.url.lastIndexOf('/') + 1).padEnd(20);
    const status = result.rendersOk.padEnd(11);
    const issues = result.issues.substring(0, 40);
    console.log(`| ${page} | ${url} | ${status} | ${issues} |`);
  }
  
  console.log('='.repeat(100));
  console.log(`\nScreenshots saved to: ${screenshotDir}`);
  console.log('='.repeat(100));

  return results;
}

testBuyerPages().catch(console.error);
