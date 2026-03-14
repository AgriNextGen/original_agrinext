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
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Slow down actions for better stability
  });
  
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
    await page.goto('http://localhost:5173/login');
    await sleep(3000);
    
    await takeFullPageScreenshot(page, '01-login-initial.png', 'Login page - Initial state');

    console.log('\nSelecting Agent role...');
    // Multiple strategies to find and click Agent button
    let agentClicked = false;
    const agentSelectors = [
      'button:has-text("Agent")',
      '[role="button"]:has-text("Agent")',
      'div:has-text("Agent")',
      '.role-card:has-text("Agent")',
      '[data-role="agent"]'
    ];
    
    for (const selector of agentSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        agentClicked = true;
        console.log(`✅ Clicked Agent using: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!agentClicked) {
      console.log('⚠️  Could not find Agent button, continuing anyway...');
    }
    await sleep(1500);

    console.log('Filling phone number...');
    const phoneSelectors = [
      'input[type="tel"]',
      'input[placeholder*="Phone" i]',
      'input[name*="phone" i]',
      'input[id*="phone" i]'
    ];
    
    let phoneFilled = false;
    for (const selector of phoneSelectors) {
      try {
        await page.fill(selector, '9900000102', { timeout: 3000 });
        phoneFilled = true;
        console.log(`✅ Filled phone using: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!phoneFilled) {
      console.log('⚠️  Could not fill phone number');
    }
    await sleep(1000);

    console.log('Filling password...');
    try {
      await page.fill('input[type="password"]', 'Dummy@12345');
      console.log('✅ Filled password');
    } catch (e) {
      console.log('⚠️  Could not fill password');
    }
    await sleep(1500);

    await takeFullPageScreenshot(page, '02-login-filled.png', 'Login form - Filled with Agent role');

    console.log('\nClicking Sign In button...');
    const signInSelectors = [
      'button:has-text("Sign In")',
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Log In")'
    ];
    
    let signInClicked = false;
    for (const selector of signInSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        signInClicked = true;
        console.log(`✅ Clicked Sign In using: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }

    if (signInClicked) {
      console.log('Waiting for navigation after login...');
      try {
        // Wait for URL change or specific elements
        await Promise.race([
          page.waitForURL(/\/(agent|dashboard)/, { timeout: 15000 }),
          page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 }),
          sleep(15000)
        ]);
        console.log(`✅ Current URL: ${page.url()}`);
      } catch (e) {
        console.log(`⚠️  Still on: ${page.url()}`);
      }
    }
    
    await sleep(3000);
    await takeFullPageScreenshot(page, '03-after-login.png', 'Page after login attempt');

    // STEP 2: AGENT DASHBOARD
    console.log('\n📋 STEP 2: Agent Dashboard');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/dashboard...');
    try {
      await page.goto('http://localhost:5173/agent/dashboard', { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });
      console.log('✅ Page loaded');
    } catch (e) {
      console.log('⚠️  Timeout on initial load, continuing...');
    }
    
    await sleep(8000); // Wait for content to load
    
    await takeFullPageScreenshot(page, '04-dashboard-full-page.png', 'Agent Dashboard - Full page');
    await takeViewportScreenshot(page, '04-dashboard-viewport.png', 'Agent Dashboard - Above the fold');
    
    // Scroll down to capture more content
    console.log('Scrolling down for additional content...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await sleep(1500);
    await takeViewportScreenshot(page, '04-dashboard-middle.png', 'Agent Dashboard - Middle section');
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1500);
    await takeViewportScreenshot(page, '04-dashboard-bottom.png', 'Agent Dashboard - Bottom section');
    
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(1000);

    // STEP 3: TODAY PAGE
    console.log('\n📋 STEP 3: Today Page');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/today...');
    try {
      await page.goto('http://localhost:5173/agent/today', { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });
    } catch (e) {
      console.log('⚠️  Timeout, continuing...');
    }
    await sleep(6000);
    
    await takeFullPageScreenshot(page, '05-today-full-page.png', 'Today Page - Full page');
    await takeViewportScreenshot(page, '05-today-viewport.png', 'Today Page - Above the fold');

    // STEP 4: TASKS PAGE
    console.log('\n📋 STEP 4: Tasks Page');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/tasks...');
    try {
      await page.goto('http://localhost:5173/agent/tasks', { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });
    } catch (e) {
      console.log('⚠️  Timeout, continuing...');
    }
    await sleep(6000);
    
    await takeFullPageScreenshot(page, '06-tasks-full-page.png', 'Tasks Page - Full page');
    await takeViewportScreenshot(page, '06-tasks-viewport.png', 'Tasks Page - Above the fold');

    // Try to find and click New Task button
    console.log('Looking for New Task / Create Task button...');
    const createButtonSelectors = [
      'button:has-text("New Task")',
      'button:has-text("Create Task")',
      'button:has-text("Add Task")',
      '[data-testid="create-task"]'
    ];
    
    let dialogOpened = false;
    for (const selector of createButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`Found create button: ${selector}`);
          await button.click();
          await sleep(2000);
          await takeViewportScreenshot(page, '06-tasks-create-dialog.png', 'Create Task Dialog');
          dialogOpened = true;
          
          // Close dialog
          console.log('Closing dialog...');
          await page.keyboard.press('Escape');
          await sleep(1000);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (!dialogOpened) {
      console.log('No Create Task button found or not visible');
    }

    // STEP 5: MY FARMERS
    console.log('\n📋 STEP 5: My Farmers Page');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/my-farmers...');
    try {
      await page.goto('http://localhost:5173/agent/my-farmers', { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });
    } catch (e) {
      console.log('⚠️  Timeout, continuing...');
    }
    await sleep(6000);
    
    await takeFullPageScreenshot(page, '07-my-farmers-full-page.png', 'My Farmers - Full page');
    await takeViewportScreenshot(page, '07-my-farmers-viewport.png', 'My Farmers - Above the fold');

    // STEP 6: FARMERS & CROPS
    console.log('\n📋 STEP 6: Farmers & Crops Page');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/farmers...');
    try {
      await page.goto('http://localhost:5173/agent/farmers', { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });
    } catch (e) {
      console.log('⚠️  Timeout, continuing...');
    }
    await sleep(6000);
    
    await takeFullPageScreenshot(page, '08-farmers-crops-full-page.png', 'Farmers & Crops - Full page');
    await takeViewportScreenshot(page, '08-farmers-crops-viewport.png', 'Farmers & Crops - Above the fold');

    console.log('\n✅ Visual audit completed successfully!');
    console.log(`\n📁 All screenshots saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('\n❌ Error during audit:', error);
    try {
      await page.screenshot({ 
        path: join(outputDir, 'error-screenshot.png'), 
        fullPage: true 
      });
      console.log('Error screenshot saved.');
    } catch (screenshotError) {
      console.error('Could not save error screenshot');
    }
  } finally {
    console.log('\n🔒 Closing browser in 5 seconds...');
    await sleep(5000);
    await browser.close();
    console.log('=' .repeat(70));
    console.log('✅ Audit complete!\n');
  }
})();
