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
    console.log('Step 1: Navigating to login page...');
    
    await page.goto('http://localhost:5173/login', { timeout: 20000 });
    await page.waitForTimeout(3000);
    
    console.log('Taking initial screenshot...');
    await page.screenshot({ path: join(screenshotDir, '00-login-page.png') });
    
    // Click Buyer role button with force
    console.log('Clicking Buyer role...');
    await page.locator('button:has-text("Buyer")').first().click({ force: true, timeout: 10000 });
    await page.waitForTimeout(1500);
    
    console.log('Taking screenshot after role selection...');
    await page.screenshot({ path: join(screenshotDir, '00a-role-selected.png') });
    
    // Enter phone number
    console.log('Entering phone number...');
    await page.locator('input[type="tel"]').first().fill('9900000104', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Enter password
    console.log('Entering password...');
    await page.locator('input[type="password"]').first().fill('Dummy@12345', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    console.log('Taking screenshot before sign in...');
    await page.screenshot({ path: join(screenshotDir, '00b-before-signin.png') });
    
    // Click Sign In
    console.log('Clicking Sign In...');
    await page.locator('button[type="submit"]').first().click({ timeout: 10000 });
    
    // Wait for redirect
    console.log('Waiting for redirect...');
    await page.waitForTimeout(6000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    await page.screenshot({ path: join(screenshotDir, '00c-after-login.png') });

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
      console.log(`\nTesting: ${testPage.name}`);
      console.log(`  URL: ${testPage.url}`);
      
      try {
        await page.goto(testPage.url, { timeout: 20000 });
        await page.waitForTimeout(3000);
        
        // Get page content
        const bodyText = await page.textContent('body');
        const pageTitle = await page.title();
        
        console.log(`  Title: ${pageTitle}`);
        console.log(`  Content length: ${bodyText.length} chars`);
        
        // Check for various error indicators
        const hasErrorText = /error|fail|not found|404|500|something went wrong/i.test(bodyText);
        const isBlank = bodyText.trim().length < 100;
        const hasMinimalContent = bodyText.length < 500;
        const hasGoodContent = bodyText.length > 1000;
        
        // Take screenshot
        await page.screenshot({ path: join(screenshotDir, testPage.filename) });
        
        // Determine status
        let rendersOk = '✅';
        let issues = 'None';
        
        if (hasErrorText) {
          rendersOk = '❌';
          issues = 'Error message detected';
        } else if (isBlank) {
          rendersOk = '❌';
          issues = 'Page is blank/empty';
        } else if (hasMinimalContent) {
          rendersOk = '⚠️';
          issues = 'Minimal content';
        } else if (hasGoodContent) {
          rendersOk = '✅';
          issues = 'None';
        }
        
        results.push({
          page: testPage.name,
          url: testPage.url,
          rendersOk,
          issues
        });
        
        console.log(`  Status: ${rendersOk}`);
        if (issues !== 'None') {
          console.log(`  Issues: ${issues}`);
        }
        
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}`);
        results.push({
          page: testPage.name,
          url: testPage.url,
          rendersOk: '❌',
          issues: `Failed to load: ${error.message.substring(0, 60)}`
        });
      }
    }

    console.log('\nTest completed!');

  } catch (error) {
    console.error('\n❌ Test execution failed:');
    console.error(error.message);
    try {
      await page.screenshot({ path: join(screenshotDir, 'error-screenshot.png') });
      console.log('Error screenshot saved');
    } catch (e) {
      console.error('Could not save error screenshot');
    }
  } finally {
    await browser.close();
    console.log('Browser closed');
  }

  // Print summary table
  console.log('\n' + '='.repeat(110));
  console.log('BUYER/MARKETPLACE PAGE TEST SUMMARY');
  console.log('='.repeat(110));
  console.log('| Page            | URL                                               | Renders OK? | Issues                    |');
  console.log('|-----------------|---------------------------------------------------|-------------|---------------------------|');
  
  for (const result of results) {
    const page = result.page.padEnd(15);
    const url = result.url.padEnd(50);
    const status = result.rendersOk.padEnd(11);
    const issues = result.issues.length > 25 ? result.issues.substring(0, 22) + '...' : result.issues.padEnd(25);
    console.log(`| ${page} | ${url} | ${status} | ${issues} |`);
  }
  
  console.log('='.repeat(110));
  console.log(`\nScreenshots saved to: ${screenshotDir}`);
  console.log('='.repeat(110));

  return results;
}

testBuyerPages().catch(console.error);
