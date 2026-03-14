import { chromium } from 'playwright';

async function captureAuthenticatedPages() {
  console.log('=== AgriNext Buyer Dashboard Audit (Manual Login) ===\n');
  console.log('Instructions:');
  console.log('1. A browser will open');
  console.log('2. Manually log in as a Buyer with:');
  console.log('   Phone: +919900000104');
  console.log('   Password: Dummy@12345');
  console.log('3. Wait until you see the dashboard, then press Enter in this terminal\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Open login page
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for user to manually log in
    console.log('Browser opened. Please log in manually...');
    console.log('Press Ctrl+C when done to continue with screenshots\n');
    
    // Wait 60 seconds for manual login
    await page.waitForTimeout(60000);
    
    console.log('\n=== Starting Audit ===\n');

    // Dashboard page
    console.log('Auditing: Marketplace Dashboard');
    await page.goto('http://localhost:5173/marketplace/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/dashboard-desktop-viewport.png' 
    });
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/dashboard-desktop-full.png',
      fullPage: true 
    });
    
    // Scroll captures
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.5));
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/dashboard-desktop-middle.png' 
    });
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/dashboard-desktop-bottom.png' 
    });
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/dashboard-mobile-full.png',
      fullPage: true 
    });
    
    console.log('  ✓ Dashboard screenshots captured');

    // Browse page
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    console.log('Auditing: Browse Page');
    await page.goto('http://localhost:5173/marketplace/browse', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/browse-desktop-viewport.png' 
    });
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/browse-desktop-full.png',
      fullPage: true 
    });
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/browse-mobile-full.png',
      fullPage: true 
    });
    
    console.log('  ✓ Browse screenshots captured');

    // Orders page
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    console.log('Auditing: Orders Page');
    await page.goto('http://localhost:5173/marketplace/orders', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/orders-desktop-viewport.png' 
    });
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/orders-desktop-full.png',
      fullPage: true 
    });
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/orders-mobile-full.png',
      fullPage: true 
    });
    
    console.log('  ✓ Orders screenshots captured');

    // Profile page
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    console.log('Auditing: Profile Page');
    await page.goto('http://localhost:5173/marketplace/profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/profile-desktop-viewport.png' 
    });
    
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/profile-desktop-full.png',
      fullPage: true 
    });
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/profile-mobile-full.png',
      fullPage: true 
    });
    
    console.log('  ✓ Profile screenshots captured');

    console.log('\n✅ Audit Complete!');
    console.log('Screenshots saved to: screenshots/buyer-audit-2/');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ 
      path: 'screenshots/buyer-audit-2/audit-error.png',
      fullPage: true 
    });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

captureAuthenticatedPages();
