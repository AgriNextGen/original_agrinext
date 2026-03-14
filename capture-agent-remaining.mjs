import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Step 2: Clicking Agent role button...');
    await page.click('button:has-text("Agent")');
    await page.waitForTimeout(1000);

    console.log('Step 3: Filling phone number...');
    await page.fill('input[type="tel"], input[placeholder*="phone" i]', '9900000102');
    await page.waitForTimeout(500);

    console.log('Step 4: Filling password...');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await page.waitForTimeout(500);

    console.log('Step 5: Clicking Sign In...');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation to dashboard
    console.log('Waiting for redirect to dashboard...');
    await page.waitForURL('**/agent/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('Login complete! Starting screenshot capture...\n');

    // Page 1: Farmers & Crops
    console.log('📸 Page 1: Navigating to Farmers & Crops...');
    await page.goto('http://localhost:5173/agent/farmers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '06-agent-farmers-crops.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 06-agent-farmers-crops.png\n');

    // Page 2: Transport
    console.log('📸 Page 2: Navigating to Transport...');
    await page.goto('http://localhost:5173/agent/transport', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '08-agent-transport-actual.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 08-agent-transport-actual.png\n');

    // Page 3: Service Area
    console.log('📸 Page 3: Navigating to Service Area...');
    await page.goto('http://localhost:5173/agent/service-area', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '09-agent-service-area-actual.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 09-agent-service-area-actual.png\n');

    // Page 4: Profile
    console.log('📸 Page 4: Navigating to Profile...');
    await page.goto('http://localhost:5173/agent/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '10-agent-profile-actual.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 10-agent-profile-actual.png\n');

    // Page 5: Mobile Dashboard View
    console.log('📸 Page 5: Switching to mobile viewport...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '12-agent-mobile-dashboard.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 12-agent-mobile-dashboard.png\n');

    // Page 6: Mobile Sidebar
    console.log('📸 Page 6: Opening mobile sidebar...');
    const menuSelectors = [
      'button:has(svg.lucide-menu)',
      'button[class*="menu"]',
      'button svg.lucide-menu',
      '[data-testid="menu-button"]',
      'header button:first-child',
      'nav button:first-child'
    ];
    
    let menuClicked = false;
    for (const selector of menuSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          menuClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (menuClicked) {
      await page.waitForTimeout(1500);
      await page.screenshot({ 
        path: join(__dirname, 'agent-screenshots', '13-agent-mobile-sidebar.png'),
        fullPage: true 
      });
      console.log('✅ Saved: 13-agent-mobile-sidebar.png\n');
    } else {
      console.log('⚠️  Could not find mobile menu button, capturing page as-is...\n');
      await page.screenshot({ 
        path: join(__dirname, 'agent-screenshots', '13-agent-mobile-sidebar.png'),
        fullPage: true 
      });
    }

    // Page 7: Notifications (back to desktop)
    console.log('📸 Page 7: Switching back to desktop and opening notifications...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Try to find and click notification bell
    const bellSelectors = [
      'button:has(svg.lucide-bell)',
      'button[aria-label*="notification" i]',
      '[class*="notification"] button',
      'button svg.lucide-bell',
      'header button:has(svg.lucide-bell)'
    ];
    
    let bellClicked = false;
    for (const selector of bellSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          bellClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (bellClicked) {
      await page.waitForTimeout(1500);
      await page.screenshot({ 
        path: join(__dirname, 'agent-screenshots', '14-agent-notifications.png'),
        fullPage: false 
      });
      console.log('✅ Saved: 14-agent-notifications.png\n');
    } else {
      console.log('⚠️  Could not find notification bell button, capturing page as-is...\n');
      await page.screenshot({ 
        path: join(__dirname, 'agent-screenshots', '14-agent-notifications.png'),
        fullPage: false 
      });
    }

    console.log('🎉 All screenshots captured successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', 'error-screenshot.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

captureScreenshots();
