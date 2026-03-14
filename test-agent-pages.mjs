import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = './agent-page-test-screenshots';

// Create screenshot directory
try {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
} catch (err) {
  // Directory already exists
}

const pages = [
  { name: 'Dashboard', url: '/agent/dashboard' },
  { name: 'Today', url: '/agent/today' },
  { name: 'Tasks', url: '/agent/tasks' },
  { name: 'My Farmers', url: '/agent/my-farmers' },
  { name: 'Farmers & Crops', url: '/agent/farmers' },
  { name: 'Transport', url: '/agent/transport' },
  { name: 'Service Area', url: '/agent/service-area' },
  { name: 'Profile', url: '/agent/profile' },
];

async function testAgentPages() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  const results = [];

  try {
    console.log('STEP 1: Login as Agent');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click Agent role button
    console.log('  - Clicking Agent role button...');
    await page.click('button:has-text("Agent")');
    await page.waitForTimeout(500);

    // Clear and enter phone number
    console.log('  - Entering phone number...');
    const phoneInput = await page.locator('input[type="tel"]');
    await phoneInput.click();
    await phoneInput.fill('');
    await phoneInput.fill('9900000102');
    await page.waitForTimeout(300);

    // Enter password
    console.log('  - Entering password...');
    const passwordInput = await page.locator('input[type="password"]');
    await passwordInput.click();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(300);

    // Click Sign In
    console.log('  - Clicking Sign In...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation to dashboard (allow time for redirect)
    console.log('  - Waiting for redirect to dashboard...');
    await page.waitForTimeout(8000); // Give plenty of time for auth + redirect
    
    // Check if we landed on dashboard
    const currentUrl = page.url();
    if (!currentUrl.includes('/agent/dashboard')) {
      throw new Error(`Login failed - current URL: ${currentUrl}`);
    }
    console.log('  ✓ Redirected to dashboard');
    
    await page.waitForTimeout(2000); // Additional time for page to render

    // Take screenshot of login success
    await page.screenshot({ path: `${SCREENSHOT_DIR}/00-login-success.png`, fullPage: true });
    console.log('✓ Login successful!');

    // Test each page
    console.log('\nSTEP 2: Testing each agent page...\n');
    
    for (let i = 0; i < pages.length; i++) {
      const pageInfo = pages[i];
      console.log(`Testing ${i + 1}/${pages.length}: ${pageInfo.name} (${pageInfo.url})`);
      
      try {
        // Navigate directly to the page
        await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);

        // Check for errors
        const errorMessages = [];
        
        // Check for visible error messages
        const errorElements = await page.locator('text=/error|failed|not found|something went wrong/i').all();
        for (const el of errorElements) {
          const text = await el.textContent();
          if (text && await el.isVisible()) {
            errorMessages.push(text.trim());
          }
        }

        // Check if page is blank (no significant content)
        const bodyText = await page.locator('body').textContent();
        const hasContent = bodyText && bodyText.trim().length > 100;

        // Take screenshot
        const screenshotPath = `${SCREENSHOT_DIR}/${String(i + 1).padStart(2, '0')}-${pageInfo.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });

        // Determine if page renders OK
        const rendersOk = hasContent && errorMessages.length === 0;

        results.push({
          page: pageInfo.name,
          url: pageInfo.url,
          rendersOk,
          issues: errorMessages.length > 0 ? errorMessages.join('; ') : (hasContent ? 'None' : 'Page appears blank/empty'),
          screenshot: screenshotPath
        });

        console.log(`  ✓ ${rendersOk ? 'OK' : 'ISSUE DETECTED'}`);
        if (!rendersOk) {
          console.log(`    Issues: ${results[results.length - 1].issues}`);
        }

      } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        results.push({
          page: pageInfo.name,
          url: pageInfo.url,
          rendersOk: false,
          issues: `Navigation/loading error: ${error.message}`,
          screenshot: 'N/A'
        });
      }
      
      await page.waitForTimeout(500);
    }

    // Logout
    console.log('\nLogging out...');
    try {
      // Try to find and click logout button
      const logoutButton = await page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout"), a:has-text("Log out")').first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForTimeout(1000);
        console.log('✓ Logged out successfully');
      } else {
        console.log('⚠ Logout button not found, navigating to login page...');
        await page.goto(`${BASE_URL}/login`);
      }
    } catch (error) {
      console.log(`⚠ Logout error: ${error.message}`);
    }

  } catch (error) {
    console.error('Test failed:', error);
    results.push({
      page: 'Login',
      url: '/login',
      rendersOk: false,
      issues: `Test failed: ${error.message}`,
      screenshot: 'N/A'
    });
  } finally {
    await browser.close();
  }

  // Generate report
  console.log('\n\n=== TEST REPORT ===\n');
  console.log('| Page | URL | Renders OK? | Issues |');
  console.log('|------|-----|-------------|--------|');
  
  for (const result of results) {
    const rendersOkText = result.rendersOk ? '✓ Yes' : '✗ No';
    console.log(`| ${result.page} | ${result.url} | ${rendersOkText} | ${result.issues} |`);
  }
  
  console.log('\n');
  
  // Save report to file
  const reportContent = `# Agent Pages Test Report\n\nDate: ${new Date().toISOString()}\n\n## Results\n\n| Page | URL | Renders OK? | Issues |\n|------|-----|-------------|--------|\n` +
    results.map(r => `| ${r.page} | ${r.url} | ${r.rendersOk ? '✓ Yes' : '✗ No'} | ${r.issues} |`).join('\n') +
    `\n\n## Screenshots\n\nScreenshots saved to: ${SCREENSHOT_DIR}\n`;
  
  writeFileSync('./AGENT_PAGES_TEST_REPORT.md', reportContent);
  console.log('Report saved to: AGENT_PAGES_TEST_REPORT.md');
  
  return results;
}

testAgentPages().catch(console.error);
