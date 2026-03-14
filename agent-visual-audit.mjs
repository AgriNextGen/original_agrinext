import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting Agent Dashboard Visual Audit...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 } 
  });
  
  const page = await context.newPage();

  try {
    // STEP 1: Login
    console.log('📍 STEP 1: Login Process');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'agent-audit-01-login-page.png', fullPage: true });
    console.log('   ✓ Screenshot 1: Login page captured');

    // Select Agent role
    await page.click('button:has-text("Agent")');
    await page.waitForTimeout(1000);

    // Fill phone
    await page.click('input[type="tel"]');
    await page.fill('input[type="tel"]', '9900000102');
    
    // Fill password
    await page.click('input[type="password"]');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'agent-audit-02-login-filled.png', fullPage: true });
    console.log('   ✓ Screenshot 2: Login filled with Agent role');

    // Sign in
    await page.click('button:has-text("Sign In")');
    console.log('   🔄 Clicked Sign In, waiting for navigation...');
    await page.waitForTimeout(30000);
    
    const currentUrl = page.url();
    console.log('   📌 Current URL after login:', currentUrl);
    
    await page.screenshot({ path: 'agent-audit-03-after-login.png', fullPage: true });
    console.log('   ✓ Screenshot 3: After login attempt\n');

    // STEP 2: Agent Dashboard
    console.log('📍 STEP 2: Agent Dashboard');
    if (!currentUrl.includes('/agent')) {
      console.log('   🔄 Manually navigating to dashboard...');
      await page.goto('http://localhost:5173/agent/dashboard');
      await page.waitForTimeout(15000);
    } else {
      await page.waitForTimeout(5000);
    }
    
    await page.screenshot({ path: 'agent-audit-04-dashboard-full.png', fullPage: true });
    console.log('   ✓ Screenshot 4: Dashboard full page\n');

    // STEP 3: Today Page
    console.log('📍 STEP 3: Today Page');
    await page.goto('http://localhost:5173/agent/today');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'agent-audit-05-today.png', fullPage: true });
    console.log('   ✓ Screenshot 5: Today page\n');

    // STEP 4: Tasks Page
    console.log('📍 STEP 4: Tasks Page');
    await page.goto('http://localhost:5173/agent/tasks');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'agent-audit-06-tasks.png', fullPage: true });
    console.log('   ✓ Screenshot 6: Tasks page');

    // Try to find and click new task button
    const newTaskButton = await page.$('button:has-text("New Task"), button:has-text("Create Task")');
    if (newTaskButton) {
      await newTaskButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'agent-audit-07-task-dialog.png', fullPage: true });
      console.log('   ✓ Screenshot 7: Task creation dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    } else {
      console.log('   ⚠ No "New Task" button found');
    }
    console.log('');

    // STEP 5: My Farmers
    console.log('📍 STEP 5: My Farmers Page');
    await page.goto('http://localhost:5173/agent/my-farmers');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'agent-audit-08-my-farmers.png', fullPage: true });
    console.log('   ✓ Screenshot 8: My Farmers page\n');

    // STEP 6: Farmers & Crops
    console.log('📍 STEP 6: Farmers & Crops Page');
    await page.goto('http://localhost:5173/agent/farmers');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'agent-audit-09-farmers-crops.png', fullPage: true });
    console.log('   ✓ Screenshot 9: Farmers & Crops page\n');

    console.log('✅ Agent Dashboard Visual Audit Complete!');
    console.log('📁 Screenshots saved in root directory with prefix "agent-audit-"');

  } catch (error) {
    console.error('❌ Error during audit:', error.message);
    await page.screenshot({ path: 'agent-audit-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
