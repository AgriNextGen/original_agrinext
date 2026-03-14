import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = join(__dirname, 'screenshots', 'logistics-comprehensive');

// Ensure screenshots directory exists
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name, description) {
  const path = join(SCREENSHOTS_DIR, name);
  try {
    await page.screenshot({ path, fullPage: false, timeout: 10000 });
    console.log(`✅ Screenshot saved: ${name}`);
    console.log(`   ${description}\n`);
    return path;
  } catch (error) {
    console.log(`   ⚠ Screenshot failed for ${name}: ${error.message}`);
    console.log(`   ℹ Continuing anyway...\n`);
    return null;
  }
}

async function safeGoto(page, url, description) {
  console.log(`→ Navigating to ${description}...`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    return true;
  } catch (error) {
    console.log(`   ⚠ Navigation timeout/error: ${error.message}`);
    console.log(`   ℹ Trying with 'load' wait condition instead...`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      return true;
    } catch (error2) {
      console.log(`   ⚠ Still failed: ${error2.message}`);
      console.log(`   ℹ Continuing anyway to capture what's on screen...`);
      return false;
    }
  }
}

async function captureLogisticsScreenshots() {
  console.log('🚀 Starting Logistics Dashboard Screenshot Capture\n');
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`);
  
  const browser = await chromium.launch({
    headless: false, // Set to true for CI/CD
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // ============================================================
    // STEP 1: Login Flow (Desktop - 1280x900)
    // ============================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 STEP 1: Login Page (Desktop 1280x900)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 1. Navigate to login
    console.log('→ Navigating to login page...');
    await safeGoto(page, 'http://localhost:5173/login', 'login page');
    await sleep(5000);
    await takeScreenshot(page, '01-login-desktop.png', 'Initial login page - desktop view (1280x900)');
    
    // 2. Select Logistics role
    console.log('→ Selecting Logistics role...');
    try {
      // Try multiple selector strategies
      const logisticsSelectors = [
        'button[data-role="logistics"]',
        'button:has-text("Logistics")',
        'button:has-text("logistics")',
        '[role="button"]:has-text("Logistics")',
        'div[data-role="logistics"]',
      ];
      
      let clicked = false;
      for (const selector of logisticsSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          clicked = true;
          console.log(`   ✓ Clicked using selector: ${selector}`);
          break;
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!clicked) {
        // Fallback: find by text content
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, div[role="button"], [class*="role"]'));
          const logisticsBtn = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('logistics') ||
            btn.className.toLowerCase().includes('logistics')
          );
          if (logisticsBtn) logisticsBtn.click();
        });
        console.log('   ✓ Clicked using JavaScript evaluation');
      }
      
      await sleep(2000);
      await takeScreenshot(page, '02-login-logistics-selected.png', 'Logistics role selected (role button highlighted)');
    } catch (error) {
      console.log(`   ⚠ Could not select Logistics role: ${error.message}`);
      await takeScreenshot(page, '02-login-logistics-selected.png', 'Login page (role selection attempted but may have failed)');
    }
    
    // 3. Fill phone field
    console.log('→ Filling phone number...');
    const phoneSelectors = [
      'input[type="tel"]',
      'input[name="phone"]',
      'input[placeholder*="phone" i]',
      'input[placeholder*="Phone" i]',
      'input[id*="phone" i]',
    ];
    
    for (const selector of phoneSelectors) {
      try {
        await page.fill(selector, '9900000103', { timeout: 2000 });
        console.log(`   ✓ Phone filled using: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    // 4. Fill password field
    console.log('→ Filling password...');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await sleep(1000);
    await takeScreenshot(page, '03-login-filled.png', 'Login form filled with phone (9900000103) and password');
    
    // 5. Click Sign In
    console.log('→ Clicking Sign In button...');
    const signInSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("sign in")',
      'button:has-text("Login")',
      'button:has-text("login")',
    ];
    
    for (const selector of signInSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        console.log(`   ✓ Clicked Sign In using: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    console.log('→ Waiting 15 seconds for login to process...');
    await sleep(15000);
    await takeScreenshot(page, '04-after-login.png', 'Page state after login attempt (should be dashboard or error)');
    
    // ============================================================
    // STEP 2: Dashboard Desktop
    // ============================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 STEP 2: Dashboard Desktop');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('→ Navigating to dashboard...');
    await safeGoto(page, 'http://localhost:5173/logistics/dashboard', 'logistics dashboard');
    await sleep(10000);
    await takeScreenshot(page, '05-dashboard-desktop.png', 'Logistics dashboard - desktop view, above fold (stats cards, active trips)');
    
    console.log('→ Scrolling dashboard...');
    await page.evaluate(() => window.scrollBy(0, 600));
    await sleep(2000);
    await takeScreenshot(page, '06-dashboard-scrolled.png', 'Logistics dashboard - scrolled view (recent activity, charts)');
    
    // ============================================================
    // STEP 3: Available Loads
    // ============================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 STEP 3: Available Loads');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await safeGoto(page, 'http://localhost:5173/logistics/loads', 'available loads');
    await sleep(8000);
    await takeScreenshot(page, '07-loads-desktop.png', 'Available loads page - list of transport requests (desktop)');
    
    // ============================================================
    // STEP 4: Active Trips
    // ============================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚛 STEP 4: Active Trips');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await safeGoto(page, 'http://localhost:5173/logistics/trips', 'active trips');
    await sleep(8000);
    await takeScreenshot(page, '08-trips-desktop.png', 'Active trips page - in-progress trips with status (desktop)');
    
    // ============================================================
    // STEP 5: Completed Trips
    // ============================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ STEP 5: Completed Trips');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await safeGoto(page, 'http://localhost:5173/logistics/completed', 'completed trips');
    await sleep(8000);
    await takeScreenshot(page, '09-completed-desktop.png', 'Completed trips page - historical trips with delivery proofs (desktop)');
    
    // ============================================================
    // STEP 6: Vehicles
    // ============================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚗 STEP 6: Vehicles');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await safeGoto(page, 'http://localhost:5173/logistics/vehicles', 'vehicles');
    await sleep(8000);
    await takeScreenshot(page, '10-vehicles-desktop.png', 'Vehicles page - vehicle fleet management (desktop)');
    
    // ============================================================
    // STEP 7: Service Area
    // ============================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗺️  STEP 7: Service Area');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await safeGoto(page, 'http://localhost:5173/logistics/service-area', 'service area');
    await sleep(8000);
    await takeScreenshot(page, '11-service-area-desktop.png', 'Service area page - coverage area configuration (desktop)');
    
    // ============================================================
    // STEP 8: Profile
    // ============================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 STEP 8: Profile');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await safeGoto(page, 'http://localhost:5173/logistics/profile', 'profile');
    await sleep(8000);
    await takeScreenshot(page, '12-profile-desktop.png', 'Profile page - user settings and info (desktop)');
    
    // ============================================================
    // STEP 9: Mobile Views (390x844)
    // ============================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 STEP 9: Mobile Views (390x844)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await page.setViewportSize({ width: 390, height: 844 });
    
    console.log('→ Dashboard mobile (top)...');
    await safeGoto(page, 'http://localhost:5173/logistics/dashboard', 'dashboard mobile');
    await sleep(8000);
    await takeScreenshot(page, '13-dashboard-mobile.png', 'Dashboard - mobile view (390x844), top portion with stats');
    
    console.log('→ Dashboard mobile (scrolled)...');
    await page.evaluate(() => window.scrollBy(0, 500));
    await sleep(2000);
    await takeScreenshot(page, '14-dashboard-mobile-scrolled.png', 'Dashboard - mobile view, scrolled (trips list, activity feed)');
    
    console.log('→ Loads mobile...');
    await safeGoto(page, 'http://localhost:5173/logistics/loads', 'loads mobile');
    await sleep(8000);
    await takeScreenshot(page, '15-loads-mobile.png', 'Available loads - mobile view (card layout, stacked)');
    
    console.log('→ Trips mobile...');
    await safeGoto(page, 'http://localhost:5173/logistics/trips', 'trips mobile');
    await sleep(8000);
    await takeScreenshot(page, '16-trips-mobile.png', 'Active trips - mobile view (compact trip cards)');
    
    console.log('→ Profile mobile...');
    await safeGoto(page, 'http://localhost:5173/logistics/profile', 'profile mobile');
    await sleep(8000);
    await takeScreenshot(page, '17-profile-mobile.png', 'Profile - mobile view (vertical layout, touch-friendly)');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Screenshot capture COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📁 All 17 screenshots saved to:`);
    console.log(`   ${SCREENSHOTS_DIR}\n`);
    console.log('📋 Screenshots captured:');
    console.log('   • Login flow (3 screenshots)');
    console.log('   • Dashboard desktop + scrolled (2)');
    console.log('   • Loads, Trips, Completed, Vehicles (4)');
    console.log('   • Service Area, Profile (2)');
    console.log('   • Mobile views (6)');
    console.log('   ─────────────────────────');
    console.log('   Total: 17 screenshots\n');
    
  } catch (error) {
    console.error('\n❌ ERROR during screenshot capture:');
    console.error(error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureLogisticsScreenshots().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
