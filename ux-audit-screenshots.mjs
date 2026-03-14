import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const PHONE = '9888880101';
const PASSWORD = 'SmokeTest@99';

async function takeScreenshot(page, name, description) {
  console.log(`\n📸 Taking screenshot: ${name}`);
  console.log(`   Description: ${description}`);
  
  await page.waitForTimeout(2000); // Wait for page to settle
  
  const screenshotPath = join(__dirname, `ux-audit-${name}.png`);
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  
  console.log(`   ✓ Saved: ${screenshotPath}`);
  
  // Log page details
  const title = await page.title();
  const url = page.url();
  console.log(`   Page title: ${title}`);
  console.log(`   URL: ${url}`);
  
  return screenshotPath;
}

async function scrollAndScreenshot(page, name, description) {
  console.log(`\n📸 Taking scrollable screenshot: ${name}`);
  console.log(`   Description: ${description}`);
  
  await page.waitForTimeout(2000);
  
  // Take initial screenshot
  const screenshotPath = join(__dirname, `ux-audit-${name}-top.png`);
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: false 
  });
  console.log(`   ✓ Saved top view: ${screenshotPath}`);
  
  // Scroll down
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1000);
  
  const screenshotPath2 = join(__dirname, `ux-audit-${name}-middle.png`);
  await page.screenshot({ 
    path: screenshotPath2, 
    fullPage: false 
  });
  console.log(`   ✓ Saved middle view: ${screenshotPath2}`);
  
  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  
  const screenshotPath3 = join(__dirname, `ux-audit-${name}-bottom.png`);
  await page.screenshot({ 
    path: screenshotPath3, 
    fullPage: false 
  });
  console.log(`   ✓ Saved bottom view: ${screenshotPath3}`);
  
  // Also take full page
  const screenshotPathFull = join(__dirname, `ux-audit-${name}-full.png`);
  await page.screenshot({ 
    path: screenshotPathFull, 
    fullPage: true 
  });
  console.log(`   ✓ Saved full page: ${screenshotPathFull}`);
}

