import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  try {
    // Step 1: Navigate to login
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/logistics-complete/01-login-initial.png', fullPage: false });
    console.log('Screenshot: 01-login-initial.png');

    // Step 2: Click Logistics role
    console.log('Step 2: Clicking Logistics role...');
    await page.click('button:has-text("Logistics")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/logistics-complete/02-login-logistics-selected.png', fullPage: false });
    console.log('Screenshot: 02-login-logistics-selected.png');

    // Step 3: Fill phone number
    console.log('Step 3: Filling phone number...');
    const phoneInput = await page.locator('input[type="tel"], input[placeholder*="phone" i], input[name*="phone" i]').first();
    await phoneInput.clear();
    await phoneInput.fill('9900000103');
    await page.waitForTimeout(1000);

    // Step 4: Fill password
    console.log('Step 4: Filling password...');
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.clear();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/logistics-complete/03-login-filled.png', fullPage: false });
    console.log('Screenshot: 03-login-filled.png');

    // Step 5: Click Sign In
    console.log('Step 5: Clicking Sign In...');
    await page.click('button:has-text("Sign In")');
    
    // Step 6: Wait 15 seconds for login
    console.log('Step 6: Waiting 15 seconds for login...');
    await page.waitForTimeout(15000);
    await page.screenshot({ path: 'screenshots/logistics-complete/04-after-login.png', fullPage: false });
    console.log('Screenshot: 04-after-login.png');

    // Check if still on setup screen
    const setupText = await page.locator('text="Setting up your account"').count();
    if (setupText > 0) {
      console.log('Still on setup screen, waiting another 15 seconds...');
      await page.waitForTimeout(15000);
      await page.screenshot({ path: 'screenshots/logistics-complete/04b-after-wait.png', fullPage: false });
      console.log('Screenshot: 04b-after-wait.png');
    }

    // DESKTOP SCREENSHOTS
    console.log('Taking desktop screenshots at 1280x900...');
    
    // A. Dashboard
    console.log('A. Dashboard page...');
    await page.goto('http://localhost:5173/logistics/dashboard');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/05-dashboard-desktop.png', fullPage: true });
    console.log('Screenshot: 05-dashboard-desktop.png');

    // B. Loads
    console.log('B. Loads page...');
    await page.goto('http://localhost:5173/logistics/loads');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/06-loads-desktop.png', fullPage: true });
    console.log('Screenshot: 06-loads-desktop.png');

    // C. Trips
    console.log('C. Trips page...');
    await page.goto('http://localhost:5173/logistics/trips');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/07-trips-desktop.png', fullPage: true });
    console.log('Screenshot: 07-trips-desktop.png');

    // D. Completed
    console.log('D. Completed page...');
    await page.goto('http://localhost:5173/logistics/completed');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/08-completed-desktop.png', fullPage: true });
    console.log('Screenshot: 08-completed-desktop.png');

    // E. Vehicles
    console.log('E. Vehicles page...');
    await page.goto('http://localhost:5173/logistics/vehicles');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/09-vehicles-desktop.png', fullPage: true });
    console.log('Screenshot: 09-vehicles-desktop.png');

    // F. Service Area
    console.log('F. Service Area page...');
    await page.goto('http://localhost:5173/logistics/service-area');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/10-service-area-desktop.png', fullPage: true });
    console.log('Screenshot: 10-service-area-desktop.png');

    // G. Profile
    console.log('G. Profile page...');
    await page.goto('http://localhost:5173/logistics/profile');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/11-profile-desktop.png', fullPage: true });
    console.log('Screenshot: 11-profile-desktop.png');

    // MOBILE SCREENSHOTS
    console.log('Switching to mobile viewport 375x812...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);

    // H. Dashboard mobile
    console.log('H. Dashboard mobile...');
    await page.goto('http://localhost:5173/logistics/dashboard');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/12-dashboard-mobile.png', fullPage: true });
    console.log('Screenshot: 12-dashboard-mobile.png');

    // I. Loads mobile
    console.log('I. Loads mobile...');
    await page.goto('http://localhost:5173/logistics/loads');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/13-loads-mobile.png', fullPage: true });
    console.log('Screenshot: 13-loads-mobile.png');

    // J. Trips mobile
    console.log('J. Trips mobile...');
    await page.goto('http://localhost:5173/logistics/trips');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'screenshots/logistics-complete/14-trips-mobile.png', fullPage: true });
    console.log('Screenshot: 14-trips-mobile.png');

    console.log('All screenshots captured successfully!');

  } catch (error) {
    console.error('Error during screenshot capture:', error);
    await page.screenshot({ path: 'screenshots/logistics-complete/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
