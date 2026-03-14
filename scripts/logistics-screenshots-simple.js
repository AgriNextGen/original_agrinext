#!/usr/bin/env node

/**
 * Simplified AgriNext Logistics Dashboard Screenshot Automation
 * Uses Playwright with minimal waits for faster execution
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  baseUrl: 'http://localhost:5173',
  phone: '9900000103',
  password: 'Dummy@12345',
  screenshotsDir: path.join(__dirname, '..', 'screenshots', 'logistics-audit'),
};

// Ensure directory exists
if (!fs.existsSync(CONFIG.screenshotsDir)) {
  fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
}

async function main() {
  console.log('🚀 Starting screenshot automation...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  try {
    // Step 1: Login page
    console.log('📸 1. Loading login page...');
    await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'load', timeout: 60000 });
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, '01-login-initial.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 01-login-initial.png');
    
    // Try to select logistics role if visible
    try {
      await page.click('button:has-text("Logistics")', { timeout: 2000 });
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(CONFIG.screenshotsDir, '02-login-logistics-selected.png'),
        fullPage: true 
      });
      console.log('   ✓ Saved: 02-login-logistics-selected.png');
    } catch (e) {
      console.log('   ⚠ No logistics role selector found');
    }
    
    // Step 2: Fill and submit login
    console.log('\n📸 2. Filling login form...');
    await page.fill('input[type="tel"], input[name="phone"]', CONFIG.phone);
    await page.fill('input[type="password"]', CONFIG.password);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, '03-login-filled.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 03-login-filled.png');
    
    console.log('\n📸 3. Submitting login...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(CONFIG.screenshotsDir, '04-after-login.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 04-after-login.png');
    
    // Step 3: Desktop pages
    const pages = [
      { name: 'dashboard', url: '/logistics/dashboard' },
      { name: 'loads', url: '/logistics/loads' },
      { name: 'trips', url: '/logistics/trips' },
      { name: 'completed', url: '/logistics/completed' },
      { name: 'vehicles', url: '/logistics/vehicles' },
      { name: 'service-area', url: '/logistics/service-area' },
      { name: 'profile', url: '/logistics/profile' }
    ];
    
    console.log('\n📸 4. Capturing desktop pages...');
    for (const p of pages) {
      console.log(`   → ${p.name}...`);
      await page.goto(`${CONFIG.baseUrl}${p.url}`, { waitUntil: 'load', timeout: 60000 });
      await page.screenshot({ 
        path: path.join(CONFIG.screenshotsDir, `05-desktop-${p.name}.png`),
        fullPage: true 
      });
      console.log(`   ✓ Saved: 05-desktop-${p.name}.png`);
    }
    
    // Step 4: Mobile screenshots
    console.log('\n📸 5. Switching to mobile viewport...');
    await context.setViewportSize({ width: 375, height: 812 });
    
    const mobilePages = [
      { name: 'dashboard', url: '/logistics/dashboard' },
      { name: 'loads', url: '/logistics/loads' },
      { name: 'trips', url: '/logistics/trips' }
    ];
    
    for (const p of mobilePages) {
      console.log(`   → mobile-${p.name}...`);
      await page.goto(`${CONFIG.baseUrl}${p.url}`, { waitUntil: 'load', timeout: 60000 });
      await page.screenshot({ 
        path: path.join(CONFIG.screenshotsDir, `06-mobile-${p.name}.png`),
        fullPage: true 
      });
      console.log(`   ✓ Saved: 06-mobile-${p.name}.png`);
    }
    
    // Try mobile menu
    try {
      await page.goto(`${CONFIG.baseUrl}/logistics/dashboard`, { waitUntil: 'load', timeout: 60000 });
      await page.click('button[aria-label*="menu" i], button:has-text("☰")', { timeout: 2000 });
      await page.waitForTimeout(500);
      await page.screenshot({ 
        path: path.join(CONFIG.screenshotsDir, '06-mobile-menu-open.png'),
        fullPage: true 
      });
      console.log('   ✓ Saved: 06-mobile-menu-open.png');
    } catch (e) {
      console.log('   ⚠ Could not capture mobile menu');
    }
    
    console.log('\n✅ Screenshot automation complete!');
    console.log(`📁 Location: ${CONFIG.screenshotsDir}`);
    
    const screenshots = fs.readdirSync(CONFIG.screenshotsDir).filter(f => f.endsWith('.png'));
    console.log(`📊 Total screenshots: ${screenshots.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
