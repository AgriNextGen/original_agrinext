#!/usr/bin/env node

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = './screenshots/logistics-audit-complete';

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

(async () => {
  log('Starting Logistics UI/UX Audit - Complete Flow');
  
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'msedge'
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => log(`CONSOLE [${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => log(`PAGE ERROR: ${err.message}`));
  
  try {
    // Step 1: Navigate to login page
    log('Step 1: Navigating to login page');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(OUTPUT_DIR, '01-login-initial.png'), fullPage: true });
    log('✓ Login page loaded');
    
    // Step 2: Select Logistics role
    log('Step 2: Selecting Logistics role');
    const logisticsButton = page.locator('button:has-text("Logistics")');
    await logisticsButton.waitFor({ state: 'visible', timeout: 10000 });
    await logisticsButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(OUTPUT_DIR, '02-login-logistics-selected.png'), fullPage: true });
    log('✓ Logistics role selected');
    
    // Step 3: Fill in credentials
    log('Step 3: Filling credentials');
    await page.fill('input[name="phone"], input[type="tel"]', '9900000103');
    await page.waitForTimeout(500);
    await page.fill('input[name="password"], input[type="password"]', 'Dummy@12345');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(OUTPUT_DIR, '03-login-filled.png'), fullPage: true });
    log('✓ Credentials filled');
    
    // Step 4: Click login button
    log('Step 4: Clicking login button');
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")').first();
    await loginButton.click();
    log('✓ Login button clicked');
    
    // Step 5: Wait for login to complete - check for redirect or dashboard
    log('Step 5: Waiting for login to complete (10 seconds)');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: join(OUTPUT_DIR, '04-after-login.png'), fullPage: true });
    log(`✓ Current URL after login: ${page.url()}`);
    
    // If not on dashboard, try navigating directly
    if (!page.url().includes('/logistics')) {
      log('Not on logistics page, navigating directly to dashboard');
      await page.goto('http://localhost:5173/logistics/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    }
    
    // Desktop screenshots - navigate to each page
    const desktopPages = [
      { url: 'http://localhost:5173/logistics/dashboard', name: '05-dashboard-desktop' },
      { url: 'http://localhost:5173/logistics/loads', name: '06-loads-desktop' },
      { url: 'http://localhost:5173/logistics/trips', name: '07-trips-desktop' },
      { url: 'http://localhost:5173/logistics/completed', name: '08-completed-desktop' },
      { url: 'http://localhost:5173/logistics/vehicles', name: '09-vehicles-desktop' },
      { url: 'http://localhost:5173/logistics/service-area', name: '10-service-area-desktop' },
      { url: 'http://localhost:5173/logistics/profile', name: '11-profile-desktop' }
    ];
    
    for (const pageInfo of desktopPages) {
      log(`Capturing: ${pageInfo.name}`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000); // Wait for any dynamic content
      await page.screenshot({ path: join(OUTPUT_DIR, `${pageInfo.name}.png`), fullPage: true });
      log(`✓ Screenshot saved: ${pageInfo.name}`);
    }
    
    // Mobile screenshots - resize viewport
    log('Switching to mobile viewport (375x812)');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);
    
    const mobilePages = [
      { url: 'http://localhost:5173/logistics/dashboard', name: '12-dashboard-mobile' },
      { url: 'http://localhost:5173/logistics/loads', name: '13-loads-mobile' },
      { url: 'http://localhost:5173/logistics/trips', name: '14-trips-mobile' }
    ];
    
    for (const pageInfo of mobilePages) {
      log(`Capturing mobile: ${pageInfo.name}`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: join(OUTPUT_DIR, `${pageInfo.name}.png`), fullPage: true });
      log(`✓ Screenshot saved: ${pageInfo.name}`);
    }
    
    log('✅ All screenshots captured successfully!');
    log(`Screenshots saved to: ${OUTPUT_DIR}`);
    
  } catch (error) {
    log(`❌ Error: ${error.message}`);
    await page.screenshot({ path: join(OUTPUT_DIR, 'error-screenshot.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
    log('Browser closed');
  }
})();
