import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotDir = join(__dirname, 'buyer-admin-test-screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBuyerAndAdminPages() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  const results = [];

  try {
    console.log('\n=== PART A: BUYER TESTING ===\n');

    // Step 1: Login as Buyer
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(3000);
    await page.screenshot({ path: join(screenshotDir, '01-login-page.png'), fullPage: true });

    // Click Buyer role
    console.log('2. Selecting Buyer role...');
    await page.click('text=Buyer');
    await wait(1000);
    await page.screenshot({ path: join(screenshotDir, '02-buyer-selected.png'), fullPage: true });

    // Enter phone
    console.log('3. Entering phone number...');
    await page.fill('input[type="tel"]', '9900000104');
    await wait(500);

    // Enter password
    console.log('4. Entering password...');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await wait(500);
    await page.screenshot({ path: join(screenshotDir, '03-buyer-credentials-filled.png'), fullPage: true });

    // Click Sign In
    console.log('5. Clicking Sign In...');
    await page.click('button:has-text("Sign In")');
    await wait(5000);
    await page.screenshot({ path: join(screenshotDir, '04-buyer-after-login.png'), fullPage: true });

    // Test Buyer Pages
    const buyerPages = [
      { url: 'http://localhost:5173/marketplace/browse', name: 'Browse' },
      { url: 'http://localhost:5173/marketplace/orders', name: 'Orders' },
      { url: 'http://localhost:5173/marketplace/profile', name: 'Profile' }
    ];

    for (let i = 0; i < buyerPages.length; i++) {
      const pageInfo = buyerPages[i];
      console.log(`\n6.${i + 1}. Testing ${pageInfo.name} page...`);
      
      try {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await wait(10000);
        
        const title = await page.title();
        const content = await page.content();
        const hasError = content.includes('error') || content.includes('Error') || content.includes('404');
        
        await page.screenshot({ 
          path: join(screenshotDir, `05-buyer-${pageInfo.name.toLowerCase()}.png`), 
          fullPage: true 
        });
        
        results.push({
          role: 'Buyer',
          page: pageInfo.name,
          url: pageInfo.url,
          renders: true,
          title: title,
          hasError: hasError,
          status: 'SUCCESS'
        });
        
        console.log(`   ✓ ${pageInfo.name} page rendered successfully`);
        console.log(`   Title: ${title}`);
        console.log(`   Has errors: ${hasError}`);
      } catch (error) {
        results.push({
          role: 'Buyer',
          page: pageInfo.name,
          url: pageInfo.url,
          renders: false,
          error: error.message,
          status: 'FAILED'
        });
        console.log(`   ✗ ${pageInfo.name} page failed: ${error.message}`);
        await page.screenshot({ 
          path: join(screenshotDir, `05-buyer-${pageInfo.name.toLowerCase()}-ERROR.png`), 
          fullPage: true 
        });
      }
    }

    console.log('\n=== PART B: ADMIN TESTING ===\n');

    // Step 4: Login as Admin
    console.log('7. Navigating to login page for Admin...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await wait(2000);

    // Click Admin role
    console.log('8. Selecting Admin role...');
    await page.click('text=Admin');
    await wait(1000);
    await page.screenshot({ path: join(screenshotDir, '06-admin-selected.png'), fullPage: true });

    // Enter phone
    console.log('9. Entering phone number...');
    await page.fill('input[type="tel"]', '9900000105');
    await wait(500);

    // Enter password
    console.log('10. Entering password...');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await wait(500);
    await page.screenshot({ path: join(screenshotDir, '07-admin-credentials-filled.png'), fullPage: true });

    // Click Sign In
    console.log('11. Clicking Sign In...');
    await page.click('button:has-text("Sign In")');
    await wait(5000);
    await page.screenshot({ path: join(screenshotDir, '08-admin-after-login.png'), fullPage: true });

    // Test Admin Pages
    const adminPages = [
      { url: 'http://localhost:5173/admin/transporters', name: 'Transporters' },
      { url: 'http://localhost:5173/admin/agents', name: 'Agents' },
      { url: 'http://localhost:5173/admin/buyers', name: 'Buyers' },
      { url: 'http://localhost:5173/admin/finance', name: 'Finance' },
      { url: 'http://localhost:5173/admin/crops', name: 'Crops' },
      { url: 'http://localhost:5173/admin/transport', name: 'Transport' },
      { url: 'http://localhost:5173/admin/orders', name: 'Orders' }
    ];

    for (let i = 0; i < adminPages.length; i++) {
      const pageInfo = adminPages[i];
      console.log(`\n12.${i + 1}. Testing ${pageInfo.name} page...`);
      
      try {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await wait(10000);
        
        const title = await page.title();
        const content = await page.content();
        const hasError = content.includes('error') || content.includes('Error') || content.includes('404');
        
        await page.screenshot({ 
          path: join(screenshotDir, `09-admin-${pageInfo.name.toLowerCase()}.png`), 
          fullPage: true 
        });
        
        results.push({
          role: 'Admin',
          page: pageInfo.name,
          url: pageInfo.url,
          renders: true,
          title: title,
          hasError: hasError,
          status: 'SUCCESS'
        });
        
        console.log(`   ✓ ${pageInfo.name} page rendered successfully`);
        console.log(`   Title: ${title}`);
        console.log(`   Has errors: ${hasError}`);
      } catch (error) {
        results.push({
          role: 'Admin',
          page: pageInfo.name,
          url: pageInfo.url,
          renders: false,
          error: error.message,
          status: 'FAILED'
        });
        console.log(`   ✗ ${pageInfo.name} page failed: ${error.message}`);
        await page.screenshot({ 
          path: join(screenshotDir, `09-admin-${pageInfo.name.toLowerCase()}-ERROR.png`), 
          fullPage: true 
        });
      }
    }

    // Generate report
    console.log('\n=== TEST SUMMARY ===\n');
    console.log('BUYER PAGES:');
    results.filter(r => r.role === 'Buyer').forEach(r => {
      console.log(`  ${r.status === 'SUCCESS' ? '✓' : '✗'} ${r.page}: ${r.status}`);
      if (r.status === 'SUCCESS') {
        console.log(`    Renders: ${r.renders}, Has Error: ${r.hasError}`);
      } else {
        console.log(`    Error: ${r.error}`);
      }
    });

    console.log('\nADMIN PAGES:');
    results.filter(r => r.role === 'Admin').forEach(r => {
      console.log(`  ${r.status === 'SUCCESS' ? '✓' : '✗'} ${r.page}: ${r.status}`);
      if (r.status === 'SUCCESS') {
        console.log(`    Renders: ${r.renders}, Has Error: ${r.hasError}`);
      } else {
        console.log(`    Error: ${r.error}`);
      }
    });

    // Write results to file
    fs.writeFileSync(
      join(screenshotDir, 'test-results.json'),
      JSON.stringify(results, null, 2)
    );

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await page.screenshot({ path: join(screenshotDir, 'error-screenshot.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

testBuyerAndAdminPages();
