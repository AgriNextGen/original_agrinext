import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = 'screenshots/buyer-comprehensive-v2';
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

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`CONSOLE [${msg.type()}]:`, msg.text());
  });

  // Capture network errors
  page.on('requestfailed', request => {
    console.log(`NETWORK FAILED: ${request.url()} - ${request.failure().errorText}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });

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
    // Wait for navigation or timeout after 30 seconds
    const [response] = await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(e => {
        console.log('Navigation timeout or error:', e.message);
        return null;
      }),
      page.click('button[type="submit"]')
    ]);

    console.log('Clicked sign in, waiting for response...');
    await sleep(3000);

    // Take screenshots at intervals to see what's happening
    for (let i = 0; i < 5; i++) {
      await page.screenshot({ 
        path: join(OUTPUT_DIR, `loading-${i + 1}.png`),
        fullPage: false 
      });
      console.log(`Loading screenshot ${i + 1}/5 taken. URL: ${page.url()}`);
      await sleep(3000);
    }

    console.log('Step 9: Take screenshot after waiting...');
    await page.screenshot({ 
      path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-after-login-wait.png`),
      fullPage: false 
    });

    // Check if we're on a dashboard
    const url = page.url();
    console.log(`Final URL: ${url}`);

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
      
      // Check for error messages on the page
      const errorText = await page.textContent('body').catch(() => '');
      console.log('Page text content:', errorText.slice(0, 500));
      
      await page.screenshot({ 
        path: join(OUTPUT_DIR, 'error-unexpected-page.png'),
        fullPage: true 
      });
    }

    // Save console logs
    writeFileSync(
      join(OUTPUT_DIR, 'console-logs.txt'),
      consoleLogs.join('\n')
    );

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await page.screenshot({ 
      path: join(OUTPUT_DIR, 'error-screenshot.png'),
      fullPage: true 
    });
    
    // Save console logs even on error
    writeFileSync(
      join(OUTPUT_DIR, 'console-logs.txt'),
      consoleLogs.join('\n')
    );
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
