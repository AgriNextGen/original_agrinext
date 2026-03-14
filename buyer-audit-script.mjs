import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function audit() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000); // Increase timeout to 60 seconds
  page.setDefaultNavigationTimeout(60000);

  try {
    console.log('Starting buyer dashboard audit...');
    
    // Navigate to login page
    await page.goto('http://localhost:5173/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/01-login-page-initial.png',
      fullPage: true 
    });
    console.log('✓ Login page captured');

    // Select Buyer role
    console.log('Selecting Buyer role...');
    const buyerButton = page.locator('button:has-text("Buyer")').or(page.locator('[role="button"]:has-text("Buyer")')).first();
    await buyerButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/02-login-buyer-selected.png',
      fullPage: true 
    });
    console.log('✓ Buyer role selected');
    
    // Fill in phone number
    console.log('Filling credentials...');
    const phoneInput = page.locator('input[type="tel"]').or(page.locator('input[placeholder*="phone"]')).first();
    await phoneInput.click();
    await phoneInput.fill('+919900000104');
    await page.waitForTimeout(500);
    
    // Fill in password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/03-login-credentials-filled.png',
      fullPage: true 
    });
    console.log('✓ Credentials filled');
    
    // Click login button
    console.log('Clicking sign in button...');
    const signInButton = page.locator('button:has-text("Sign In")').or(page.locator('button:has-text("Sign in")').or(page.locator('button[type="submit"]'))).first();
    await signInButton.click();
    
    // Wait for navigation after login
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');
    
    const postLoginUrl = page.url();
    console.log('Post-login URL:', postLoginUrl);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/04-post-login.png',
      fullPage: true 
    });
    console.log('✓ Login completed');

    // Now navigate to each buyer dashboard page
    console.log('\n=== Auditing Marketplace Dashboard ===');
    await page.goto('http://localhost:5173/marketplace/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Desktop full page
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/05-dashboard-desktop-top.png',
      fullPage: false 
    });
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/06-dashboard-desktop-full.png',
      fullPage: true 
    });
    console.log('✓ Dashboard desktop captured');
    
    // Scroll down to capture middle and bottom sections
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/07-dashboard-desktop-middle.png',
      fullPage: false 
    });
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/08-dashboard-desktop-bottom.png',
      fullPage: false 
    });
    
    // Reset scroll
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/09-dashboard-mobile.png',
      fullPage: true 
    });
    console.log('✓ Dashboard mobile');
    
    // Back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    // Browse page
    console.log('\n=== Auditing Browse Page ===');
    await page.goto('http://localhost:5173/marketplace/browse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/10-browse-desktop-top.png',
      fullPage: false 
    });
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/11-browse-desktop-full.png',
      fullPage: true 
    });
    console.log('✓ Browse desktop captured');
    
    // Try to interact with search if visible
    try {
      const searchInput = page.locator('input[type="search"]').or(page.locator('input[placeholder*="Search"]').or(page.locator('input[placeholder*="search"]'))).first();
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill('tomato');
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: 'screenshots/buyer-audit-2/12-browse-with-search.png',
          fullPage: true 
        });
        console.log('✓ Browse with search interaction');
      }
    } catch (e) {
      console.log('No search input found or not visible');
    }
    
    // Try to interact with filters if visible
    try {
      const filterButtons = page.locator('button:has-text("Filter")').or(page.locator('button:has-text("filter")')).first();
      if (await filterButtons.isVisible({ timeout: 2000 })) {
        await filterButtons.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: 'screenshots/buyer-audit-2/13-browse-with-filters.png',
          fullPage: true 
        });
        console.log('✓ Browse with filters opened');
      }
    } catch (e) {
      console.log('No filter button found or not visible');
    }
    
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/14-browse-mobile.png',
      fullPage: true 
    });
    console.log('✓ Browse mobile');
    
    // Back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    // Orders page
    console.log('\n=== Auditing Orders Page ===');
    await page.goto('http://localhost:5173/marketplace/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/15-orders-desktop-top.png',
      fullPage: false 
    });
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/16-orders-desktop-full.png',
      fullPage: true 
    });
    console.log('✓ Orders desktop captured');
    
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/17-orders-mobile.png',
      fullPage: true 
    });
    console.log('✓ Orders mobile');
    
    // Back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    // Profile page
    console.log('\n=== Auditing Profile Page ===');
    await page.goto('http://localhost:5173/marketplace/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/18-profile-desktop-top.png',
      fullPage: false 
    });
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/19-profile-desktop-full.png',
      fullPage: true 
    });
    console.log('✓ Profile desktop captured');
    
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/20-profile-mobile.png',
      fullPage: true 
    });
    console.log('✓ Profile mobile');

    console.log('\n✅ Audit complete! All screenshots saved to screenshots/buyer-audit-2/');

  } catch (error) {
    console.error('Error during audit:', error);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/error-screenshot.png',
      fullPage: true 
    });
    throw error;
  } finally {
    await browser.close();
  }
}

audit();
