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
    slowMo: 100
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  console.log('\n🚀 Starting AgriNext Gen Agent Dashboard Visual Audit');
  console.log('=' .repeat(70));

  try {
    // STEP 1: LOGIN
    console.log('\n📋 STEP 1: Login Process');
    console.log('-'.repeat(70));
    
    console.log('Navigating to login page...');
    // Don't wait for full load, just navigate
    await page.goto('http://localhost:5173/login', { 
      waitUntil: 'commit',
      timeout: 60000 
    });
    await sleep(5000); // Give it time to render
    
    await takeFullPageScreenshot(page, '01-login-initial.png', 'Login page - Initial state');

    console.log('\nLooking for Agent role button...');
    await sleep(2000);
    
    // Try to click Agent
    try {
      // Wait for any button to be visible first
      await page.waitForSelector('button', { timeout: 10000 });
      
      const agentButton = await page.locator('text=Agent').first();
      if (await agentButton.isVisible({ timeout: 5000 })) {
        await agentButton.click();
        console.log('✅ Clicked Agent role');
      } else {
        console.log('⚠️  Agent button not visible');
      }
    } catch (e) {
      console.log('⚠️  Could not find Agent button:', e.message);
    }
    
    await sleep(2000);

    console.log('Filling form fields...');
    try {
      // Fill phone
      const phoneInput = await page.locator('input[type="tel"]').first();
      await phoneInput.fill('9900000102');
      console.log('✅ Filled phone');
      
      await sleep(1000);
      
      // Fill password
      const passwordInput = await page.locator('input[type="password"]').first();
      await passwordInput.fill('Dummy@12345');
      console.log('✅ Filled password');
    } catch (e) {
      console.log('⚠️  Form fill error:', e.message);
    }
    
    await sleep(2000);
    await takeFullPageScreenshot(page, '02-login-filled.png', 'Login form - Filled');

    console.log('\nClicking Sign In...');
    try {
      const signInButton = await page.locator('button:has-text("Sign In")').first();
      await signInButton.click();
      console.log('✅ Clicked Sign In');
    } catch (e) {
      console.log('⚠️  Sign In error:', e.message);
    }
    
    // Wait and see what happens
    await sleep(10000);
    console.log(`Current URL: ${page.url()}`);
    
    await takeFullPageScreenshot(page, '03-after-login.png', 'After login attempt');

    // STEP 2: Try to navigate to dashboard
    console.log('\n📋 STEP 2: Agent Dashboard');
    console.log('-'.repeat(70));
    
    console.log('Navigating to /agent/dashboard...');
    await page.goto('http://localhost:5173/agent/dashboard', { 
      waitUntil: 'commit',
      timeout: 60000 
    });
    await sleep(10000);
    
    await takeFullPageScreenshot(page, '04-dashboard-full.png', 'Dashboard - Full page');
    await takeViewportScreenshot(page, '04-dashboard-top.png', 'Dashboard - Top');
    
    // Scroll
    await page.evaluate(() => window.scrollTo(0, 800));
    await sleep(2000);
    await takeViewportScreenshot(page, '04-dashboard-middle.png', 'Dashboard - Middle');
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(2000);
    await takeViewportScreenshot(page, '04-dashboard-bottom.png', 'Dashboard - Bottom');

    // STEP 3: TODAY
    console.log('\n📋 STEP 3: Today Page');
    console.log('-'.repeat(70));
    
    await page.goto('http://localhost:5173/agent/today', { 
      waitUntil: 'commit',
      timeout: 60000 
    });
    await sleep(8000);
    
    await takeFullPageScreenshot(page, '05-today-full.png', 'Today - Full page');
    await takeViewportScreenshot(page, '05-today-top.png', 'Today - Top');

    // STEP 4: TASKS
    console.log('\n📋 STEP 4: Tasks Page');
    console.log('-'.repeat(70));
    
    await page.goto('http://localhost:5173/agent/tasks', { 
      waitUntil: 'commit',
      timeout: 60000 
    });
    await sleep(8000);
    
    await takeFullPageScreenshot(page, '06-tasks-full.png', 'Tasks - Full page');
    await takeViewportScreenshot(page, '06-tasks-top.png', 'Tasks - Top');

    // Try to open create dialog
    try {
      const createBtn = await page.locator('button').filter({ hasText: /new task|create task|add task/i }).first();
      if (await createBtn.isVisible({ timeout: 3000 })) {
        await createBtn.click();
        await sleep(2000);
        await takeViewportScreenshot(page, '06-tasks-dialog.png', 'Create Task Dialog');
        await page.keyboard.press('Escape');
        await sleep(1000);
      }
    } catch (e) {
      console.log('No create button found');
    }

    // STEP 5: MY FARMERS
    console.log('\n📋 STEP 5: My Farmers');
    console.log('-'.repeat(70));
    
    await page.goto('http://localhost:5173/agent/my-farmers', { 
      waitUntil: 'commit',
      timeout: 60000 
    });
    await sleep(8000);
    
    await takeFullPageScreenshot(page, '07-my-farmers-full.png', 'My Farmers - Full');
    await takeViewportScreenshot(page, '07-my-farmers-top.png', 'My Farmers - Top');

    // STEP 6: FARMERS & CROPS
    console.log('\n📋 STEP 6: Farmers & Crops');
    console.log('-'.repeat(70));
    
    await page.goto('http://localhost:5173/agent/farmers', { 
      waitUntil: 'commit',
      timeout: 60000 
    });
    await sleep(8000);
    
    await takeFullPageScreenshot(page, '08-farmers-crops-full.png', 'Farmers & Crops - Full');
    await takeViewportScreenshot(page, '08-farmers-crops-top.png', 'Farmers & Crops - Top');

    console.log('\n✅ Audit complete!');
    console.log(`📁 Screenshots: ${outputDir}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    try {
      await page.screenshot({ 
        path: join(outputDir, 'zzz-error.png'), 
        fullPage: true 
      });
    } catch {}
  } finally {
    console.log('\n🔒 Closing browser...');
    await sleep(3000);
    await browser.close();
  }
})();
