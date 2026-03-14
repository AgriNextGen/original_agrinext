import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'agent-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('🚀 Starting Agent Dashboard Screenshot Automation...\n');

  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();

  try {
    // Step 1: Navigate to login page
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    console.log('📸 Taking screenshot: 01-login-page-initial.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-login-page-initial.png'),
      fullPage: true 
    });

    // Step 2: Select Agent role
    console.log('\n📍 Step 2: Selecting Agent role...');
    const agentButton = page.locator('button:has-text("Agent"), [role="button"]:has-text("Agent")').first();
    await agentButton.click();
    await page.waitForTimeout(500);

    // Step 3: Fill in credentials
    console.log('📍 Step 3: Filling in credentials...');
    
    // Find phone input
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[name*="phone" i]').first();
    await phoneInput.fill('9900000102');
    await page.waitForTimeout(300);

    // Find password input
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(300);

    console.log('📸 Taking screenshot: 02-login-page-filled.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-login-page-filled.png'),
      fullPage: true 
    });

    // Step 4: Click Sign In
    console.log('\n📍 Step 4: Clicking Sign In button...');
    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Login")').first();
    await signInButton.click();
    
    // Wait for navigation to dashboard
    console.log('⏳ Waiting for redirect to dashboard...');
    await page.waitForURL('**/agent/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 5: Agent Dashboard
    console.log('\n📍 Step 5: Agent Dashboard (/agent/dashboard)');
    console.log('📸 Taking screenshot: 03-agent-dashboard-top.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-agent-dashboard-top.png'),
      fullPage: false 
    });
    
    console.log('📸 Taking screenshot: 03-agent-dashboard-full.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '03-agent-dashboard-full.png'),
      fullPage: true 
    });

    // Step 6: Today Page
    console.log('\n📍 Step 6: Navigating to Today page...');
    await page.goto('http://localhost:5173/agent/today', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot: 04-agent-today.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '04-agent-today.png'),
      fullPage: true 
    });

    // Step 7: My Tasks
    console.log('\n📍 Step 7: Navigating to My Tasks...');
    await page.goto('http://localhost:5173/agent/tasks', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot: 05-agent-tasks.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '05-agent-tasks.png'),
      fullPage: true 
    });

    // Try to click Create Task button if visible
    const createTaskButton = page.locator('button:has-text("Create Task"), button:has-text("Add Task"), button:has-text("New Task")').first();
    if (await createTaskButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📍 Clicking Create Task button...');
      await createTaskButton.click();
      await page.waitForTimeout(1000);
      
      console.log('📸 Taking screenshot: 05b-agent-tasks-create-dialog.png');
      await page.screenshot({ 
        path: path.join(screenshotsDir, '05b-agent-tasks-create-dialog.png'),
        fullPage: true 
      });
      
      // Close dialog
      const closeButton = page.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }

    // Step 8: My Farmers
    console.log('\n📍 Step 8: Navigating to My Farmers...');
    await page.goto('http://localhost:5173/agent/my-farmers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot: 06-agent-my-farmers.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '06-agent-my-farmers.png'),
      fullPage: true 
    });

    // Step 9: Farmers & Crops
    console.log('\n📍 Step 9: Navigating to Farmers & Crops...');
    await page.goto('http://localhost:5173/agent/farmers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot: 07-agent-farmers-main.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '07-agent-farmers-main.png'),
      fullPage: true 
    });

    // Check for tabs (Unassigned/Assigned/All)
    const tabs = page.locator('[role="tablist"] button, .tabs button');
    const tabCount = await tabs.count();
    
    if (tabCount > 0) {
      console.log(`📍 Found ${tabCount} tabs, capturing each...`);
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        const tabText = await tab.textContent();
        console.log(`  Clicking tab: ${tabText}`);
        await tab.click();
        await page.waitForTimeout(1000);
        
        const filename = `07b-agent-farmers-tab-${i + 1}-${tabText.toLowerCase().replace(/\s+/g, '-')}.png`;
        console.log(`📸 Taking screenshot: ${filename}`);
        await page.screenshot({ 
          path: path.join(screenshotsDir, filename),
          fullPage: true 
        });
      }
    }

    // Step 10: Transport
    console.log('\n📍 Step 10: Navigating to Transport...');
    await page.goto('http://localhost:5173/agent/transport', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot: 08-agent-transport.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '08-agent-transport.png'),
      fullPage: true 
    });

    // Step 11: Service Area
    console.log('\n📍 Step 11: Navigating to Service Area...');
    await page.goto('http://localhost:5173/agent/service-area', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot: 09-agent-service-area.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '09-agent-service-area.png'),
      fullPage: true 
    });

    // Step 12: Profile
    console.log('\n📍 Step 12: Navigating to Profile...');
    await page.goto('http://localhost:5173/agent/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot: 10-agent-profile.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '10-agent-profile.png'),
      fullPage: true 
    });

    // Step 13: Mobile View
    console.log('\n📍 Step 13: Switching to mobile view (375px)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('📸 Taking screenshot: 11-agent-dashboard-mobile.png');
    await page.screenshot({ 
      path: path.join(screenshotsDir, '11-agent-dashboard-mobile.png'),
      fullPage: true 
    });

    // Try to open hamburger menu
    const hamburgerButton = page.locator('button[aria-label*="menu" i], button:has(svg):has-text(""), .hamburger, [data-sidebar-toggle]').first();
    if (await hamburgerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📍 Opening hamburger menu...');
      await hamburgerButton.click();
      await page.waitForTimeout(1000);
      
      console.log('📸 Taking screenshot: 11b-agent-mobile-menu-open.png');
      await page.screenshot({ 
        path: path.join(screenshotsDir, '11b-agent-mobile-menu-open.png'),
        fullPage: true 
      });
    }

    // Step 14: Notification Area (back to desktop)
    console.log('\n📍 Step 14: Switching back to desktop view...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Try to click notification bell
    const notificationBell = page.locator('button[aria-label*="notification" i], button:has([data-lucide="bell"]), .notification-bell').first();
    if (await notificationBell.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('📍 Clicking notification bell...');
      await notificationBell.click();
      await page.waitForTimeout(1000);
      
      console.log('📸 Taking screenshot: 12-agent-notifications.png');
      await page.screenshot({ 
        path: path.join(screenshotsDir, '12-agent-notifications.png'),
        fullPage: false 
      });
    }

    console.log('\n✅ Screenshot automation completed successfully!');
    console.log(`📁 All screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('\n❌ Error during automation:', error.message);
    console.error(error.stack);
    
    // Take error screenshot
    try {
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'error-screenshot.png'),
        fullPage: true 
      });
      console.log('📸 Error screenshot saved: error-screenshot.png');
    } catch (e) {
      console.error('Failed to capture error screenshot:', e.message);
    }
  } finally {
    console.log('\n🔒 Closing browser...');
    await browser.close();
    console.log('✨ Done!');
  }
})();
