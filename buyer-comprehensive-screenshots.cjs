const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🎯 AgriNext Buyer Flow - Comprehensive Screenshots\n');
  console.log('Launching Chromium browser...\n');
  
  const browser = await playwright.chromium.launch({ 
    headless: true
  });
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  // Monitor network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('login-by-phone')) {
      networkRequests.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('login-by-phone')) {
      try {
        const body = await response.text();
        networkRequests.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          body: body.substring(0, 500),
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        networkRequests.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          error: 'Could not read body',
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  // Create output directory
  const outputDir = 'buyer-comprehensive-screenshots';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  
  // Collect page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });
  
  try {
    // Step 1: Navigate to login page
    console.log('📸 Step 1: Loading login page at http://localhost:5173/login');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Step 2: Take initial desktop screenshot
    console.log('📸 Step 2: Taking initial desktop screenshot (1920x1080)');
    await page.screenshot({ 
      path: path.join(outputDir, '01-login-initial-desktop.png'), 
      fullPage: true 
    });
    console.log('   ✅ Saved: 01-login-initial-desktop.png\n');
    
    // Step 3: Click Buyer role button
    console.log('📸 Step 3: Clicking Buyer role button');
    try {
      // Try multiple selectors for the Buyer button
      const buyerButton = await page.locator('button:has-text("Buyer"), button:has-text("buyer"), [role="button"]:has-text("Buyer")').first();
      await buyerButton.click();
      await page.waitForTimeout(1000);
      console.log('   ✅ Buyer role selected\n');
    } catch (error) {
      console.log('   ⚠️  Could not find Buyer button, trying alternative selector...');
      await page.click('text=Buyer');
      await page.waitForTimeout(1000);
    }
    
    // Step 4: Fill phone field
    console.log('📸 Step 4: Filling phone number: 9900000104');
    const phoneInput = await page.locator('input[type="tel"], input[name="phone"], input[placeholder*="phone" i]').first();
    await phoneInput.fill('9900000104');
    await page.waitForTimeout(500);
    console.log('   ✅ Phone filled\n');
    
    // Step 5: Fill password field
    console.log('📸 Step 5: Filling password: Dummy@12345');
    const passwordInput = await page.locator('input[type="password"]').first();
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(500);
    console.log('   ✅ Password filled\n');
    
    // Step 6: Take screenshot of filled form
    console.log('📸 Step 6: Taking screenshot of filled form');
    await page.screenshot({ 
      path: path.join(outputDir, '02-login-filled-form.png'), 
      fullPage: true 
    });
    console.log('   ✅ Saved: 02-login-filled-form.png\n');
    
    // Step 7: Click Sign In button
    console.log('📸 Step 7: Clicking Sign In button');
    try {
      const signInButton = await page.locator('button:has-text("Sign In"), button:has-text("sign in"), button[type="submit"]').first();
      await signInButton.click();
      console.log('   ✅ Sign In clicked\n');
    } catch (error) {
      console.log('   ⚠️  Could not find Sign In button, trying alternative...');
      await page.click('button[type="submit"]');
    }
    
    // Step 8: Wait for navigation or timeout
    console.log('⏳ Step 8: Waiting up to 30 seconds for Edge Function to process login and redirect...');
    try {
      await page.waitForURL('**/marketplace/**', { timeout: 30000 });
      console.log('   ✅ Successfully redirected to marketplace dashboard!\n');
    } catch (error) {
      console.log('   ⚠️  Navigation timeout - checking current state...\n');
      
      // Wait a bit more and check for error messages
      await page.waitForTimeout(5000);
      
      // Check for error messages
      const errorText = await page.locator('text=/error|invalid|failed/i').first().textContent().catch(() => null);
      if (errorText) {
        console.log(`   ⚠️  Error message found: ${errorText}\n`);
      }
    }
    
    // Step 9: Take screenshot after login attempt
    console.log('📸 Step 9: Taking screenshot after login attempt');
    await page.screenshot({ 
      path: path.join(outputDir, '03-after-login.png'), 
      fullPage: true 
    });
    console.log('   ✅ Saved: 03-after-login.png\n');
    
    const currentUrl = page.url();
    console.log(`   📍 Current URL: ${currentUrl}\n`);
    
    // If we're on dashboard, continue with dashboard screenshots
    if (currentUrl.includes('/marketplace')) {
      console.log('✅ Successfully logged in to Buyer Dashboard!\n');
      
      // Step 10: Dashboard full page screenshot
      console.log('📸 Step 10: Taking full dashboard screenshot');
      await page.waitForTimeout(3000); // Wait for data to load
      await page.screenshot({ 
        path: path.join(outputDir, '04-dashboard-full-page.png'), 
        fullPage: true 
      });
      console.log('   ✅ Saved: 04-dashboard-full-page.png\n');
      
      // Step 11: Navigate to Browse
      console.log('📸 Step 11: Navigating to Browse page');
      await page.goto('http://localhost:5173/marketplace/browse', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: path.join(outputDir, '05-browse-page.png'), 
        fullPage: true 
      });
      console.log('   ✅ Saved: 05-browse-page.png\n');
      
      // Step 12: Navigate to Orders
      console.log('📸 Step 12: Navigating to Orders page');
      await page.goto('http://localhost:5173/marketplace/orders', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: path.join(outputDir, '06-orders-page.png'), 
        fullPage: true 
      });
      console.log('   ✅ Saved: 06-orders-page.png\n');
      
      // Step 13: Navigate to Profile
      console.log('📸 Step 13: Navigating to Profile page');
      await page.goto('http://localhost:5173/marketplace/profile', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      await page.screenshot({ 
        path: path.join(outputDir, '07-profile-page.png'), 
        fullPage: true 
      });
      console.log('   ✅ Saved: 07-profile-page.png\n');
      
    } else {
      console.log('⚠️  Not on dashboard after login. May need to check login credentials or wait longer.\n');
      console.log(`   Current URL: ${currentUrl}\n`);
    }
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    await page.screenshot({ 
      path: path.join(outputDir, 'error-screenshot.png'), 
      fullPage: true 
    });
    console.log('   📸 Error screenshot saved: error-screenshot.png');
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Report network requests
  if (networkRequests.length > 0) {
    console.log('\n🌐 Network Requests (login-by-phone):');
    networkRequests.forEach(req => {
      console.log(`   [${req.timestamp}] ${req.type}: ${req.status || req.method}`);
      if (req.body) {
        console.log(`   Body: ${req.body}`);
      }
    });
  } else {
    console.log('\n⚠️  No login-by-phone network requests captured');
  }
  
  // Report console messages
  if (consoleMessages.length > 0) {
    console.log('\n📋 Browser Console Messages:');
    consoleMessages.slice(-20).forEach(msg => {
      const icon = msg.type === 'error' ? '❌' : msg.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} [${msg.type}] ${msg.text}`);
    });
  }
  
  // Report page errors
  if (pageErrors.length > 0) {
    console.log('\n❌ JavaScript Errors:');
    pageErrors.forEach(err => {
      console.log(`   ❌ ${err}`);
    });
  } else {
    console.log('\n✅ No JavaScript errors detected');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Comprehensive screenshot capture complete!');
  console.log(`   All screenshots saved in: ${outputDir}/`);
  console.log('   - 01-login-initial-desktop.png');
  console.log('   - 02-login-filled-form.png');
  console.log('   - 03-after-login.png');
  console.log('   - 04-dashboard-full-page.png');
  console.log('   - 05-browse-page.png');
  console.log('   - 06-orders-page.png');
  console.log('   - 07-profile-page.png');
  
  await browser.close();
  
  // Now analyze each screenshot
  console.log('\n\n📊 ANALYZING SCREENSHOTS...\n');
  console.log('Opening screenshots for detailed analysis...\n');
  
})();
