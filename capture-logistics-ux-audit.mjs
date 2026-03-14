import { chromium } from 'playwright';
import { setTimeout } from 'timers/promises';

async function captureLogisticsScreenshots() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  context.setDefaultNavigationTimeout(60000); // Increase timeout to 60 seconds
  const page = await context.newPage();

  const outputDir = './screenshots/logistics-ux-audit';
  let screenshotCount = 0;

  async function takeScreenshot(name, description) {
    screenshotCount++;
    const path = `${outputDir}/${name}`;
    await page.screenshot({ path, fullPage: false });
    console.log(`\n✓ Screenshot ${screenshotCount}: ${name}`);
    console.log(`  ${description}`);
    return path;
  }

  try {
    console.log('🚀 Starting Logistics Dashboard UX Audit Screenshot Capture\n');
    console.log('=========================================================\n');

    // STEP 1: Login Page
    console.log('📍 STEP 1: Login Page');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 60000 });
    await setTimeout(5000);
    await takeScreenshot('01-login-desktop.png', 'Initial login page - desktop view');

    console.log('  Clicking Logistics role button...');
    await page.click('[data-role="logistics"], button:has-text("Logistics")');
    await setTimeout(2000);
    await takeScreenshot('02-login-logistics-selected.png', 'Logistics role selected');

    console.log('  Filling login credentials...');
    await page.fill('input[type="tel"], input[placeholder*="Phone"], input[name="phone"]', '9900000103');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await takeScreenshot('03-login-filled.png', 'Login form filled with credentials');

    console.log('  Clicking Sign In button...');
    await page.click('button:has-text("Sign In"), button[type="submit"]');
    await setTimeout(15000);
    await takeScreenshot('04-after-login.png', 'Page state after login attempt');

    // STEP 2: Dashboard Desktop
    console.log('\n📍 STEP 2: Dashboard Desktop');
    await page.goto('http://localhost:5173/logistics/dashboard');
    await setTimeout(10000);
    await takeScreenshot('05-dashboard-desktop.png', 'Logistics dashboard - desktop full view');

    console.log('  Scrolling down...');
    await page.evaluate(() => window.scrollBy(0, 500));
    await setTimeout(2000);
    await takeScreenshot('06-dashboard-scrolled.png', 'Dashboard scrolled to show more content');

    // STEP 3: Available Loads
    console.log('\n📍 STEP 3: Available Loads');
    await page.goto('http://localhost:5173/logistics/loads');
    await setTimeout(8000);
    await takeScreenshot('07-loads-desktop.png', 'Available loads page - desktop view');

    // STEP 4: Active Trips
    console.log('\n📍 STEP 4: Active Trips');
    await page.goto('http://localhost:5173/logistics/trips');
    await setTimeout(8000);
    await takeScreenshot('08-trips-desktop.png', 'Active trips page - desktop view');

    // STEP 5: Completed Trips
    console.log('\n📍 STEP 5: Completed Trips');
    await page.goto('http://localhost:5173/logistics/completed');
    await setTimeout(8000);
    await takeScreenshot('09-completed-desktop.png', 'Completed trips page - desktop view');

    // STEP 6: Vehicles
    console.log('\n📍 STEP 6: Vehicles');
    await page.goto('http://localhost:5173/logistics/vehicles');
    await setTimeout(8000);
    await takeScreenshot('10-vehicles-desktop.png', 'Vehicles management page - desktop view');

    // STEP 7: Service Area
    console.log('\n📍 STEP 7: Service Area');
    await page.goto('http://localhost:5173/logistics/service-area');
    await setTimeout(8000);
    await takeScreenshot('11-service-area-desktop.png', 'Service area configuration - desktop view');

    // STEP 8: Profile
    console.log('\n📍 STEP 8: Profile');
    await page.goto('http://localhost:5173/logistics/profile');
    await setTimeout(8000);
    await takeScreenshot('12-profile-desktop.png', 'Profile page - desktop view');

    // STEP 9: Mobile Views
    console.log('\n📍 STEP 9: Mobile Views (390x844)');
    await page.setViewportSize({ width: 390, height: 844 });
    await setTimeout(2000);

    console.log('  Dashboard mobile...');
    await page.goto('http://localhost:5173/logistics/dashboard');
    await setTimeout(8000);
    await takeScreenshot('13-dashboard-mobile.png', 'Dashboard - mobile view');

    console.log('  Scrolling mobile dashboard...');
    await page.evaluate(() => window.scrollBy(0, 400));
    await setTimeout(2000);
    await takeScreenshot('14-dashboard-mobile-scrolled.png', 'Dashboard scrolled - mobile view');

    console.log('  Loads mobile...');
    await page.goto('http://localhost:5173/logistics/loads');
    await setTimeout(8000);
    await takeScreenshot('15-loads-mobile.png', 'Available loads - mobile view');

    console.log('  Trips mobile...');
    await page.goto('http://localhost:5173/logistics/trips');
    await setTimeout(8000);
    await takeScreenshot('16-trips-mobile.png', 'Active trips - mobile view');

    console.log('  Profile mobile...');
    await page.goto('http://localhost:5173/logistics/profile');
    await setTimeout(8000);
    await takeScreenshot('17-profile-mobile.png', 'Profile - mobile view');

    console.log('\n\n✅ SUCCESS: All screenshots captured successfully!');
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`📸 Total screenshots: ${screenshotCount}`);

  } catch (error) {
    console.error('\n❌ ERROR during screenshot capture:', error);
    await page.screenshot({ path: `${outputDir}/error-screenshot.png` });
    console.log('Saved error screenshot');
  } finally {
    await browser.close();
  }
}

captureLogisticsScreenshots().catch(console.error);
