import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = 'screenshots/buyer-comprehensive';
const BASE_URL = 'http://localhost:5173';

// Create output directory
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (e) {}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  let stepNum = 1;

  try {
    console.log('Step 1: Navigate to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    console.log('Step 2: Take desktop screenshot of login page...');
    await page.screenshot({ 
      path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-login-initial-desktop.png`),
      fullPage: false 
    });

    console.log('Step 3: Click Buyer role button...');
    await page.click('button:has-text("Buyer")');
    await sleep(1000);
    await page.screenshot({ 
      path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-buyer-role-selected.png`),
      fullPage: false 
    });

    console.log('Step 4-5: Fill in credentials...');
    await page.fill('input[type="tel"]', '9900000104');
    await sleep(500);
    await page.fill('input[type="password"]', 'Dummy@12345');
    await sleep(500);

    console.log('Step 6: Take screenshot of filled form...');
    await page.screenshot({ 
      path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-login-form-filled.png`),
      fullPage: false 
    });

    console.log('Step 7: Click Sign In button...');
    await page.click('button[type="submit"]');
    
    console.log('Step 8: Waiting 15 seconds for login to complete...');
    await sleep(15000);

    console.log('Step 9: Take screenshot after login...');
    await page.screenshot({ 
      path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-after-login.png`),
      fullPage: false 
    });

    // Check if we're on a dashboard
    const url = page.url();
    console.log(`Current URL: ${url}`);

    if (url.includes('marketplace') || url.includes('buyer') || url.includes('dashboard')) {
      console.log('Step 10: Take full page screenshot of dashboard...');
      await sleep(2000);
      await page.screenshot({ 
        path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-dashboard-full-page.png`),
        fullPage: true 
      });

      console.log('Step 11: Navigate to browse page...');
      await page.goto(`${BASE_URL}/marketplace/browse`, { waitUntil: 'networkidle' });
      await sleep(3000);
      await page.screenshot({ 
        path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-browse-page.png`),
        fullPage: true 
      });

      console.log('Step 12: Navigate to orders page...');
      await page.goto(`${BASE_URL}/marketplace/orders`, { waitUntil: 'networkidle' });
      await sleep(3000);
      await page.screenshot({ 
        path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-orders-page.png`),
        fullPage: true 
      });

      console.log('Step 13: Navigate to profile page...');
      await page.goto(`${BASE_URL}/marketplace/profile`, { waitUntil: 'networkidle' });
      await sleep(3000);
      await page.screenshot({ 
        path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-profile-page.png`),
        fullPage: true 
      });

      console.log('✅ All screenshots captured successfully!');
    } else {
      console.log('⚠️ Not on expected dashboard. Current URL:', url);
      await page.screenshot({ 
        path: join(OUTPUT_DIR, 'error-unexpected-page.png'),
        fullPage: true 
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ 
      path: join(OUTPUT_DIR, 'error-screenshot.png'),
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
