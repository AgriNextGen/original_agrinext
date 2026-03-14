import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = 'screenshots/buyer-comprehensive-v3';
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

  // Capture all network requests
  const networkLogs = [];
  page.on('request', request => {
    const log = `REQUEST: ${request.method()} ${request.url()}`;
    networkLogs.push(log);
    console.log(log);
  });

  page.on('response', async response => {
    const log = `RESPONSE: ${response.status()} ${response.url()}`;
    networkLogs.push(log);
    console.log(log);
    
    // Log Edge Function responses
    if (response.url().includes('functions/v1/')) {
      try {
        const text = await response.text();
        networkLogs.push(`  Body: ${text.slice(0, 500)}`);
        console.log(`  Response Body:`, text.slice(0, 500));
      } catch (e) {
        networkLogs.push(`  Could not read body: ${e.message}`);
      }
    }
  });

  // Capture network errors
  page.on('requestfailed', request => {
    const log = `NETWORK FAILED: ${request.url()} - ${request.failure().errorText}`;
    networkLogs.push(log);
    console.log(log);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
    consoleLogs.push(`[pageerror] ${error.message}`);
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

    console.log('Step 7: Click Sign In button and monitor network...');
    console.log('='.repeat(60));
    console.log('WATCHING FOR EDGE FUNCTION CALL...');
    console.log('='.repeat(60));
    
    await page.click('button[type="submit"]');
    
    // Wait and monitor for 30 seconds
    for (let i = 0; i < 6; i++) {
      await sleep(5000);
      console.log(`⏱️  ${(i + 1) * 5} seconds elapsed... Still waiting...`);
      await page.screenshot({ 
        path: join(OUTPUT_DIR, `loading-${i + 1}.png`),
        fullPage: false 
      });
    }

    console.log('Step 9: Take screenshot after 30 seconds...');
    await page.screenshot({ 
      path: join(OUTPUT_DIR, `${String(stepNum++).padStart(2, '0')}-after-login-wait.png`),
      fullPage: false 
    });

    // Check if we're on a dashboard
    const url = page.url();
    console.log(`Final URL: ${url}`);

    if (url.includes('marketplace') || url.includes('buyer') || url.includes('dashboard')) {
      console.log('✅ Login successful! Taking dashboard screenshots...');
      
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
      console.log('⚠️  Login did not complete. Still on:', url);
      
      // Check for error messages on the page
      const bodyText = await page.textContent('body').catch(() => '');
      console.log('Page contains "error":', bodyText.toLowerCase().includes('error'));
      
      await page.screenshot({ 
        path: join(OUTPUT_DIR, 'error-still-on-login.png'),
        fullPage: true 
      });
    }

    // Save logs
    writeFileSync(
      join(OUTPUT_DIR, 'console-logs.txt'),
      consoleLogs.join('\n')
    );
    
    writeFileSync(
      join(OUTPUT_DIR, 'network-logs.txt'),
      networkLogs.join('\n')
    );

    console.log(`\n📋 Logs saved to ${OUTPUT_DIR}/`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await page.screenshot({ 
      path: join(OUTPUT_DIR, 'error-screenshot.png'),
      fullPage: true 
    });
    
    // Save logs even on error
    writeFileSync(join(OUTPUT_DIR, 'console-logs.txt'), consoleLogs.join('\n'));
    writeFileSync(join(OUTPUT_DIR, 'network-logs.txt'), networkLogs.join('\n'));
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
