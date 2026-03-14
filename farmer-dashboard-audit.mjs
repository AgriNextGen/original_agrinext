import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotsDir = join(__dirname, 'screenshots', 'farmer-audit-ux');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log('🚀 Starting Farmer Dashboard UX Audit Screenshot Capture');
console.log('=' .repeat(60));
console.log();

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

// Helper function to take and describe screenshots
async function captureScreenshot(filename, description) {
  const filepath = join(screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 ${filename}`);
  console.log(`   ${description}`);
  console.log(`   ✓ Saved: ${filepath}`);
  console.log(`   URL: ${page.url()}`);
  console.log(`   Title: ${await page.title()}`);
  
  // Describe what's visible
  const bodyText = await page.evaluate(() => {
    const selectors = [
      'h1', 'h2', 'h3', '.text-2xl', '.text-xl', 
      '[role="heading"]', 'button', '.btn',
      '.card', '.widget', '.zone'
    ];
    const elements = [];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el.offsetParent !== null && el.textContent.trim()) {
          elements.push(el.textContent.trim().substring(0, 50));
        }
      });
    });
    return elements.slice(0, 10);
  });
  
  if (bodyText.length > 0) {
    console.log(`   Visible elements: ${bodyText.join(', ')}`);
  }
  console.log();
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

try {
  // STEP 1: Login Page
  console.log('=== STEP 1: Login Page (Desktop) ===');
  await page.goto('http://localhost:5173/login', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(3000);
  await captureScreenshot('01-login-page-desktop.png', 'Login page full view - should show agricultural icons on right panel');

  // STEP 2: Login as Farmer
  console.log('=== STEP 2: Login as Farmer ===');
  console.log('Clicking Farmer role button...');
  await page.click('button:has-text("Farmer"), button:has-text("ರೈತ")');
  await wait(1000);
  await captureScreenshot('02-login-farmer-selected.png', 'Farmer role selected');

  console.log('Entering credentials...');
  await page.fill('input[type="tel"], input[placeholder*="phone"], input[placeholder*="Phone"]', '9888880101');
  await page.fill('input[type="password"]', 'SmokeTest@99');
  await wait(500);
  await captureScreenshot('03-login-credentials-filled.png', 'Login form filled with test credentials');

  console.log('Clicking Sign In...');
  await page.click('button:has-text("Sign In"), button:has-text("ಸೈನ್ ಇನ್"), button[type="submit"]');
  await wait(5000); // Wait for auth
  await captureScreenshot('04-after-login.png', 'Page immediately after successful login');

  // STEP 3: Farmer Dashboard
  console.log('=== STEP 3: Farmer Dashboard ===');
  await page.goto('http://localhost:5173/farmer/dashboard', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('05-dashboard-top.png', 'Dashboard top section');

  console.log('Scrolling through dashboard zones...');
  await page.evaluate(() => window.scrollTo(0, 400));
  await wait(500);
  await captureScreenshot('06-dashboard-middle.png', 'Dashboard middle section - onboarding wizard and quick actions');

  await page.evaluate(() => window.scrollTo(0, 800));
  await wait(500);
  await captureScreenshot('07-dashboard-weather-market.png', 'Dashboard weather/market/agent grid section');

  await page.evaluate(() => window.scrollTo(0, 1200));
  await wait(500);
  await captureScreenshot('08-dashboard-farm-data.png', 'Dashboard farm data zone');

  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(500);
  await captureScreenshot('09-dashboard-full.png', 'Dashboard full page view');

  // STEP 4: My Day Page
  console.log('=== STEP 4: My Day Page ===');
  await page.goto('http://localhost:5173/farmer/my-day', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('10-my-day-full.png', 'My Day page - should show weather, market prices, daily tip, and pending actions');

  await page.evaluate(() => window.scrollTo(0, 400));
  await wait(500);
  await captureScreenshot('11-my-day-bottom.png', 'My Day page bottom section');

  // STEP 5: Crops Page
  console.log('=== STEP 5: Crops Page ===');
  await page.goto('http://localhost:5173/farmer/crops', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('12-crops-page.png', 'Crops page view');

  // STEP 6: Farmlands Page
  console.log('=== STEP 6: Farmlands Page ===');
  await page.goto('http://localhost:5173/farmer/farmlands', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('13-farmlands-page.png', 'Farmlands page view');

  // STEP 7: Transport Page
  console.log('=== STEP 7: Transport Page ===');
  await page.goto('http://localhost:5173/farmer/transport', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('14-transport-page.png', 'Transport requests page');

  // STEP 8: Listings Page
  console.log('=== STEP 8: Listings Page ===');
  await page.goto('http://localhost:5173/farmer/listings', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('15-listings-page.png', 'Marketplace listings page');

  // STEP 9: Orders Page
  console.log('=== STEP 9: Orders Page ===');
  await page.goto('http://localhost:5173/farmer/orders', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('16-orders-page.png', 'Orders page - should have action button in empty state');

  // STEP 10: Earnings Page
  console.log('=== STEP 10: Earnings Page ===');
  await page.goto('http://localhost:5173/farmer/earnings', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('17-earnings-page.png', 'Earnings page view');

  // STEP 11: Notifications Page
  console.log('=== STEP 11: Notifications Page ===');
  await page.goto('http://localhost:5173/farmer/notifications', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('18-notifications-page.png', 'Notifications page');

  // STEP 12: Settings Page
  console.log('=== STEP 12: Settings Page ===');
  await page.goto('http://localhost:5173/farmer/settings', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('19-settings-page.png', 'Settings page view');

  // STEP 13: Mobile View - Dashboard
  console.log('=== STEP 13: Mobile View - Dashboard ===');
  await page.setViewportSize({ width: 375, height: 812 });
  await wait(1000);
  await page.goto('http://localhost:5173/farmer/dashboard', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('20-mobile-dashboard-top.png', 'Mobile dashboard top - iPhone size (375x812)');

  await page.evaluate(() => window.scrollTo(0, 400));
  await wait(500);
  await captureScreenshot('21-mobile-dashboard-middle.png', 'Mobile dashboard middle section');

  await page.evaluate(() => window.scrollTo(0, 10000));
  await wait(500);
  await captureScreenshot('22-mobile-dashboard-bottom-tabs.png', 'Mobile dashboard bottom - should show bottom tab bar (Home, Crops, Market, Transport, More)');

  // STEP 14: Mobile View - My Day
  console.log('=== STEP 14: Mobile View - My Day ===');
  await page.goto('http://localhost:5173/farmer/my-day', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });
  await wait(2000);
  await captureScreenshot('23-mobile-my-day.png', 'Mobile My Day page');

  await page.evaluate(() => window.scrollTo(0, 10000));
  await wait(500);
  await captureScreenshot('24-mobile-my-day-bottom-tabs.png', 'Mobile My Day with bottom tabs visible');

  // STEP 15: Mobile Sidebar
  console.log('=== STEP 15: Mobile Sidebar ===');
  console.log('Looking for More tab in bottom tab bar...');
  
  // Try different selectors for the More/Menu button
  const moreButtonSelectors = [
    'button:has-text("More")',
    'button:has-text("ಇನ್ನಷ್ಟು")',
    '[data-tab="more"]',
    '.bottom-tab-bar button:last-child',
    'button[aria-label*="menu"]',
    'button[aria-label*="More"]'
  ];

  let moreButtonClicked = false;
  for (const selector of moreButtonSelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        moreButtonClicked = true;
        console.log(`Clicked More button using selector: ${selector}`);
        break;
      }
    } catch (e) {
      // Try next selector
    }
  }

  if (!moreButtonClicked) {
    console.log('More button not found, trying hamburger menu...');
    const hamburgerSelectors = [
      'button[aria-label*="menu"]',
      '.hamburger',
      '[data-sidebar-toggle]',
      'button svg[data-lucide="menu"]'
    ];
    
    for (const selector of hamburgerSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log(`Clicked hamburger menu using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
  }

  await wait(1000);
  await captureScreenshot('25-mobile-sidebar-open.png', 'Mobile sidebar/drawer opened');

  console.log();
  console.log('=' .repeat(60));
  console.log('✅ Screenshot capture complete!');
  console.log(`📁 All screenshots saved to: ${screenshotsDir}`);
  console.log('=' .repeat(60));

} catch (error) {
  console.error('❌ Error during screenshot capture:', error);
  await page.screenshot({ 
    path: join(screenshotsDir, 'error-screenshot.png'), 
    fullPage: true 
  });
  console.log('Error screenshot saved.');
} finally {
  await browser.close();
}
