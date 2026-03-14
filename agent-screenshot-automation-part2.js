import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const screenshotsDir = path.join(__dirname, 'agent-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('🚀 Starting Agent Dashboard Screenshot Automation - Part 2...\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();

  // Helper function to navigate with better timeout handling
  async function navigateAndScreenshot(url, filename, description) {
    try {
      console.log(`\n📍 ${description}`);
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      await page.waitForTimeout(2000);
      
      console.log(`📸 Taking screenshot: ${filename}`);
      await page.screenshot({ 
        path: path.join(screenshotsDir, filename),
        fullPage: true 
      });
      return true;
    } catch (error) {
      console.error(`❌ Error on ${description}:`, error.message);
      try {
        await page.screenshot({ 
          path: path.join(screenshotsDir, `error-${filename}`),
          fullPage: true 
        });
      } catch (e) {}
      return false;
    }
  }

  try {
    // Login first
    console.log('📍 Logging in as Agent...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    const agentButton = page.locator('button:has-text("Agent"), [role="button"]:has-text("Agent")').first();
    await agentButton.click();
    await page.waitForTimeout(300);

    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[name*="phone" i]').first();
    await phoneInput.fill('9900000102');
    await page.waitForTimeout(200);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(200);

    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Login")').first();
    await signInButton.click();
    
    await page.waitForURL('**/agent/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ Logged in successfully!\n');

    // Capture remaining pages
    await navigateAndScreenshot(
      'http://localhost:5173/agent/my-farmers',
      '06-agent-my-farmers.png',
      'My Farmers page'
    );

    await navigateAndScreenshot(
      'http://localhost:5173/agent/farmers',
      '07-agent-farmers-main.png',
      'Farmers & Crops page'
    );

    // Check for tabs on farmers page
    try {
      const tabs = page.locator('[role="tablist"] button, .tabs button, [role="tab"]');
      const tabCount = await tabs.count();
      
      if (tabCount > 0) {
        console.log(`\n📍 Found ${tabCount} tabs on Farmers page`);
        for (let i = 0; i < Math.min(tabCount, 4); i++) {
          try {
            const tab = tabs.nth(i);
            const tabText = await tab.textContent();
            console.log(`  Clicking tab ${i + 1}: ${tabText}`);
            await tab.click();
            await page.waitForTimeout(1500);
            
            const filename = `07b-agent-farmers-tab-${i + 1}.png`;
            console.log(`📸 Taking screenshot: ${filename}`);
            await page.screenshot({ 
              path: path.join(screenshotsDir, filename),
              fullPage: true 
            });
          } catch (e) {
            console.log(`  ⚠️ Could not capture tab ${i + 1}`);
          }
        }
      }
    } catch (e) {
      console.log('⚠️ No tabs found on Farmers page');
    }

    await navigateAndScreenshot(
      'http://localhost:5173/agent/transport',
      '08-agent-transport.png',
      'Transport page'
    );

    await navigateAndScreenshot(
      'http://localhost:5173/agent/service-area',
      '09-agent-service-area.png',
      'Service Area page'
    );

    await navigateAndScreenshot(
      'http://localhost:5173/agent/profile',
      '10-agent-profile.png',
      'Profile page'
    );

    // Mobile views
    console.log('\n📍 Switching to mobile view (375px)...');
    await page.setViewportSize({ width: 375, height: 812 });
    
    await navigateAndScreenshot(
      'http://localhost:5173/agent/dashboard',
      '11-agent-dashboard-mobile.png',
      'Mobile Dashboard'
    );

    // Try to open hamburger menu
    try {
      const hamburgerSelectors = [
        'button[aria-label*="menu" i]',
        'button[data-sidebar-toggle]',
        '[data-sidebar-trigger]',
        '.hamburger',
        'button:has(svg.lucide-menu)',
        'button:has([data-lucide="menu"])'
      ];

      let menuOpened = false;
      for (const selector of hamburgerSelectors) {
        try {
          const hamburger = page.locator(selector).first();
          if (await hamburger.isVisible({ timeout: 1000 })) {
            console.log(`📍 Opening hamburger menu (${selector})...`);
            await hamburger.click();
            await page.waitForTimeout(1000);
            
            console.log('📸 Taking screenshot: 11b-agent-mobile-menu-open.png');
            await page.screenshot({ 
              path: path.join(screenshotsDir, '11b-agent-mobile-menu-open.png'),
              fullPage: true 
            });
            menuOpened = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!menuOpened) {
        console.log('⚠️ Could not find hamburger menu button');
      }
    } catch (e) {
      console.log('⚠️ Could not open mobile menu:', e.message);
    }

    // Back to desktop for notifications
    console.log('\n📍 Switching back to desktop view...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await navigateAndScreenshot(
      'http://localhost:5173/agent/dashboard',
      '12-agent-dashboard-desktop.png',
      'Desktop Dashboard (for notifications)'
    );

    // Try to click notification bell
    try {
      const bellSelectors = [
        'button[aria-label*="notification" i]',
        'button:has([data-lucide="bell"])',
        'button:has(svg.lucide-bell)',
        '.notification-bell',
        '[data-notification-trigger]'
      ];

      let notificationOpened = false;
      for (const selector of bellSelectors) {
        try {
          const bell = page.locator(selector).first();
          if (await bell.isVisible({ timeout: 1000 })) {
            console.log(`📍 Clicking notification bell (${selector})...`);
            await bell.click();
            await page.waitForTimeout(1000);
            
            console.log('📸 Taking screenshot: 13-agent-notifications.png');
            await page.screenshot({ 
              path: path.join(screenshotsDir, '13-agent-notifications.png'),
              fullPage: false 
            });
            notificationOpened = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!notificationOpened) {
        console.log('⚠️ Could not find notification bell');
      }
    } catch (e) {
      console.log('⚠️ Could not open notifications:', e.message);
    }

    console.log('\n✅ Screenshot automation completed successfully!');
    console.log(`📁 All screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('\n❌ Error during automation:', error.message);
    
    try {
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'final-error-screenshot.png'),
        fullPage: true 
      });
    } catch (e) {}
  } finally {
    console.log('\n🔒 Closing browser...');
    await browser.close();
    console.log('✨ Done!');
  }
})();
