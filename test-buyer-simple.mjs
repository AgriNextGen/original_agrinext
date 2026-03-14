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
  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    const results = [];

    console.log('Step 1: Navigating to login page...');
    
    // Use a more lenient wait strategy
    await page.goto('http://localhost:5173/login', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
    
    console.log('Login page loaded. Taking screenshot...');
    await page.screenshot({ path: join(screenshotDir, '00-login-page.png') });
    
    // Click Buyer role button with force
    console.log('Selecting Buyer role...');
    const buyerButton = page.locator('button:has-text("Buyer")').first();
    await buyerButton.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: join(screenshotDir, '00a-role-selected.png') });
    
    // Clear and enter phone number
    console.log('Entering credentials...');
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.click();
    await phoneInput.fill('');
    await phoneInput.fill('9900000104');
    await page.waitForTimeout(500);
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: join(screenshotDir, '00b-before-signin.png') });
    
    // Click Sign In
    console.log('Signing in...');
    const signInButton = page.locator('button[type="submit"]').first();
    await signInButton.click({ timeout: 5000 });
    
    // Wait for redirect - use URL change instead of networkidle
    console.log('Waiting for authentication...');
    try {
      await page.waitForURL('**/marketplace/**', { timeout: 10000 });
      console.log('✅ Successfully redirected to marketplace');
    } catch (e) {
      console.log('⚠️ Did not redirect to marketplace, checking current URL...');
    }
    
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    await page.screenshot({ path: join(screenshotDir, '00c-after-login.png') });

    // Define pages to test
    const pagesToTest = [
      { name: 'Dashboard', url: 'http://localhost:5173/marketplace/dashboard', filename: '01-dashboard.png' },
      { name: 'Search/Browse', url: 'http://localhost:5173/marketplace/search', filename: '02-search.png' },
      { name: 'My Orders', url: 'http://localhost:5173/marketplace/orders', filename: '03-orders.png' },
      { name: 'Profile', url: 'http://localhost:5173/marketplace/profile', filename: '04-profile.png' },
      { name: 'Settings', url: 'http://localhost:5173/marketplace/settings', filename: '05-settings.png' }
    ];

    // Test each page
    for (const testPage of pagesToTest) {
      console.log(`\n--- Testing: ${testPage.name} ---`);
      console.log(`URL: ${testPage.url}`);
      
      try {
        await page.goto(testPage.url, { 
          waitUntil: 'domcontentloaded', 
          timeout: 20000 
        });
        await page.waitForTimeout(2500);
        
        // Get page content
        const bodyText = await page.textContent('body');
        const pageTitle = await page.title();
        
        console.log(`Title: ${pageTitle}`);
        console.log(`Content: ${bodyText.length} characters`);
        
        // Analyze content
        const hasErrorText = /error|fail|not found|404|500|something went wrong/i.test(bodyText);
        const isBlank = bodyText.trim().length < 150;
        const hasMinimalContent = bodyText.length < 600;
        const hasGoodContent = bodyText.length >= 600;
        
        // Take screenshot
        await page.screenshot({ path: join(screenshotDir, testPage.filename) });
        console.log(`Screenshot saved: ${testPage.filename}`);
        
        // Determine status
        let rendersOk = '✅';
        let issues = 'None';
        
        if (hasErrorText) {
          rendersOk = '❌';
          issues = 'Error message visible';
          console.log(`❌ Error detected in content`);
        } else if (isBlank) {
          rendersOk = '❌';
          issues = 'Page is blank';
          console.log(`❌ Page appears blank`);
        } else if (hasMinimalContent) {
          rendersOk = '⚠️';
          issues = 'Minimal content only';
          console.log(`⚠️ Limited content`);
        } else if (hasGoodContent) {
          rendersOk = '✅';
          issues = 'None';
          console.log(`✅ Page renders properly`);
        }
        
        results.push({
          page: testPage.name,
          url: testPage.url,
          rendersOk,
          issues
        });
        
      } catch (error) {
        console.error(`❌ Failed to load page: ${error.message}`);
        results.push({
          page: testPage.name,
          url: testPage.url,
          rendersOk: '❌',
          issues: `Navigation failed: ${error.message.substring(0, 50)}`
        });
      }
    }

    console.log('\n✅ Test completed successfully!');
    await browser.close();

    // Print summary table
    console.log('\n' + '='.repeat(110));
    console.log('BUYER/MARKETPLACE PAGE TEST SUMMARY');
    console.log('='.repeat(110));
    console.log('| Page            | URL                                               | Renders OK? | Issues                    |');
    console.log('|-----------------|---------------------------------------------------|-------------|---------------------------|');
    
    for (const result of results) {
      const page = result.page.padEnd(15);
      const url = result.url.substring(result.url.lastIndexOf('/')).padEnd(15);
      const status = result.rendersOk.padEnd(11);
      const issues = result.issues.length > 25 ? result.issues.substring(0, 22) + '...' : result.issues.padEnd(25);
      console.log(`| ${page} | ${url}${' '.repeat(35)} | ${status} | ${issues} |`);
    }
    
    console.log('='.repeat(110));
    console.log(`\nScreenshots: ${screenshotDir}`);
    console.log('='.repeat(110));

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.message);
    console.error(error.stack);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

testBuyerPages();
