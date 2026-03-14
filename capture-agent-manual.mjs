import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function waitForEnter(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, () => resolve());
  });
}

async function captureScreenshotsManual() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('\n🚀 Opening browser to http://localhost:5173/login');
    console.log('📝 MANUAL LOGIN REQUIRED:');
    console.log('   1. Click "Agent" role button');
    console.log('   2. Enter phone: 9900000102');
    console.log('   3. Enter password: Dummy@12345');
    console.log('   4. Click "Sign In"');
    console.log('   5. Wait for dashboard to load\n');
    
    await page.goto('http://localhost:5173/login');
    
    await waitForEnter('Press ENTER when you have successfully logged in and reached the dashboard...');

    console.log('\n✅ Starting automated screenshot capture...\n');

    // Page 1: Farmers & Crops
    console.log('📸 Page 1: Navigating to Farmers & Crops...');
    await page.goto('http://localhost:5173/agent/farmers');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '06-agent-farmers-crops.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 06-agent-farmers-crops.png\n');

    // Page 2: Transport
    console.log('📸 Page 2: Navigating to Transport...');
    await page.goto('http://localhost:5173/agent/transport');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '08-agent-transport-actual.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 08-agent-transport-actual.png\n');

    // Page 3: Service Area
    console.log('📸 Page 3: Navigating to Service Area...');
    await page.goto('http://localhost:5173/agent/service-area');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '09-agent-service-area-actual.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 09-agent-service-area-actual.png\n');

    // Page 4: Profile
    console.log('📸 Page 4: Navigating to Profile...');
    await page.goto('http://localhost:5173/agent/profile');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '10-agent-profile-actual.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 10-agent-profile-actual.png\n');

    // Page 5: Mobile Dashboard View
    console.log('📸 Page 5: Switching to mobile viewport (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173/agent/dashboard');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', '12-agent-mobile-dashboard.png'),
      fullPage: true 
    });
    console.log('✅ Saved: 12-agent-mobile-dashboard.png\n');

    // Page 6: Mobile Sidebar
    console.log('📸 Page 6: Opening mobile sidebar...');
    console.log('Looking for menu button...');
    
    try {
      // Try different selectors to find the hamburger menu
      const selectors = [
        'button[aria-label*="menu" i]',
        'button:has(svg.lucide-menu)',
        'header button:first-child',
        '[data-testid="mobile-menu"]'
      ];
      
      let found = false;
      for (const selector of selectors) {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          found = true;
          break;
        }
      }
      
      if (found) {
        await page.waitForTimeout(1500);
        await page.screenshot({ 
          path: join(__dirname, 'agent-screenshots', '13-agent-mobile-sidebar.png'),
          fullPage: true 
        });
        console.log('✅ Saved: 13-agent-mobile-sidebar.png\n');
      } else {
        console.log('⚠️  Menu button not found, capturing current state...');
        await page.screenshot({ 
          path: join(__dirname, 'agent-screenshots', '13-agent-mobile-sidebar.png'),
          fullPage: true 
        });
      }
    } catch (err) {
      console.log('⚠️  Error clicking menu:', err.message);
      await page.screenshot({ 
        path: join(__dirname, 'agent-screenshots', '13-agent-mobile-sidebar-error.png'),
        fullPage: true 
      });
    }

    // Page 7: Notifications (back to desktop)
    console.log('📸 Page 7: Switching back to desktop (1280x800)...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173/agent/dashboard');
    await page.waitForTimeout(3000);
    
    console.log('Looking for notification bell...');
    try {
      const bellSelectors = [
        'button:has(svg.lucide-bell)',
        'button[aria-label*="notification" i]',
        'button[aria-label*="bell" i]',
        'header button:has(svg)',
        '[data-testid="notifications"]'
      ];
      
      let found = false;
      for (const selector of bellSelectors) {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          found = true;
          break;
        }
      }
      
      if (found) {
        await page.waitForTimeout(1500);
        await page.screenshot({ 
          path: join(__dirname, 'agent-screenshots', '14-agent-notifications.png')
        });
        console.log('✅ Saved: 14-agent-notifications.png\n');
      } else {
        console.log('⚠️  Notification bell not found, capturing current state...');
        await page.screenshot({ 
          path: join(__dirname, 'agent-screenshots', '14-agent-notifications.png')
        });
      }
    } catch (err) {
      console.log('⚠️  Error clicking notification bell:', err.message);
      await page.screenshot({ 
        path: join(__dirname, 'agent-screenshots', '14-agent-notifications-error.png')
      });
    }

    console.log('\n🎉 All screenshots captured successfully!');
    console.log('Browser will close in 3 seconds...\n');
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ 
      path: join(__dirname, 'agent-screenshots', 'error-screenshot.png'),
      fullPage: true 
    });
  } finally {
    rl.close();
    await browser.close();
  }
}

captureScreenshotsManual();
