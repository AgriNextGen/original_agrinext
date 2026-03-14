#!/usr/bin/env node

/**
 * Farmer Dashboard UX Audit - Screenshot Capture Script
 * 
 * Logs in as a farmer and captures screenshots of all farmer dashboard pages
 * at desktop (1920x1080) and mobile (375x812) sizes.
 */

import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = './screenshots/farmer-audit';

// Login credentials
const LOGIN_PHONE = '9888880101';
const LOGIN_PASSWORD = 'SmokeTest@99';

// Pages to capture
const FARMER_PAGES = [
  { path: '/farmer/dashboard', name: 'dashboard' },
  { path: '/farmer/crops', name: 'crops' },
  { path: '/farmer/farmlands', name: 'farmlands' },
  { path: '/farmer/transport', name: 'transport' },
  { path: '/farmer/listings', name: 'listings' },
  { path: '/farmer/orders', name: 'orders' },
  { path: '/farmer/earnings', name: 'earnings' },
  { path: '/farmer/notifications', name: 'notifications' },
  { path: '/farmer/settings', name: 'settings' }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function describePageContent(page, pageName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PAGE: ${pageName}`);
  console.log(`URL: ${page.url()}`);
  console.log(`${'='.repeat(80)}`);

  // Get page title
  const title = await page.title();
  console.log(`\nTitle: ${title}`);

  // Get main content text
  const bodyText = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    return main.innerText.substring(0, 500);
  });
  console.log(`\nVisible content preview:\n${bodyText.substring(0, 300)}...`);

  // Check for error states
  const hasError = await page.evaluate(() => {
    return !!(
      document.querySelector('[role="alert"]') ||
      document.querySelector('.error') ||
      document.querySelector('[class*="error"]') ||
      document.body.innerText.includes('Error') ||
      document.body.innerText.includes('error')
    );
  });
  if (hasError) {
    console.log('\n⚠️  ERROR DETECTED on page');
  }

  // Check for empty states
  const hasEmptyState = await page.evaluate(() => {
    return !!(
      document.querySelector('[class*="empty"]') ||
      document.body.innerText.includes('No data') ||
      document.body.innerText.includes('Nothing here') ||
      document.body.innerText.includes('No items')
    );
  });
  if (hasEmptyState) {
    console.log('ℹ️  Empty state detected');
  }

  // Check for loading states
  const isLoading = await page.evaluate(() => {
    return !!(
      document.querySelector('[class*="loading"]') ||
      document.querySelector('[class*="spinner"]') ||
      document.querySelector('[role="progressbar"]')
    );
  });
  if (isLoading) {
    console.log('⏳ Loading state detected');
  }

  // Get viewport size
  const viewport = page.viewportSize();
  console.log(`\nViewport: ${viewport.width}x${viewport.height}`);
}

async function captureFullPage(page, filename, description) {
  console.log(`\n📸 Capturing: ${description}`);
  
  // Scroll to bottom to trigger any lazy loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(500);
  
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  
  // Take screenshot
  await page.screenshot({ 
    path: filename, 
    fullPage: true,
    type: 'png'
  });
  
  console.log(`✅ Saved: ${filename}`);
}

async function main() {
  console.log('🚀 Starting Farmer Dashboard UX Audit\n');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Screenshots will be saved to: ${SCREENSHOT_DIR}\n`);

  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,  // Show browser for debugging
    slowMo: 100       // Slow down actions
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Listen to console messages
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[BROWSER ${type.toUpperCase()}]`, msg.text());
    }
  });
  
  // Listen to page errors
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });

  try {
    // Step 1: Navigate to login page
    console.log('\n📍 Step 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await sleep(1000);
    
    await describePageContent(page, 'Login Page');
    await captureFullPage(
      page, 
      join(SCREENSHOT_DIR, 'desktop-00-login-initial.png'),
      'Login page (initial)'
    );

    // Step 2: Click Farmer role button
    console.log('\n📍 Step 2: Selecting Farmer role...');
    const farmerButton = page.locator('button:has-text("Farmer"), [role="button"]:has-text("Farmer")').first();
    await farmerButton.click();
    await sleep(500);
    
    await captureFullPage(
      page,
      join(SCREENSHOT_DIR, 'desktop-01-login-farmer-selected.png'),
      'Login page (farmer selected)'
    );

    // Step 3: Enter phone number
    console.log('\n📍 Step 3: Entering phone number...');
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').first();
    await phoneInput.fill(LOGIN_PHONE);
    await sleep(300);

    // Step 4: Enter password
    console.log('\n📍 Step 4: Entering password...');
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(LOGIN_PASSWORD);
    await sleep(300);
    
    await captureFullPage(
      page,
      join(SCREENSHOT_DIR, 'desktop-02-login-filled.png'),
      'Login page (credentials filled)'
    );

    // Step 5: Click Sign In
    console.log('\n📍 Step 5: Clicking Sign In...');
    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Login")').first();
    await signInButton.click();
    
    // Wait for navigation
    console.log('⏳ Waiting for authentication and redirect...');
    try {
      // Wait for either the farmer dashboard or an error
      await Promise.race([
        page.waitForURL(/\/farmer/, { timeout: 20000 }),
        page.waitForSelector('[role="alert"]', { timeout: 20000 })
      ]);
    } catch (e) {
      console.log('⚠️  Navigation timeout, checking current page...');
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      // Check if we're still on login page with error
      const errorText = await page.evaluate(() => {
        const alert = document.querySelector('[role="alert"]');
        return alert ? alert.innerText : null;
      });
      
      if (errorText) {
        console.error(`❌ Login error: ${errorText}`);
      }
      
      // Take a diagnostic screenshot
      await page.screenshot({
        path: join(SCREENSHOT_DIR, 'login-diagnostic.png'),
        fullPage: true
      });
      
      throw new Error(`Login failed. Current URL: ${currentUrl}`);
    }
    
    await sleep(3000); // Wait for dashboard to fully load
    
    console.log('✅ Successfully logged in!');

    // Step 6: Capture all farmer pages (desktop)
    console.log('\n📍 Step 6: Capturing all farmer pages (desktop 1920x1080)...');
    
    for (const pageInfo of FARMER_PAGES) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`Navigating to: ${pageInfo.path}`);
      
      await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle' });
      await sleep(2000); // Wait for content to load
      
      await describePageContent(page, pageInfo.name);
      
      await captureFullPage(
        page,
        join(SCREENSHOT_DIR, `desktop-${pageInfo.name}-full.png`),
        `${pageInfo.name} page (desktop, full)`
      );
      
      // Capture top section
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(300);
      await page.screenshot({
        path: join(SCREENSHOT_DIR, `desktop-${pageInfo.name}-top.png`),
        type: 'png'
      });
      console.log(`✅ Saved top section`);
    }

    // Step 7: Switch to mobile viewport
    console.log('\n📍 Step 7: Switching to mobile viewport (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await sleep(1000);

    // Capture dashboard at mobile size
    console.log('\n📍 Step 8: Capturing farmer dashboard (mobile)...');
    await page.goto(`${BASE_URL}/farmer/dashboard`, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    await describePageContent(page, 'Dashboard (Mobile)');
    
    await captureFullPage(
      page,
      join(SCREENSHOT_DIR, 'mobile-dashboard-full.png'),
      'Dashboard (mobile, full page)'
    );

    // Capture top section mobile
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'mobile-dashboard-top.png'),
      type: 'png'
    });
    console.log('✅ Saved mobile dashboard top');

    // Step 9: Open hamburger menu (if exists)
    console.log('\n📍 Step 9: Attempting to open mobile menu...');
    
    const menuButton = page.locator('button[aria-label*="menu" i], button:has([class*="menu"]), button:has-text("☰")').first();
    const menuExists = await menuButton.count() > 0;
    
    if (menuExists) {
      await menuButton.click();
      await sleep(500);
      
      await page.screenshot({
        path: join(SCREENSHOT_DIR, 'mobile-menu-open.png'),
        type: 'png'
      });
      console.log('✅ Saved mobile menu screenshot');
    } else {
      console.log('ℹ️  No hamburger menu found');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ UX AUDIT COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\nScreenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`Total pages captured: ${FARMER_PAGES.length}`);

  } catch (error) {
    console.error('\n❌ Error during audit:', error);
    
    // Capture error screenshot
    await page.screenshot({ 
      path: join(SCREENSHOT_DIR, 'error-screenshot.png'),
      fullPage: true 
    });
    console.log('Error screenshot saved');
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the audit
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
