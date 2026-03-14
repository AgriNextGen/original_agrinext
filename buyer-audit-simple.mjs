import { chromium } from 'playwright';

async function simpleAudit() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500  // Slow down operations
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  try {
    console.log('Opening login page...');
    await page.goto('http://localhost:5173/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 90000 
    });
    await page.waitForTimeout(4000);
    
    console.log('Taking login page screenshot...');
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step1-login-initial.png', fullPage: true });
    
    console.log('Selecting Buyer role...');
    await page.locator('button:has-text("Buyer")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step2-buyer-selected.png', fullPage: true });
    
    console.log('Filling phone...');
    const phoneInput = await page.locator('input[type="tel"]').first();
    await phoneInput.click();
    await phoneInput.fill('+919900000104');
    await page.waitForTimeout(1000);
    
    console.log('Filling password...');
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.click();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step3-credentials-filled.png', fullPage: true });
    
    console.log('Clicking Sign In...');
    await page.locator('button:has-text("Sign In")').click();
    
    // Wait longer for auth to complete
    console.log('Waiting for authentication (30 seconds)...');
    await page.waitForTimeout(30000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step4-after-login-attempt.png', fullPage: true });
    
    // Try to navigate to dashboard regardless
    console.log('\nNavigating to dashboard...');
    await page.goto('http://localhost:5173/marketplace/dashboard', { 
      waitUntil: 'domcontentloaded',
      timeout: 90000 
    });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step5-dashboard-desktop.png', fullPage: true });
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step6-dashboard-viewport.png' });
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step7-dashboard-mobile.png', fullPage: true });
    
    console.log('✓ Dashboard screenshots captured');
    
    // Browse page
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    console.log('\nNavigating to browse...');
    await page.goto('http://localhost:5173/marketplace/browse', { 
      waitUntil: 'domcontentloaded',
      timeout: 90000 
    });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step8-browse-desktop.png', fullPage: true });
    
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step9-browse-mobile.png', fullPage: true });
    
    console.log('✓ Browse screenshots captured');
    
    // Orders page
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    console.log('\nNavigating to orders...');
    await page.goto('http://localhost:5173/marketplace/orders', { 
      waitUntil: 'domcontentloaded',
      timeout: 90000 
    });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step10-orders-desktop.png', fullPage: true });
    
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step11-orders-mobile.png', fullPage: true });
    
    console.log('✓ Orders screenshots captured');
    
    // Profile page
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    console.log('\nNavigating to profile...');
    await page.goto('http://localhost:5173/marketplace/profile', { 
      waitUntil: 'domcontentloaded',
      timeout: 90000 
    });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step12-profile-desktop.png', fullPage: true });
    
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/buyer-audit-2/step13-profile-mobile.png', fullPage: true });
    
    console.log('✓ Profile screenshots captured');
    
    console.log('\n✅ All screenshots captured successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'screenshots/buyer-audit-2/final-error.png', fullPage: true });
  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

simpleAudit();
