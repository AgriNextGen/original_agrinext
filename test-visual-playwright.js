const playwright = require('playwright');

(async () => {
  console.log('🧪 AgriNext Visual Test - Post-Fix Verification\n');
  console.log('Launching Chromium browser...\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
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
  
  // Test 1: Root page
  console.log('📄 Test 1: Root Page (http://localhost:5173/)');
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for React to render
    
    const title = await page.title();
    console.log(`   ✅ Page loaded`);
    console.log(`   ✅ Title: ${title}`);
    
    // Check for error boundary
    const errorBoundary = await page.locator('text=/error boundary|something went wrong/i').count();
    if (errorBoundary > 0) {
      console.log('   ❌ ERROR: Found error boundary text on page');
    } else {
      console.log('   ✅ No error boundary detected');
    }
    
    // Check for root div
    const rootDiv = await page.locator('#root').count();
    if (rootDiv > 0) {
      console.log('   ✅ Found #root div');
    } else {
      console.log('   ❌ Missing #root div');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'output/playwright/screenshot-root-page.png', fullPage: true });
    console.log('   ✅ Screenshot saved: output/playwright/screenshot-root-page.png');
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  console.log('');
  
  // Test 2: Login page
  console.log('📄 Test 2: Login Page (http://localhost:5173/login)');
  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for React to render
    
    const title = await page.title();
    console.log(`   ✅ Page loaded`);
    console.log(`   ✅ Title: ${title}`);
    
    // Check for error boundary
    const errorBoundary = await page.locator('text=/error boundary|something went wrong/i').count();
    if (errorBoundary > 0) {
      console.log('   ❌ ERROR: Found error boundary text on page');
    } else {
      console.log('   ✅ No error boundary detected');
    }
    
    // Check for login form elements
    const phoneInput = await page.locator('input[type="tel"], input[placeholder*="phone" i]').count();
    const passwordInput = await page.locator('input[type="password"]').count();
    
    if (phoneInput > 0) {
      console.log('   ✅ Found phone input field');
    } else {
      console.log('   ⚠️  Phone input field not found');
    }
    
    if (passwordInput > 0) {
      console.log('   ✅ Found password input field');
    } else {
      console.log('   ⚠️  Password input field not found');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'output/playwright/screenshot-login-page.png', fullPage: true });
    console.log('   ✅ Screenshot saved: output/playwright/screenshot-login-page.png');
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  
  // Report console messages
  if (consoleMessages.length > 0) {
    console.log('\n📋 Browser Console Messages:');
    consoleMessages.forEach(msg => {
      const icon = msg.type === 'error' ? '❌' : msg.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} [${msg.type}] ${msg.text}`);
    });
  } else {
    console.log('\n✅ No console messages captured');
  }
  
  // Report page errors
  if (pageErrors.length > 0) {
    console.log('\n❌ JavaScript Errors:');
    pageErrors.forEach(err => {
      console.log(`   ❌ ${err}`);
    });
  } else {
    console.log('✅ No JavaScript errors detected');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Visual testing complete!');
  console.log('   Screenshots saved in: output/playwright/');
  console.log('   - screenshot-root-page.png');
  console.log('   - screenshot-login-page.png');
  
  await browser.close();
})();
