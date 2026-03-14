import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeFullPageScreenshot(page, filename) {
  try {
    const screenshotPath = join(__dirname, 'agent-screenshots', filename);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true,
      animations: 'disabled'
    });
    console.log(`✓ Screenshot saved: ${filename}`);
    return screenshotPath;
  } catch (e) {
    console.log(`✗ Failed to save screenshot ${filename}: ${e.message}`);
  }
}

async function takeViewportScreenshot(page, filename) {
  try {
    const screenshotPath = join(__dirname, 'agent-screenshots', filename);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: false,
      animations: 'disabled'
    });
    console.log(`✓ Screenshot saved: ${filename}`);
    return screenshotPath;
  } catch (e) {
    console.log(`✗ Failed to save screenshot ${filename}: ${e.message}`);
  }
}

async function navigateToPage(page, url, description) {
  try {
    console.log(`${description}...`);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 15000 
    });
    await sleep(3000); // Wait for content to load
    return true;
  } catch (e) {
    console.log(`⚠ Navigation to ${url} failed or timed out: ${e.message}`);
    try {
      // Try to take a screenshot anyway
      await sleep(2000);
      return false;
    } catch {
      return false;
    }
  }
}

(async () => {
  console.log('Starting AgriNext Gen Agent Dashboard Comprehensive Audit (V2)...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US'
  });
  
  const page = await context.newPage();
  
  // Enable console logging for errors only
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });
  
  try {
    console.log('=== STEP 1: LOGIN ===\n');
    
    await navigateToPage(page, 'http://localhost:5173/login', '1. Navigating to login page');
    await takeFullPageScreenshot(page, 'audit-01-login-page.png');
    
    console.log('2. Selecting Agent role...');
    const agentButton = page.locator('button:has-text("Agent"), [role="button"]:has-text("Agent")').first();
    await agentButton.click();
    await sleep(1000);
    
    console.log('3. Filling phone number...');
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i]').first();
    await phoneInput.click();
    await phoneInput.fill('9900000102');
    await sleep(500);
    
    console.log('4. Filling password...');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill('Dummy@12345');
    await sleep(500);
    
    await takeFullPageScreenshot(page, 'audit-02-login-filled.png');
    
    console.log('5. Clicking Sign In button...');
    const signInButton = page.locator('button:has-text("Sign In"), button[type="submit"]').first();
    await signInButton.click();
    
    console.log('6. Waiting for login to complete (up to 30 seconds)...');
    let navSuccess = false;
    
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const currentUrl = page.url();
      
      if (!currentUrl.includes('/login')) {
        navSuccess = true;
        console.log(`✓ Login successful after ${i+1} seconds! Current URL: ${currentUrl}`);
        break;
      }
    }
    
    if (!navSuccess) {
      console.log('✗ Login failed or timed out');
    }
    
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-03-post-login.png');
    
    console.log('\n=== STEP 2: DESKTOP AGENT PAGES ===\n');
    
    // 2a. Dashboard
    await navigateToPage(page, 'http://localhost:5173/agent/dashboard', '2a. Dashboard');
    await takeFullPageScreenshot(page, 'audit-04-dashboard-desktop.png');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1000);
    await takeViewportScreenshot(page, 'audit-05-dashboard-bottom.png');
    
    // 2b. Today
    await navigateToPage(page, 'http://localhost:5173/agent/today', '2b. Today');
    await takeFullPageScreenshot(page, 'audit-06-today-desktop.png');
    
    // 2c. Tasks
    await navigateToPage(page, 'http://localhost:5173/agent/tasks', '2c. Tasks');
    await takeFullPageScreenshot(page, 'audit-07-tasks-desktop.png');
    
    // Look for New Task button
    try {
      const newTaskButton = page.locator('button:has-text("New Task"), button:has-text("Create Task")').first();
      if (await newTaskButton.isVisible({ timeout: 2000 })) {
        console.log('   Found "New Task" button, clicking...');
        await newTaskButton.click();
        await sleep(1000);
        await takeFullPageScreenshot(page, 'audit-08-create-task-dialog.png');
        
        const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancel"), [data-icon="x"]').first();
        if (await closeButton.isVisible({ timeout: 1000 })) {
          await closeButton.click();
          await sleep(500);
        } else {
          await page.keyboard.press('Escape');
          await sleep(500);
        }
      }
    } catch (e) {
      console.log('   New Task button not found or interaction failed');
    }
    
    // 2d. My Farmers
    await navigateToPage(page, 'http://localhost:5173/agent/my-farmers', '2d. My Farmers');
    await takeFullPageScreenshot(page, 'audit-09-my-farmers-desktop.png');
    
    // 2e. Farmers & Crops
    await navigateToPage(page, 'http://localhost:5173/agent/farmers', '2e. Farmers & Crops');
    await takeFullPageScreenshot(page, 'audit-10-farmers-crops-desktop.png');
    
    // Check for tabs
    try {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      if (tabCount > 0) {
        console.log(`   Found ${tabCount} tabs, capturing each...`);
        for (let i = 0; i < Math.min(tabCount, 3); i++) {
          await tabs.nth(i).click();
          await sleep(1500);
          await takeFullPageScreenshot(page, `audit-10-farmers-crops-tab-${i+1}.png`);
        }
      }
    } catch (e) {
      console.log('   Tab interaction skipped');
    }
    
    // 2f. Transport
    await navigateToPage(page, 'http://localhost:5173/agent/transport', '2f. Transport');
    await takeFullPageScreenshot(page, 'audit-11-transport-desktop.png');
    
    // 2g. Service Area
    await navigateToPage(page, 'http://localhost:5173/agent/service-area', '2g. Service Area');
    await takeFullPageScreenshot(page, 'audit-12-service-area-desktop.png');
    
    // 2h. Profile
    await navigateToPage(page, 'http://localhost:5173/agent/profile', '2h. Profile');
    await takeFullPageScreenshot(page, 'audit-13-profile-desktop.png');
    
    console.log('\n=== STEP 3: HEADER & NOTIFICATIONS ===\n');
    
    await navigateToPage(page, 'http://localhost:5173/agent/dashboard', 'Returning to dashboard');
    
    // Notification bell
    try {
      console.log('3a. Clicking notification bell...');
      const notificationBell = page.locator('[data-icon="bell"], .lucide-bell').first();
      const bellButton = notificationBell.locator('..').first();
      await bellButton.click();
      await sleep(1000);
      await takeFullPageScreenshot(page, 'audit-14-notifications.png');
      await page.keyboard.press('Escape');
      await sleep(500);
    } catch (e) {
      console.log('   Notification bell interaction failed');
    }
    
    // Profile dropdown
    try {
      console.log('3b. Clicking profile avatar...');
      const profileButton = page.locator('button').filter({ hasText: /settings|profile/i }).last();
      await profileButton.click();
      await sleep(1000);
      await takeFullPageScreenshot(page, 'audit-15-profile-dropdown.png');
      await page.keyboard.press('Escape');
      await sleep(500);
    } catch (e) {
      console.log('   Profile dropdown interaction failed');
    }
    
    console.log('\n=== STEP 4: MOBILE VIEWS (375x812) ===\n');
    
    await page.setViewportSize({ width: 375, height: 812 });
    await sleep(1000);
    
    await navigateToPage(page, 'http://localhost:5173/agent/dashboard', '4a. Mobile Dashboard');
    await takeFullPageScreenshot(page, 'audit-16-mobile-dashboard.png');
    
    // Hamburger menu
    try {
      console.log('4b. Opening mobile sidebar...');
      const hamburger = page.locator('[data-icon="menu"], .lucide-menu').first();
      const menuButton = hamburger.locator('..').first();
      await menuButton.click();
      await sleep(1000);
      await takeFullPageScreenshot(page, 'audit-17-mobile-sidebar.png');
      
      const closeBtn = page.locator('[data-icon="x"], .lucide-x').first();
      if (await closeBtn.isVisible({ timeout: 1000 })) {
        await closeBtn.locator('..').first().click();
        await sleep(500);
      }
    } catch (e) {
      console.log('   Mobile sidebar interaction failed');
    }
    
    await navigateToPage(page, 'http://localhost:5173/agent/tasks', '4c. Mobile Tasks');
    await takeFullPageScreenshot(page, 'audit-18-mobile-tasks.png');
    
    await navigateToPage(page, 'http://localhost:5173/agent/my-farmers', '4d. Mobile My Farmers');
    await takeFullPageScreenshot(page, 'audit-19-mobile-farmers.png');
    
    console.log('\n=== STEP 5: TABLET VIEW (768x1024) ===\n');
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await sleep(1000);
    
    await navigateToPage(page, 'http://localhost:5173/agent/dashboard', '5. Tablet Dashboard');
    await takeFullPageScreenshot(page, 'audit-20-tablet-dashboard.png');
    
    console.log('\n✓✓✓ AUDIT COMPLETE! All screenshots saved to agent-screenshots/ ✓✓✓');
    
  } catch (error) {
    console.error('\n✗✗✗ CRITICAL ERROR DURING AUDIT ✗✗✗');
    console.error(error);
    await takeFullPageScreenshot(page, 'audit-critical-error.png');
  } finally {
    await browser.close();
  }
})();
