import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputDir = join(__dirname, 'screenshots', 'agent-audit-comprehensive');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeFullPageScreenshot(page, filename, description) {
  console.log(`\n📸 ${description}`);
  try {
    await page.screenshot({ 
      path: join(outputDir, filename), 
      fullPage: true 
    });
    console.log(`✅ Saved: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to capture ${filename}:`, error.message);
  }
}

async function takeViewportScreenshot(page, filename, description) {
  console.log(`\n📸 ${description}`);
  try {
    await page.screenshot({ 
      path: join(outputDir, filename), 
      fullPage: false 
    });
    console.log(`✅ Saved: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to capture ${filename}:`, error.message);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Set a reasonable timeout
  page.setDefaultTimeout(30000);

  console.log('\n🚀 Starting AgriNext Gen Agent Dashboard Visual Audit');
  console.log('=' .repeat(70));

  try {
    // STEP 1: LOGIN
    console.log('\n📋 STEP 1: Login Process');
    console.log('-'.repeat(70));
    
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await sleep(2000);
    
    await takeFullPageScreenshot(page, '01-login-initial.png', 'Login page - Initial state');

    console.log('\nSelecting Agent role...');
    // Try multiple possible selectors for the Agent button
    try {
      await page.click('button:has-text("Agent")', { timeout: 5000 });
    } catch (e) {
      console.log('Trying alternative Agent button selector...');
      await page.click('[role="button"]:has-text("Agent")');
    }
    await sleep(1000);

    console.log('Filling phone number...');
    // Try to find phone input field
    try {
      await page.fill('input[type="tel"]', '9900000102');
    } catch (e) {
      console.log('Trying alternative phone input selector...');
      await page.fill('input[placeholder*="Phone" i], input[name*="phone" i]', '9900000102');
    }
    await sleep(500);

    console.log('Filling password...');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await sleep(1000);

    await takeFullPageScreenshot(page, '02-login-filled.png', 'Login form - Filled with Agent role');

    console.log('\nClicking Sign In button...');
    try {
      await page.click('button:has-text("Sign In")');
    } catch (e) {
      console.log('Trying alternative Sign In button selector...');
      await page.click('button[type="submit"]');
    }

    console.log('Waiting for navigation after login (up to 30 seconds)...');
    try {
      await page.waitForURL(/\/(agent|dashboard)/, { timeout: 30000 });
      console.log(`✅ Navigated to: ${page.url()}`);
    } catch (e) {
      console.log(`⚠️  Still on: ${page.url()} after 30s`);
    }
    
    await sleep(3000);
    await takeFullPageScreenshot(page, '03-after-login.png', 'Page after login attempt');

    // STEP 2: AGENT DASHBOARD
    console.log('\n📋 STEP 2: Agent Dashboard');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/dashboard...');
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle' });
    await sleep(5000); // Wait 5 seconds for content to load
    
    await takeFullPageScreenshot(page, '04-dashboard-full-page.png', 'Agent Dashboard - Full page');
    await takeViewportScreenshot(page, '04-dashboard-viewport.png', 'Agent Dashboard - Above the fold');
    
    // Scroll down to capture more content
    console.log('Scrolling down for additional content...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await sleep(1000);
    await takeViewportScreenshot(page, '04-dashboard-middle.png', 'Agent Dashboard - Middle section');
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1000);
    await takeViewportScreenshot(page, '04-dashboard-bottom.png', 'Agent Dashboard - Bottom section');

    // STEP 3: TODAY PAGE
    console.log('\n📋 STEP 3: Today Page');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/today...');
    await page.goto('http://localhost:5173/agent/today', { waitUntil: 'networkidle' });
    await sleep(5000);
    
    await takeFullPageScreenshot(page, '05-today-full-page.png', 'Today Page - Full page');
    await takeViewportScreenshot(page, '05-today-viewport.png', 'Today Page - Above the fold');

    // STEP 4: TASKS PAGE
    console.log('\n📋 STEP 4: Tasks Page');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/tasks...');
    await page.goto('http://localhost:5173/agent/tasks', { waitUntil: 'networkidle' });
    await sleep(5000);
    
    await takeFullPageScreenshot(page, '06-tasks-full-page.png', 'Tasks Page - Full page');
    await takeViewportScreenshot(page, '06-tasks-viewport.png', 'Tasks Page - Above the fold');

    // Try to find and click New Task button
    console.log('Looking for New Task / Create Task button...');
    try {
      const createButton = await page.locator('button:has-text("New Task"), button:has-text("Create Task")').first();
      if (await createButton.isVisible({ timeout: 3000 })) {
        console.log('Found Create Task button, clicking...');
        await createButton.click();
        await sleep(1500);
        await takeViewportScreenshot(page, '06-tasks-create-dialog.png', 'Create Task Dialog');
        
        // Close dialog
        console.log('Closing dialog...');
        await page.keyboard.press('Escape');
        await sleep(500);
      }
    } catch (e) {
      console.log('No Create Task button found or not visible');
    }

    // STEP 5: MY FARMERS
    console.log('\n📋 STEP 5: My Farmers Page');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/my-farmers...');
    await page.goto('http://localhost:5173/agent/my-farmers', { waitUntil: 'networkidle' });
    await sleep(5000);
    
    await takeFullPageScreenshot(page, '07-my-farmers-full-page.png', 'My Farmers - Full page');
    await takeViewportScreenshot(page, '07-my-farmers-viewport.png', 'My Farmers - Above the fold');

    // STEP 6: FARMERS & CROPS
    console.log('\n📋 STEP 6: Farmers & Crops Page');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/farmers...');
    await page.goto('http://localhost:5173/agent/farmers', { waitUntil: 'networkidle' });
    await sleep(5000);
    
    await takeFullPageScreenshot(page, '08-farmers-crops-full-page.png', 'Farmers & Crops - Full page');
    await takeViewportScreenshot(page, '08-farmers-crops-viewport.png', 'Farmers & Crops - Above the fold');

    console.log('\n✅ Visual audit completed successfully!');
    console.log(`\n📁 All screenshots saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('\n❌ Error during audit:', error);
    await page.screenshot({ 
      path: join(outputDir, 'error-screenshot.png'), 
      fullPage: true 
    });
    console.log('Error screenshot saved.');
  } finally {
    console.log('\n🔒 Closing browser...');
    await browser.close();
    console.log('=' .repeat(70));
    console.log('✅ Audit complete!\n');
  }
})();
