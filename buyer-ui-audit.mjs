import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOTS_DIR = './screenshots/buyer-ui-audit';
const BASE_URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Create screenshots directory
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  // Set longer timeout for slow pages
  page.setDefaultTimeout(60000);

  console.log('Step 1: Navigate to login page...');
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    console.log('Network idle timeout, trying with domcontentloaded...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await sleep(3000);
  
  console.log('Step 2: Taking screenshot of login page (desktop)...');
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '01-login-initial-desktop.png'),
    fullPage: true 
  });

  console.log('Step 3: Click on Buyer role button...');
  await page.click('button:has-text("Buyer")');
  await sleep(1000);

  console.log('Step 4: Type phone number...');
  await page.fill('input[type="tel"]', '9900000104');
  await sleep(500);

  console.log('Step 5: Type password...');
  await page.fill('input[type="password"]', 'Dummy@12345');
  await sleep(500);

  console.log('Step 6: Taking screenshot of filled form...');
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '02-login-filled-buyer-selected.png'),
    fullPage: true 
  });

  console.log('Step 7: Click Sign In button...');
  await page.click('button[type="submit"]:has-text("Sign In")');
  
  console.log('Step 8: Waiting 20 seconds for login to complete...');
  await sleep(20000);

  console.log('Step 9: Taking screenshot after login...');
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '03-after-login.png'),
    fullPage: true 
  });

  // Check current URL
  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);

  // Wait a bit more if still on login page
  if (currentUrl.includes('/login')) {
    console.log('Still on login page, waiting another 10 seconds...');
    await sleep(10000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '04-after-additional-wait.png'),
      fullPage: true 
    });
  }

  console.log('Step 10: Navigate to marketplace dashboard...');
  try {
    await page.goto(`${BASE_URL}/marketplace/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Dashboard navigation warning:', e.message);
  }
  await sleep(3000);
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '05-dashboard-desktop.png'),
    fullPage: true 
  });

  console.log('Step 11: Navigate to browse page...');
  try {
    await page.goto(`${BASE_URL}/marketplace/browse`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Browse navigation warning:', e.message);
  }
  await sleep(3000);
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '06-browse-desktop.png'),
    fullPage: true 
  });

  console.log('Step 12: Navigate to orders page...');
  try {
    await page.goto(`${BASE_URL}/marketplace/orders`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Orders navigation warning:', e.message);
  }
  await sleep(3000);
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '07-orders-desktop.png'),
    fullPage: true 
  });

  console.log('Step 13: Navigate to profile page...');
  try {
    await page.goto(`${BASE_URL}/marketplace/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Profile navigation warning:', e.message);
  }
  await sleep(3000);
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '08-profile-desktop.png'),
    fullPage: true 
  });

  // Mobile viewport screenshots
  console.log('\n=== MOBILE VIEWPORT SCREENSHOTS ===\n');
  await page.setViewportSize({ width: 375, height: 667 });

  console.log('Mobile: Dashboard...');
  try {
    await page.goto(`${BASE_URL}/marketplace/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Mobile dashboard warning:', e.message);
  }
  await sleep(2000);
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '09-dashboard-mobile.png'),
    fullPage: true 
  });

  console.log('Mobile: Browse...');
  try {
    await page.goto(`${BASE_URL}/marketplace/browse`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Mobile browse warning:', e.message);
  }
  await sleep(2000);
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '10-browse-mobile.png'),
    fullPage: true 
  });

  console.log('Mobile: Orders...');
  try {
    await page.goto(`${BASE_URL}/marketplace/orders`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Mobile orders warning:', e.message);
  }
  await sleep(2000);
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '11-orders-mobile.png'),
    fullPage: true 
  });

  console.log('Mobile: Profile...');
  try {
    await page.goto(`${BASE_URL}/marketplace/profile`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    console.log('Mobile profile warning:', e.message);
  }
  await sleep(2000);
  await page.screenshot({ 
    path: join(SCREENSHOTS_DIR, '12-profile-mobile.png'),
    fullPage: true 
  });

  console.log('\n✅ All screenshots captured successfully!');
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

  await browser.close();
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
