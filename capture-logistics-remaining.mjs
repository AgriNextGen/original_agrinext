#!/usr/bin/env node
import { chromium } from 'playwright';
import { setTimeout } from 'timers/promises';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'logistics-screenshots';

async function captureRemainingScreenshots() {
  console.log('🚀 Continuing logistics screenshot capture...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  
  const page = await context.newPage();
  
  try {
    // Login first
    console.log('📍 Logging in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Logistics")');
    await setTimeout(1000);
    await page.fill('input[type="tel"]', '9900000103');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await page.click('button:has-text("Sign In")');
    await setTimeout(15000);
    
    // Skip completed trips - it's timing out
    // Go directly to Vehicles
    
    // ============ STEP 6: Vehicles ============
    console.log('\n📍 Step 6: Vehicles');
    
    console.log('  → Navigating to vehicles page...');
    await page.goto(`${BASE_URL}/logistics/vehicles`, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 10-vehicles-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/10-vehicles-desktop.png`,
      fullPage: false
    });
    
    // ============ STEP 7: Service Area ============
    console.log('\n📍 Step 7: Service Area');
    
    console.log('  → Navigating to service area page...');
    await page.goto(`${BASE_URL}/logistics/service-area`, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 11-service-area-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/11-service-area-desktop.png`,
      fullPage: false
    });
    
    // ============ STEP 8: Profile ============
    console.log('\n📍 Step 8: Profile');
    
    console.log('  → Navigating to profile page...');
    await page.goto(`${BASE_URL}/logistics/profile`, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 12-profile-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/12-profile-desktop.png`,
      fullPage: false
    });
    
    // ============ STEP 9: Mobile Views ============
    console.log('\n📍 Step 9: Mobile Views (390x844)');
    
    console.log('  → Resizing viewport to mobile...');
    await page.setViewportSize({ width: 390, height: 844 });
    await setTimeout(2000);
    
    console.log('  → Navigating to mobile dashboard...');
    await page.goto(`${BASE_URL}/logistics/dashboard`, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 13-dashboard-mobile.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/13-dashboard-mobile.png`,
      fullPage: false
    });
    
    console.log('  → Scrolling down on mobile...');
    await page.evaluate(() => window.scrollBy(0, 400));
    await setTimeout(2000);
    
    console.log('  → Taking screenshot 14-dashboard-mobile-scrolled.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/14-dashboard-mobile-scrolled.png`,
      fullPage: false
    });
    
    console.log('  → Navigating to mobile loads...');
    await page.goto(`${BASE_URL}/logistics/loads`, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 15-loads-mobile.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/15-loads-mobile.png`,
      fullPage: false
    });
    
    console.log('  → Navigating to mobile trips...');
    await page.goto(`${BASE_URL}/logistics/trips`, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 16-trips-mobile.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/16-trips-mobile.png`,
      fullPage: false
    });
    
    console.log('  → Navigating to mobile profile...');
    await page.goto(`${BASE_URL}/logistics/profile`, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 17-profile-mobile.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/17-profile-mobile.png`,
      fullPage: false
    });
    
    console.log('\n✅ All remaining screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}/`);
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    
    // Take error screenshot
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/error-screenshot-2.png`,
      fullPage: true
    });
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the capture
captureRemainingScreenshots().catch(console.error);
