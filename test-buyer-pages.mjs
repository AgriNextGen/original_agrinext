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
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = [];

  try {
    console.log('Step 1: Logging in as Buyer...');
    
    // Navigate to login page
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Click Buyer role button
    console.log('Clicking Buyer role...');
    await page.click('button:has-text("Buyer"), button:has-text("ಖರೀದಿದಾರ")');
    await page.waitForTimeout(1000);
    
    // Clear and enter phone number
    console.log('Entering phone number...');
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone"], input[placeholder*="ಫೋನ್"]').first();
    await phoneInput.clear();
    await phoneInput.fill('9900000104');
    await page.waitForTimeout(500);
    
    // Enter password
    console.log('Entering password...');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.clear();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(500);
    
    // Click Sign In
    console.log('Clicking Sign In...');
    await page.click('button:has-text("Sign In"), button:has-text("ಸೈನ್ ಇನ್"), button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log('After login URL:', currentUrl);
    
    try {
      await page.screenshot({ path: join(screenshotDir, '00-after-login.png'), fullPage: true, timeout: 10000 });
    } catch (e) {
      console.log('Screenshot timeout, continuing...');
    }

    // Test pages
    const pages = [
      { name: 'Dashboard', url: 'http://localhost:5173/marketplace/dashboard', filename: '01-dashboard.png' },
      { name: 'Search/Browse', url: 'http://localhost:5173/marketplace/search', filename: '02-search.png' },
      { name: 'My Orders', url: 'http://localhost:5173/marketplace/orders', filename: '03-orders.png' },
      { name: 'Profile', url: 'http://localhost:5173/marketplace/profile', filename: '04-profile.png' },
      { name: 'Settings', url: 'http://localhost:5173/marketplace/settings', filename: '05-settings.png' }
    ];

    for (const testPage of pages) {
      console.log(`\nTesting: ${testPage.name} (${testPage.url})`);
      
      try {
        await page.goto(testPage.url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        // Check for errors or blank page
        const bodyText = await page.textContent('body');
        const hasError = bodyText.includes('Error') || bodyText.includes('error') || bodyText.includes('Something went wrong');
        const isBlank = bodyText.trim().length < 50;
        
        // Check for specific error elements
        const errorElements = await page.locator('[role="alert"], .error, .error-message').count();
        
        // Take screenshot
        try {
          await page.screenshot({ path: join(screenshotDir, testPage.filename), fullPage: true, timeout: 10000 });
        } catch (e) {
          console.log(`  Screenshot timeout for ${testPage.name}, continuing...`);
        }
        
        const rendersOk = !hasError && !isBlank && errorElements === 0;
        
        results.push({
          page: testPage.name,
          url: testPage.url,
          rendersOk: rendersOk ? '✅' : '❌',
          issues: rendersOk ? 'None' : (hasError ? 'Error message visible' : (isBlank ? 'Blank/empty page' : `${errorElements} error elements found`))
        });
        
        console.log(`  Status: ${rendersOk ? 'OK' : 'ISSUES FOUND'}`);
        if (!rendersOk) {
          console.log(`  Issue: ${results[results.length - 1].issues}`);
        }
        
      } catch (error) {
        console.error(`  Failed to load: ${error.message}`);
        results.push({
          page: testPage.name,
          url: testPage.url,
          rendersOk: '❌',
          issues: `Failed to load: ${error.message}`
        });
      }
    }

    // Logout
    console.log('\nLogging out...');
    try {
      // Try to find and click logout button
      const logoutSelectors = [
        'button:has-text("Log out")',
        'button:has-text("Logout")',
        'button:has-text("ಲಾಗ್ ಔಟ್")',
        '[href="/login"]'
      ];
      
      for (const selector of logoutSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          await element.click();
          await page.waitForTimeout(1000);
          console.log('Logged out successfully');
          break;
        }
      }
    } catch (error) {
      console.log('Could not find logout button, continuing...');
    }

  } catch (error) {
    console.error('Test failed:', error);
    try {
      await page.screenshot({ path: join(screenshotDir, 'error-screenshot.png'), fullPage: true, timeout: 10000 });
    } catch (e) {
      console.log('Error screenshot timeout');
    }
  } finally {
    await browser.close();
  }

  // Print summary table
  console.log('\n' + '='.repeat(80));
  console.log('BUYER PAGE TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('| Page | URL | Renders OK? | Issues |');
  console.log('|------|-----|-------------|--------|');
  
  for (const result of results) {
    const pageName = result.page.padEnd(15);
    const url = result.url.padEnd(45);
    const status = result.rendersOk.padEnd(11);
    const issues = result.issues;
    console.log(`| ${pageName} | ${url} | ${status} | ${issues} |`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Screenshots saved to: ${screenshotDir}`);
  console.log('='.repeat(80));

  return results;
}

testBuyerPages().catch(console.error);