async function safeNavigate(page, url, description) {
  try {
    console.log(`   Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    return true;
  } catch (error) {
    console.log(`   ⚠️  Navigation timeout for ${description}, continuing anyway...`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting AgriNext UX Audit Screenshot Capture');
  console.log('================================================\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  
  try {
    // 1. Landing Page
    console.log('\n=== STEP 1: Landing Page ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await takeScreenshot(page, '01-landing-desktop', 'Landing/home page desktop view');
    
    // 2. Login Page
    console.log('\n=== STEP 2: Login Page ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await takeScreenshot(page, '02-login-page', 'Login page before authentication');
    
    // 3. Login as Farmer
    console.log('\n=== STEP 3: Login as Farmer ===');
    
    // Click Farmer role button
    console.log('   Clicking Farmer role button...');
    const farmerButton = page.locator('button:has-text("Farmer"), [role="button"]:has-text("Farmer")').first();
    await farmerButton.click();
    await page.waitForTimeout(1000);
    await takeScreenshot(page, '03-login-farmer-selected', 'Login page with Farmer role selected');
    
    // Enter phone number
    console.log('   Entering phone number...');
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[name="phone"]').first();
    await phoneInput.fill(PHONE);
    
    // Enter password
    console.log('   Entering password...');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(PASSWORD);
    
    await takeScreenshot(page, '04-login-credentials-filled', 'Login form with credentials filled');
    
    // Click Sign In
    console.log('   Clicking Sign In button...');
    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]').first();
    await signInButton.click();
    
    // Wait for navigation
    console.log('   Waiting for authentication...');
    await page.waitForTimeout(3000);
    await takeScreenshot(page, '05-post-login-landing', 'Page immediately after login');
    
    // 4. Farmer Dashboard
    console.log('\n=== STEP 4: Farmer Dashboard ===');
    await page.goto(`${BASE_URL}/farmer/dashboard`, { waitUntil: 'networkidle' });
    await scrollAndScreenshot(page, '06-farmer-dashboard', 'Farmer dashboard main view');
    
    // 5. My Day Page
    console.log('\n=== STEP 5: My Day Page ===');
    await page.goto(`${BASE_URL}/farmer/my-day`, { waitUntil: 'networkidle' });
    await scrollAndScreenshot(page, '07-farmer-my-day', 'Farmer My Day page');
    
    // 6. Crops Page
    console.log('\n=== STEP 6: Crops Page ===');
    await safeNavigate(page, `${BASE_URL}/farmer/crops`, 'Crops page');
    await scrollAndScreenshot(page, '08-farmer-crops', 'Farmer Crops page');
    
    // 7. Farmlands Page
    console.log('\n=== STEP 7: Farmlands Page ===');
    await safeNavigate(page, `${BASE_URL}/farmer/farmlands`, 'Farmlands page');
    await scrollAndScreenshot(page, '09-farmer-farmlands', 'Farmer Farmlands page');
    
    // 8. Transport Page
    console.log('\n=== STEP 8: Transport Page ===');
    await safeNavigate(page, `${BASE_URL}/farmer/transport`, 'Transport page');
    await scrollAndScreenshot(page, '10-farmer-transport', 'Farmer Transport page');
    
    // 9. Listings Page
    console.log('\n=== STEP 9: Listings Page ===');
    await safeNavigate(page, `${BASE_URL}/farmer/listings`, 'Listings page');
    await scrollAndScreenshot(page, '11-farmer-listings', 'Farmer Listings page');
    
    // 10. Orders Page
    console.log('\n=== STEP 10: Orders Page ===');
    await safeNavigate(page, `${BASE_URL}/farmer/orders`, 'Orders page');
    await scrollAndScreenshot(page, '12-farmer-orders', 'Farmer Orders page');
    
    // 11. Earnings Page
    console.log('\n=== STEP 11: Earnings Page ===');
    await safeNavigate(page, `${BASE_URL}/farmer/earnings`, 'Earnings page');
    await scrollAndScreenshot(page, '13-farmer-earnings', 'Farmer Earnings page');
    
    // 12. Notifications Page
    console.log('\n=== STEP 12: Notifications Page ===');
    await safeNavigate(page, `${BASE_URL}/farmer/notifications`, 'Notifications page');
    await scrollAndScreenshot(page, '14-farmer-notifications', 'Farmer Notifications page');
    
    // 13. Settings Page
    console.log('\n=== STEP 13: Settings Page ===');
    await safeNavigate(page, `${BASE_URL}/farmer/settings`, 'Settings page');
    await scrollAndScreenshot(page, '15-farmer-settings', 'Farmer Settings page');
    
    // 14. Mobile View
    console.log('\n=== STEP 14: Mobile View ===');
    await context.setViewportSize({ width: 375, height: 812 });
    await safeNavigate(page, `${BASE_URL}/farmer/dashboard`, 'Dashboard mobile');
    await takeScreenshot(page, '16-mobile-dashboard', 'Farmer dashboard mobile view (375x812)');
    
    // Try to open mobile menu
    console.log('   Attempting to open mobile menu...');
    const menuButton = page.locator('button[aria-label*="menu" i], button:has-text("☰"), [role="button"]:has-text("Menu")').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, '17-mobile-menu-open', 'Mobile menu opened');
    } else {
      console.log('   ⚠️  Mobile menu button not found');
    }
    
    console.log('\n✅ Screenshot capture complete!');
    console.log('================================================');
    
  } catch (error) {
    console.error('\n❌ Error during screenshot capture:');
    console.error(error);
    
    // Take error screenshot
    try {
      await page.screenshot({ 
        path: join(__dirname, 'ux-audit-error.png'), 
        fullPage: true 
      });
      console.log('   Error screenshot saved: ux-audit-error.png');
    } catch (e) {
      console.error('   Could not save error screenshot');
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
