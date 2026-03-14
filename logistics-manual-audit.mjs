import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = './screenshots/logistics-audit-manual';
const PHONE = '9900000103';
const PASSWORD = 'Dummy@12345';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureLogisticsAudit() {
  console.log('🚀 Starting Logistics Dashboard UI/UX Audit...\n');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Browser console error: ${msg.text()}`);
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log(`❌ Page error: ${error.message}`);
    });
    
    // Step 1: Navigate to login
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-initial.png'), fullPage: true });
    console.log('✅ Screenshot: 01-login-initial.png');

    // Step 2: Select Logistics role
    console.log('\n📍 Step 2: Selecting Logistics role...');
    // Find the logistics button by text content
    await page.click('button:has-text("Logistics")');
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-login-logistics-selected.png'), fullPage: true });
    console.log('✅ Screenshot: 02-login-logistics-selected.png');

    // Step 3: Enter credentials
    console.log('\n📍 Step 3: Entering credentials...');
    await page.fill('#phone', PHONE);
    await page.fill('#password', PASSWORD);
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-login-filled.png'), fullPage: true });
    console.log('✅ Screenshot: 03-login-filled.png');

    // Step 4: Click login and wait
    console.log('\n📍 Step 4: Clicking login button...');
    
    // Get any visible error messages before clicking
    const preClickError = await page.evaluate(() => {
      const errorEl = document.querySelector('[role="alert"], .text-destructive, .error-message');
      return errorEl ? errorEl.textContent : null;
    });
    if (preClickError) {
      console.log('⚠️ Error visible before login:', preClickError);
    }
    
    // Click the submit button
    await page.click('button[type="submit"]');
    console.log('⏳ Waiting for login response...');
    
    // Wait and check for either navigation or error
    await sleep(15000);
    
    // Check for error messages
    const postClickError = await page.evaluate(() => {
      const errorEl = document.querySelector('[role="alert"], .text-destructive, .error-message');
      return errorEl ? errorEl.textContent : null;
    });
    
    if (postClickError) {
      console.log('❌ Login error:', postClickError);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-after-login.png'), fullPage: true });
    console.log('✅ Screenshot: 04-after-login.png');
    console.log(`📍 Current URL: ${page.url()}`);
    
    // If still on login page, try navigating directly to dashboard
    if (page.url().includes('/login')) {
      console.log('\n⚠️ Still on login page. Login may have failed.');
      console.log('Attempting to navigate directly to dashboard...');
      await page.goto(`${BASE_URL}/logistics/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3000);
      console.log(`📍 After direct navigation: ${page.url()}`);
    }

    // Desktop screenshots of all pages
    const desktopPages = [
      { url: '/logistics/dashboard', name: '05-dashboard-desktop' },
      { url: '/logistics/loads', name: '06-loads-desktop' },
      { url: '/logistics/trips', name: '07-trips-desktop' },
      { url: '/logistics/completed', name: '08-completed-desktop' },
      { url: '/logistics/vehicles', name: '09-vehicles-desktop' },
      { url: '/logistics/service-area', name: '10-service-area-desktop' },
      { url: '/logistics/profile', name: '11-profile-desktop' }
    ];

    console.log('\n📱 DESKTOP AUDIT (1920x1080)');
    console.log('='.repeat(50));

    for (const pageInfo of desktopPages) {
      console.log(`\n📍 Navigating to ${pageInfo.url}...`);
      await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3000);
      
      const screenshotPath = path.join(SCREENSHOT_DIR, `${pageInfo.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✅ Screenshot: ${pageInfo.name}.png`);
      
      // Get page title and visible text for analysis
      const title = await page.title();
      const bodyText = await page.evaluate(() => {
        const body = document.querySelector('body');
        return body ? body.innerText.substring(0, 500) : 'No content';
      });
      
      console.log(`   Title: ${title}`);
      console.log(`   Content preview: ${bodyText.substring(0, 150)}...`);
    }

    // Mobile screenshots
    console.log('\n\n📱 MOBILE AUDIT (375x812)');
    console.log('='.repeat(50));
    
    await page.setViewportSize({ width: 375, height: 812 });
    await sleep(1000);

    const mobilePages = [
      { url: '/logistics/dashboard', name: '12-dashboard-mobile' },
      { url: '/logistics/loads', name: '13-loads-mobile' },
      { url: '/logistics/trips', name: '14-trips-mobile' }
    ];

    for (const pageInfo of mobilePages) {
      console.log(`\n📍 Navigating to ${pageInfo.url} (mobile)...`);
      await page.goto(`${BASE_URL}${pageInfo.url}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3000);
      
      const screenshotPath = path.join(SCREENSHOT_DIR, `${pageInfo.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✅ Screenshot: ${pageInfo.name}.png`);
      
      const bodyText = await page.evaluate(() => {
        const body = document.querySelector('body');
        return body ? body.innerText.substring(0, 300) : 'No content';
      });
      console.log(`   Content preview: ${bodyText.substring(0, 100)}...`);
    }

    console.log('\n\n✨ Logistics UI/UX Audit Complete!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`📊 Total screenshots: ${desktopPages.length + mobilePages.length + 4}`);

  } catch (error) {
    console.error('\n❌ Error during audit:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-screenshot.png'), fullPage: true });
    console.log('📸 Error screenshot saved: error-screenshot.png');
  } finally {
    await browser.close();
  }
}

captureLogisticsAudit().catch(console.error);
