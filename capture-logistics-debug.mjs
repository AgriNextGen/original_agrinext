import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // Log console messages
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  try {
    // Step 1: Navigate to login
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/logistics-complete/01-login-initial.png', fullPage: false });
    console.log('Screenshot: 01-login-initial.png');

    // Step 2: Click Logistics role
    console.log('Step 2: Clicking Logistics role...');
    const logisticsBtn = await page.locator('button:has-text("Logistics"), [role="button"]:has-text("Logistics")').first();
    await logisticsBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/logistics-complete/02-login-logistics-selected.png', fullPage: false });
    console.log('Screenshot: 02-login-logistics-selected.png');

    // Step 3: Fill phone number
    console.log('Step 3: Filling phone number...');
    const phoneInput = await page.locator('input[type="tel"], input[placeholder*="phone" i], input[name*="phone" i]').first();
    await phoneInput.click();
    await phoneInput.fill('');
    await phoneInput.type('9900000103', { delay: 100 });
    await page.waitForTimeout(1000);

    // Step 4: Fill password
    console.log('Step 4: Filling password...');
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill('');
    await passwordInput.type('Dummy@12345', { delay: 100 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/logistics-complete/03-login-filled.png', fullPage: false });
    console.log('Screenshot: 03-login-filled.png');

    // Step 5: Click Sign In and wait for navigation
    console.log('Step 5: Clicking Sign In...');
    const signInBtn = await page.locator('button:has-text("Sign In")').first();
    
    // Wait for navigation or URL change
    console.log('Waiting for navigation...');
    await Promise.race([
      signInBtn.click(),
      page.waitForURL('**/logistics/**', { timeout: 30000 }),
      page.waitForTimeout(30000)
    ]);
    
    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'screenshots/logistics-complete/04-after-login.png', fullPage: false });
    console.log('Screenshot: 04-after-login.png');

    // Check if we are on the logistics dashboard
    if (!page.url().includes('logistics')) {
      console.log('Still on login page, login may have failed');
      console.log('Current URL:', page.url());
      
      // Wait a bit more
      await page.waitForTimeout(10000);
      console.log('URL after waiting:', page.url());
      await page.screenshot({ path: 'screenshots/logistics-complete/04b-after-extra-wait.png', fullPage: false });
      
      if (!page.url().includes('logistics')) {
        throw new Error('Login failed - still on login page after 40 seconds');
      }
    }

    console.log('Login successful! Taking desktop screenshots at 1280x900...');
    
    // DESKTOP SCREENSHOTS
    const pages = [
      { name: 'dashboard', url: 'http://localhost:5173/logistics/dashboard', file: '05-dashboard-desktop.png' },
      { name: 'loads', url: 'http://localhost:5173/logistics/loads', file: '06-loads-desktop.png' },
      { name: 'trips', url: 'http://localhost:5173/logistics/trips', file: '07-trips-desktop.png' },
      { name: 'completed', url: 'http://localhost:5173/logistics/completed', file: '08-completed-desktop.png' },
      { name: 'vehicles', url: 'http://localhost:5173/logistics/vehicles', file: '09-vehicles-desktop.png' },
      { name: 'service-area', url: 'http://localhost:5173/logistics/service-area', file: '10-service-area-desktop.png' },
      { name: 'profile', url: 'http://localhost:5173/logistics/profile', file: '11-profile-desktop.png' }
    ];

    for (const pageInfo of pages) {
      console.log(`Capturing ${pageInfo.name}...`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `screenshots/logistics-complete/${pageInfo.file}`, fullPage: true });
      console.log(`Screenshot: ${pageInfo.file}`);
    }

    // MOBILE SCREENSHOTS
    console.log('Switching to mobile viewport 375x812...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);

    const mobilePages = [
      { name: 'dashboard', url: 'http://localhost:5173/logistics/dashboard', file: '12-dashboard-mobile.png' },
      { name: 'loads', url: 'http://localhost:5173/logistics/loads', file: '13-loads-mobile.png' },
      { name: 'trips', url: 'http://localhost:5173/logistics/trips', file: '14-trips-mobile.png' }
    ];

    for (const pageInfo of mobilePages) {
      console.log(`Capturing ${pageInfo.name} (mobile)...`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      await page.screenshot({ path: `screenshots/logistics-complete/${pageInfo.file}`, fullPage: true });
      console.log(`Screenshot: ${pageInfo.file}`);
    }

    console.log('All screenshots captured successfully!');

  } catch (error) {
    console.error('Error during screenshot capture:', error);
    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'screenshots/logistics-complete/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
