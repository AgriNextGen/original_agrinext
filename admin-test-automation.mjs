import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

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
  console.log('🚀 Starting Admin Page Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000); // Increase timeout to 60 seconds
  const results = [];

  try {
    // STEP 1: Login
    console.log('📝 STEP 1: Logging in as Admin...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Click Admin role button
    console.log('   - Clicking Admin role button...');
    await page.waitForSelector('button:has-text("Admin")', { timeout: 10000 });
    await page.click('button:has-text("Admin")');
    await page.waitForTimeout(1000);
    
    // Clear and enter phone number
    console.log('   - Entering phone number: 9900000105');
    const phoneInput = await page.locator('input[type="tel"]');
    await phoneInput.clear();
    await phoneInput.fill('9900000105');
    await page.waitForTimeout(300);
    
    // Enter password
    console.log('   - Entering password...');
    const passwordInput = await page.locator('input[type="password"]');
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(300);
    
    // Click Sign In
    console.log('   - Clicking Sign In button...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to dashboard
    console.log('   - Waiting for redirect to dashboard...');
    await page.waitForURL('**/admin/dashboard', { timeout: 20000 });
    await page.waitForTimeout(3000);
    
    // Take login success screenshot
    await page.screenshot({ 
      path: 'admin-test-screenshots/00-login-success.png',
      fullPage: true 
    });
    console.log('   ✅ Login successful!\n');

    // STEP 2: Test each admin page
    console.log('📊 STEP 2: Testing Admin Pages...\n');
    
    for (let i = 0; i < ADMIN_PAGES.length; i++) {
      const pageInfo = ADMIN_PAGES[i];
      const fullUrl = `${BASE_URL}${pageInfo.url}`;
      
      console.log(`   ${i + 1}. Testing: ${pageInfo.name}`);
      console.log(`      URL: ${fullUrl}`);
      
      try {
        // Navigate to page
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);
        
        // Check for errors
        const errorElements = await page.locator('[role="alert"], .error, .text-destructive').count();
        const hasContent = await page.locator('main, [role="main"], .content').count() > 0;
        const isBlank = await page.evaluate(() => {
          const body = document.body.innerText.trim();
          return body.length < 50;
        });
        
        // Capture screenshot
        const screenshotPath = `admin-test-screenshots/${String(i + 1).padStart(2, '0')}-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        
        // Determine status
        let status = 'OK';
        let issues = [];
        
        if (errorElements > 0) {
          status = 'ERROR';
          issues.push('Error messages visible');
        }
        
        if (isBlank) {
          status = 'BLANK';
          issues.push('Page appears blank');
        }
        
        if (!hasContent && !isBlank) {
          status = 'NO_CONTENT';
          issues.push('No main content detected');
        }
        
        results.push({
          page: pageInfo.name,
          url: pageInfo.url,
          status,
          issues: issues.length > 0 ? issues.join(', ') : 'None',
          screenshot: screenshotPath
        });
        
        console.log(`      Status: ${status === 'OK' ? '✅' : '⚠️'} ${status}`);
        if (issues.length > 0) {
          console.log(`      Issues: ${issues.join(', ')}`);
        }
        console.log();
        
      } catch (error) {
        console.log(`      ❌ FAILED: ${error.message}\n`);
        results.push({
          page: pageInfo.name,
          url: pageInfo.url,
          status: 'FAILED',
          issues: error.message,
          screenshot: 'N/A'
        });
      }
    }

    // Logout
    console.log('🚪 Logging out...');
    try {
      // Try to find and click logout button
      const logoutButton = await page.locator('button:has-text("Logout"), button:has-text("Log Out"), button:has-text("Sign Out")').first();
      if (await logoutButton.count() > 0) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
        console.log('   ✅ Logged out successfully\n');
      } else {
        console.log('   ⚠️ Logout button not found\n');
      }
    } catch (error) {
      console.log(`   ⚠️ Logout failed: ${error.message}\n`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'admin-test-screenshots/error.png' });
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('📋 ADMIN PAGE TEST SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  console.log('| Page | URL | Status | Issues |');
  console.log('|------|-----|--------|--------|');
  
  results.forEach(result => {
    const statusIcon = result.status === 'OK' ? '✅' : '⚠️';
    console.log(`| ${result.page} | ${result.url} | ${statusIcon} ${result.status} | ${result.issues} |`);
  });
  
  console.log('\n' + '='.repeat(80));
  
  const okCount = results.filter(r => r.status === 'OK').length;
  const totalCount = results.length;
  console.log(`\n✅ Passed: ${okCount}/${totalCount}`);
  console.log(`⚠️ Issues: ${totalCount - okCount}/${totalCount}\n`);
  
  // Save results to JSON
  writeFileSync('admin-test-results.json', JSON.stringify(results, null, 2));
  console.log('📄 Detailed results saved to: admin-test-results.json');
  console.log('📸 Screenshots saved to: admin-test-screenshots/\n');

  return results;
}

testAdminPages().catch(console.error);
