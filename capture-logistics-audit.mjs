#!/usr/bin/env node
import { chromium } from 'playwright';
import { setTimeout } from 'timers/promises';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'logistics-screenshots';

async function captureLogisticsScreenshots() {
  console.log('🚀 Starting logistics dashboard screenshot capture...\n');
  
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
    // ============ STEP 1: Login Page ============
    console.log('📍 Step 1: Login Page');
    
    console.log('  → Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await setTimeout(5000);
    
    console.log('  → Taking screenshot 01-login-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/01-login-desktop.png`,
      fullPage: false
    });
    
    console.log('  → Selecting Logistics role...');
    await page.click('button:has-text("Logistics")');
    await setTimeout(2000);
    
    console.log('  → Taking screenshot 02-login-logistics-selected.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/02-login-logistics-selected.png`,
      fullPage: false
    });
    
    console.log('  → Filling login credentials...');
    await page.fill('input[type="tel"]', '9900000103');
    await page.fill('input[type="password"]', 'Dummy@12345');
    
    console.log('  → Taking screenshot 03-login-filled.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/03-login-filled.png`,
      fullPage: false
    });
    
    console.log('  → Clicking Sign In...');
    await page.click('button:has-text("Sign In")');
    await setTimeout(15000);
    
    console.log('  → Taking screenshot 04-after-login.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/04-after-login.png`,
      fullPage: false
    });
    
    // ============ STEP 2: Dashboard Desktop ============
    console.log('\n📍 Step 2: Dashboard Desktop');
    
    console.log('  → Navigating to dashboard...');
    await page.goto(`${BASE_URL}/logistics/dashboard`, { waitUntil: 'networkidle' });
    await setTimeout(10000);
    
    console.log('  → Taking screenshot 05-dashboard-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/05-dashboard-desktop.png`,
      fullPage: false
    });
    
    console.log('  → Scrolling down...');
    await page.evaluate(() => window.scrollBy(0, 600));
    await setTimeout(2000);
    
    console.log('  → Taking screenshot 06-dashboard-scrolled.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/06-dashboard-scrolled.png`,
      fullPage: false
    });
    
    // ============ STEP 3: Available Loads ============
    console.log('\n📍 Step 3: Available Loads');
    
    console.log('  → Navigating to loads page...');
    await page.goto(`${BASE_URL}/logistics/loads`, { waitUntil: 'networkidle' });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 07-loads-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/07-loads-desktop.png`,
      fullPage: false
    });
    
    // ============ STEP 4: Active Trips ============
    console.log('\n📍 Step 4: Active Trips');
    
    console.log('  → Navigating to trips page...');
    await page.goto(`${BASE_URL}/logistics/trips`, { waitUntil: 'networkidle' });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 08-trips-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/08-trips-desktop.png`,
      fullPage: false
    });
    
    // ============ STEP 5: Completed Trips ============
    console.log('\n📍 Step 5: Completed Trips');
    
    console.log('  → Navigating to completed page...');
    await page.goto(`${BASE_URL}/logistics/completed`, { waitUntil: 'networkidle' });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 09-completed-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/09-completed-desktop.png`,
      fullPage: false
    });
    
    // ============ STEP 6: Vehicles ============
    console.log('\n📍 Step 6: Vehicles');
    
    console.log('  → Navigating to vehicles page...');
    await page.goto(`${BASE_URL}/logistics/vehicles`, { waitUntil: 'networkidle' });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 10-vehicles-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/10-vehicles-desktop.png`,
      fullPage: false
    });
    
    // ============ STEP 7: Service Area ============
    console.log('\n📍 Step 7: Service Area');
    
    console.log('  → Navigating to service area page...');
    await page.goto(`${BASE_URL}/logistics/service-area`, { waitUntil: 'networkidle' });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 11-service-area-desktop.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/11-service-area-desktop.png`,
      fullPage: false
    });
    
    // ============ STEP 8: Profile ============
    console.log('\n📍 Step 8: Profile');
    
    console.log('  → Navigating to profile page...');
    await page.goto(`${BASE_URL}/logistics/profile`, { waitUntil: 'networkidle' });
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
    await page.goto(`${BASE_URL}/logistics/dashboard`, { waitUntil: 'networkidle' });
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
    await page.goto(`${BASE_URL}/logistics/loads`, { waitUntil: 'networkidle' });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 15-loads-mobile.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/15-loads-mobile.png`,
      fullPage: false
    });
    
    console.log('  → Navigating to mobile trips...');
    await page.goto(`${BASE_URL}/logistics/trips`, { waitUntil: 'networkidle' });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 16-trips-mobile.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/16-trips-mobile.png`,
      fullPage: false
    });
    
    console.log('  → Navigating to mobile profile...');
    await page.goto(`${BASE_URL}/logistics/profile`, { waitUntil: 'networkidle' });
    await setTimeout(8000);
    
    console.log('  → Taking screenshot 17-profile-mobile.png');
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/17-profile-mobile.png`,
      fullPage: false
    });
    
    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}/`);
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    
    // Take error screenshot
    await page.screenshot({ 
      path: `${SCREENSHOT_DIR}/error-screenshot.png`,
      fullPage: true
    });
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the capture
captureLogisticsScreenshots().catch(console.error);
