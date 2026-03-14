import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForNavigation(page, timeout = 30000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    console.log('Navigation wait timed out, continuing...');
  }
}

async function takeFullPageScreenshot(page, filename) {
  const screenshotPath = join(__dirname, 'agent-screenshots', filename);
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true,
    animations: 'disabled'
  });
  console.log(`✓ Screenshot saved: ${filename}`);
  return screenshotPath;
}

async function takeViewportScreenshot(page, filename) {
  const screenshotPath = join(__dirname, 'agent-screenshots', filename);
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: false,
    animations: 'disabled'
  });
  console.log(`✓ Screenshot saved: ${filename}`);
  return screenshotPath;
}

(async () => {
  console.log('Starting AgriNext Gen Agent Dashboard Comprehensive Audit...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US'
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  try {
    console.log('=== STEP 1: LOGIN ===\n');
    
    // Navigate to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await sleep(2000);
    
    // Take initial screenshot
    await takeFullPageScreenshot(page, 'audit-01-login-page.png');
    
    // Select Agent role
    console.log('2. Selecting Agent role...');
    const agentButton = page.locator('button:has-text("Agent"), [role="button"]:has-text("Agent")').first();
    await agentButton.click();
    await sleep(1000);
    
    // Fill phone number
    console.log('3. Filling phone number...');
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[name*="phone" i]').first();
    await phoneInput.click();
    await phoneInput.fill('9900000102');
    await sleep(500);
    
    // Fill password
    console.log('4. Filling password...');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill('Dummy@12345');
    await sleep(500);
    
    // Take screenshot of filled form
    await takeFullPageScreenshot(page, 'audit-02-login-filled.png');
    
    // Click Sign In
    console.log('5. Clicking Sign In button...');
    const signInButton = page.locator('button:has-text("Sign In"), button[type="submit"]').first();
    await signInButton.click();
    
    // Wait for navigation
    console.log('6. Waiting for login to complete (up to 30 seconds)...');
    const startUrl = page.url();
    let navSuccess = false;
    
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const currentUrl = page.url();
      console.log(`   [${i+1}s] Current URL: ${currentUrl}`);
      
      if (!currentUrl.includes('/login')) {
        navSuccess = true;
        console.log('✓ Login successful! Navigated away from login page.');
        break;
      }
    }
    
    if (!navSuccess) {
      console.log('⚠ Still on login page after 30 seconds. Trying alternate credentials...');
      
      // Try alternate credentials
      await phoneInput.click();
      await phoneInput.fill('');
      await phoneInput.fill('9888880102');
      await passwordInput.click();
      await passwordInput.fill('');
      await passwordInput.fill('SmokeTest@99');
      await sleep(500);
      await signInButton.click();
      
      for (let i = 0; i < 30; i++) {
        await sleep(1000);
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          navSuccess = true;
          console.log('✓ Login successful with alternate credentials!');
          break;
        }
      }
      
      if (!navSuccess) {
        console.log('✗ Login failed with both credential sets. Taking error screenshot...');
      }
    }
    
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-03-post-login.png');
    
    console.log('\n=== STEP 2: DESKTOP AGENT PAGES ===\n');
    
    // 2a. Dashboard
    console.log('2a. Dashboard...');
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-04-dashboard-desktop.png');
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1000);
    await takeViewportScreenshot(page, 'audit-05-dashboard-bottom.png');
    
    // 2b. Today
    console.log('2b. Today...');
    await page.goto('http://localhost:5173/agent/today', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-06-today-desktop.png');
    
    // 2c. Tasks
    console.log('2c. Tasks...');
    await page.goto('http://localhost:5173/agent/tasks', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-07-tasks-desktop.png');
    
    // Look for New Task button
    const newTaskButton = page.locator('button:has-text("New Task"), button:has-text("Create Task")').first();
    if (await newTaskButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   Found "New Task" button, clicking...');
      await newTaskButton.click();
      await sleep(1000);
      await takeFullPageScreenshot(page, 'audit-08-create-task-dialog.png');
      
      // Close dialog
      const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
        await sleep(500);
      }
    }
    
    // 2d. My Farmers
    console.log('2d. My Farmers...');
    await page.goto('http://localhost:5173/agent/my-farmers', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-09-my-farmers-desktop.png');
    
    // 2e. Farmers & Crops
    console.log('2e. Farmers & Crops...');
    await page.goto('http://localhost:5173/agent/farmers', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-10-farmers-crops-desktop.png');
    
    // Check for tabs
    const tabs = page.locator('[role="tab"], .tab, button[data-state]');
    const tabCount = await tabs.count();
    if (tabCount > 0) {
      console.log(`   Found ${tabCount} tabs, capturing each...`);
      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        await tabs.nth(i).click();
        await sleep(1000);
        await takeFullPageScreenshot(page, `audit-10-farmers-crops-tab-${i+1}.png`);
      }
    }
    
    // 2f. Transport
    console.log('2f. Transport...');
    await page.goto('http://localhost:5173/agent/transport', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-11-transport-desktop.png');
    
    // 2g. Service Area
    console.log('2g. Service Area...');
    await page.goto('http://localhost:5173/agent/service-area', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-12-service-area-desktop.png');
    
    // 2h. Profile
    console.log('2h. Profile...');
    await page.goto('http://localhost:5173/agent/profile', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-13-profile-desktop.png');
    
    console.log('\n=== STEP 3: HEADER & NOTIFICATIONS ===\n');
    
    // Go back to dashboard
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    
    // Click notification bell
    console.log('3a. Clicking notification bell...');
    const notificationBell = page.locator('button:has([data-icon="bell"]), button:has(.lucide-bell), [aria-label*="notification" i]').first();
    if (await notificationBell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationBell.click();
      await sleep(1000);
      await takeFullPageScreenshot(page, 'audit-14-notifications.png');
      
      // Click away to close
      await page.locator('body').click({ position: { x: 100, y: 100 } });
      await sleep(500);
    } else {
      console.log('   Notification bell not found');
    }
    
    // Click profile avatar
    console.log('3b. Clicking profile avatar...');
    const profileAvatar = page.locator('button:has([data-icon="user"]), button:has(.lucide-user), [aria-label*="profile" i], button[aria-haspopup="menu"]').last();
    if (await profileAvatar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileAvatar.click();
      await sleep(1000);
      await takeFullPageScreenshot(page, 'audit-15-profile-dropdown.png');
      
      // Click away to close
      await page.locator('body').click({ position: { x: 100, y: 100 } });
      await sleep(500);
    } else {
      console.log('   Profile avatar not found');
    }
    
    console.log('\n=== STEP 4: MOBILE VIEWS (375x812) ===\n');
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await sleep(1000);
    
    // 4a. Mobile Dashboard
    console.log('4a. Mobile Dashboard...');
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-16-mobile-dashboard.png');
    
    // 4b. Open hamburger menu
    console.log('4b. Opening mobile sidebar...');
    const hamburger = page.locator('button:has([data-icon="menu"]), button:has(.lucide-menu), [aria-label*="menu" i]').first();
    if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hamburger.click();
      await sleep(1000);
      await takeFullPageScreenshot(page, 'audit-17-mobile-sidebar.png');
      
      // Close sidebar
      const closeSidebar = page.locator('button:has([data-icon="x"]), button:has(.lucide-x)').first();
      if (await closeSidebar.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeSidebar.click();
        await sleep(500);
      }
    } else {
      console.log('   Hamburger menu not found');
    }
    
    // 4c. Mobile Tasks
    console.log('4c. Mobile Tasks...');
    await page.goto('http://localhost:5173/agent/tasks', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-18-mobile-tasks.png');
    
    // 4d. Mobile My Farmers
    console.log('4d. Mobile My Farmers...');
    await page.goto('http://localhost:5173/agent/my-farmers', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-19-mobile-farmers.png');
    
    console.log('\n=== STEP 5: TABLET VIEW (768x1024) ===\n');
    
    // Resize to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await sleep(1000);
    
    console.log('5. Tablet Dashboard...');
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    await takeFullPageScreenshot(page, 'audit-20-tablet-dashboard.png');
    
    console.log('\n✓ Audit complete! All screenshots saved to agent-screenshots/');
    
  } catch (error) {
    console.error('Error during audit:', error);
    await takeFullPageScreenshot(page, 'audit-error.png');
  } finally {
    await browser.close();
  }
})();
