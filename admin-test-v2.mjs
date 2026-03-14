import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5173';

const ADMIN_PAGES = [
  { name: 'Dashboard', url: '/admin/dashboard' },
  { name: 'System Health', url: '/admin/system-health' },
  { name: 'Disputes', url: '/admin/disputes' },
  { name: 'Users', url: '/admin/users' },
  { name: 'Farmers', url: '/admin/farmers' },
  { name: 'Agents', url: '/admin/agents' },
  { name: 'Logistics', url: '/admin/logistics' },
  { name: 'Buyers', url: '/admin/buyers' },
  { name: 'Finance', url: '/admin/finance' },
  { name: 'Reports', url: '/admin/reports' },
];

async function testAdminPages() {
  console.log('🚀 Starting Admin Page Test (v2 - Improved)...\n');
  
  let browser;
  let context;
  let page;
  
  try {
    // Create screenshots directory
    try {
      mkdirSync('admin-test-screenshots', { recursive: true });
    } catch (e) {}

    console.log('🌐 Launching browser...');
    browser = await chromium.launch({ 
      headless: true, // Use headless mode for better stability
      timeout: 60000
    });
    console.log('   ✅ Browser launched\n');
    
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    
    page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    const results = [];

    // STEP 1: Login
    console.log('📝 STEP 1: Logging in as Admin...');
    
    try {
      console.log('   - Navigating to login page...');
      await page.goto(`${BASE_URL}/login`, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      await page.waitForTimeout(2000);
      console.log('   ✅ Page loaded');
      
      // Wait for and click Admin role button
      console.log('   - Waiting for Admin button...');
      await page.waitForSelector('button:has-text("Admin")', { state: 'visible', timeout: 10000 });
      await page.click('button:has-text("Admin")');
      console.log('   ✅ Admin role selected');
      await page.waitForTimeout(1000);
      
      // Fill phone number
      console.log('   - Entering phone number...');
      const phoneInput = page.locator('input[type="tel"]').first();
      await phoneInput.waitFor({ state: 'visible', timeout: 10000 });
      await phoneInput.clear();
      await phoneInput.fill('9900000105');
      console.log('   ✅ Phone number entered');
      await page.waitForTimeout(500);
      
      // Fill password
      console.log('   - Entering password...');
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
      await passwordInput.fill('Dummy@12345');
      console.log('   ✅ Password entered');
      await page.waitForTimeout(500);
      
      // Click Sign In
      console.log('   - Clicking Sign In...');
      const signInButton = page.locator('button:has-text("Sign In")').first();
      await signInButton.click();
      console.log('   ✅ Sign In clicked');
      
      // Wait for navigation to dashboard
      console.log('   - Waiting for dashboard redirect...');
      await page.waitForURL('**/admin/dashboard', { timeout: 20000 });
      await page.waitForTimeout(3000);
      console.log('   ✅ Redirected to dashboard');
      
      // Take login success screenshot
      await page.screenshot({ 
        path: 'admin-test-screenshots/00-login-success.png',
        fullPage: true 
      });
      console.log('   ✅ Login successful!\n');
      
    } catch (error) {
      console.error(`   ❌ Login failed: ${error.message}\n`);
      await page.screenshot({ path: 'admin-test-screenshots/00-login-error.png' });
      throw error;
    }

    // STEP 2: Test each admin page
    console.log('📊 STEP 2: Testing Admin Pages...\n');
    
    for (let i = 0; i < ADMIN_PAGES.length; i++) {
      const pageInfo = ADMIN_PAGES[i];
      const fullUrl = `${BASE_URL}${pageInfo.url}`;
      const num = String(i + 1).padStart(2, '0');
      
      console.log(`   ${num}. Testing: ${pageInfo.name}`);
      console.log(`       URL: ${fullUrl}`);
      
      try {
        // Navigate to page
        await page.goto(fullUrl, { 
          waitUntil: 'networkidle',
          timeout: 60000 
        });
        await page.waitForTimeout(3000);
        
        // Check for errors and content
        const errorCount = await page.locator('[role="alert"], .error, .text-destructive').count();
        const mainContent = await page.locator('main, [role="main"]').count();
        const bodyText = await page.evaluate(() => document.body.innerText.trim());
        const isBlank = bodyText.length < 100;
        
        // Take screenshot
        const screenshotPath = `admin-test-screenshots/${num}-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        
        // Determine status
        let status = 'OK';
        let issues = [];
        
        if (errorCount > 0) {
          status = 'ERROR';
          issues.push(`${errorCount} error message(s) visible`);
        }
        
        if (isBlank) {
          status = 'BLANK';
          issues.push('Page appears blank');
        } else if (mainContent === 0) {
          status = 'WARNING';
          issues.push('No main content element found');
        }
        
        results.push({
          page: pageInfo.name,
          url: pageInfo.url,
          status,
          issues: issues.length > 0 ? issues.join(', ') : 'None',
          screenshot: screenshotPath
        });
        
        const statusIcon = status === 'OK' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
        console.log(`       Status: ${statusIcon} ${status}`);
        if (issues.length > 0) {
          console.log(`       Issues: ${issues.join(', ')}`);
        }
        console.log();
        
      } catch (error) {
        console.log(`       ❌ FAILED: ${error.message}\n`);
        results.push({
          page: pageInfo.name,
          url: pageInfo.url,
          status: 'FAILED',
          issues: error.message,
          screenshot: 'N/A'
        });
      }
    }

    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('📋 ADMIN PAGE TEST SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    console.log('| Page | URL | Status | Issues |');
    console.log('|------|-----|--------|--------|');
    
    results.forEach(result => {
      const statusIcon = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`| ${result.page} | ${result.url} | ${statusIcon} ${result.status} | ${result.issues} |`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    const okCount = results.filter(r => r.status === 'OK').length;
    const warningCount = results.filter(r => r.status === 'WARNING').length;
    const errorCount = results.filter(r => r.status === 'ERROR' || r.status === 'BLANK' || r.status === 'FAILED').length;
    const totalCount = results.length;
    
    console.log(`\n✅ Passed: ${okCount}/${totalCount}`);
    console.log(`⚠️ Warnings: ${warningCount}/${totalCount}`);
    console.log(`❌ Errors: ${errorCount}/${totalCount}\n`);
    
    // Save results to JSON
    writeFileSync('admin-test-results.json', JSON.stringify(results, null, 2));
    console.log('📄 Detailed results saved to: admin-test-results.json');
    console.log('📸 Screenshots saved to: admin-test-screenshots/\n');

    return results;

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    if (page) {
      try {
        await page.screenshot({ path: 'admin-test-screenshots/fatal-error.png' });
      } catch (e) {}
    }
    throw error;
  } finally {
    if (browser) {
      console.log('🚪 Closing browser...');
      await browser.close();
      console.log('✅ Browser closed\n');
    }
  }
}

testAdminPages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
