import { chromium } from 'playwright';

async function testLogisticsTripsSimple() {
  console.log('🚀 Testing Logistics Trips Page (Simple Version)...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  try {
    // Login
    console.log('1. Going to login...');
    await page.goto('http://localhost:5173/login', { timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    console.log('2. Selecting Logistics...');
    await page.click('button:has-text("Logistics")');
    await page.waitForTimeout(1000);
    
    console.log('3. Entering credentials...');
    await page.fill('input[type="tel"]', '9900000103');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await page.waitForTimeout(1000);
    
    console.log('4. Signing in...');
    await page.click('button:has-text("Sign In")');
    
    console.log('5. Waiting for dashboard...');
    await page.waitForURL('**/logistics/dashboard', { timeout: 20000 });
    await page.waitForTimeout(3000);
    console.log('✅ Logged in successfully\n');
    
    // Navigate to trips
    console.log('6. Navigating to /logistics/trips...');
    await page.goto('http://localhost:5175/logistics/trips');
    await page.waitForLoadState('domcontentloaded');
    
    console.log('7. Waiting 15 seconds...');
    await page.waitForTimeout(15000);
    
    console.log('8. Analyzing page...\n');
    
    const url = page.url();
    const title = await page.title();
    console.log(`   URL: ${url}`);
    console.log(`   Title: ${title}`);
    
    // Check for errors
    const errorText = await page.locator('text=/something went wrong/i').count();
    console.log(`   Error messages: ${errorText > 0 ? '❌ YES' : '✅ NO'}`);
    
    // Check for content
    const hasContent = await page.locator('body').textContent();
    const contentLength = hasContent?.length || 0;
    console.log(`   Content length: ${contentLength} characters`);
    
    // Take screenshot
    console.log('\n9. Taking screenshot...');
    try {
      await page.screenshot({ 
        path: 'test-logistics-trips-final.png', 
        fullPage: true,
        timeout: 10000 
      });
      console.log('✅ Screenshot saved: test-logistics-trips-final.png');
    } catch (err) {
      console.log('⚠️  Screenshot failed:', err.message);
    }
    
    console.log('\n' + '='.repeat(60));
    if (errorText > 0) {
      console.log('❌ RESULT: PAGE STILL SHOWS ERROR');
    } else {
      console.log('✅ RESULT: NO ERROR DETECTED - PAGE LOADS');
    }
    console.log('='.repeat(60) + '\n');
    
    // Test loads page
    console.log('10. Testing /logistics/loads...');
    await page.goto('http://localhost:5175/logistics/loads');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    
    const loadsError = await page.locator('text=/something went wrong/i').count();
    console.log(`   Loads page error: ${loadsError > 0 ? '❌ YES' : '✅ NO'}`);
    
    try {
      await page.screenshot({ 
        path: 'test-logistics-loads-final.png', 
        fullPage: true,
        timeout: 10000 
      });
      console.log('✅ Screenshot saved: test-logistics-loads-final.png\n');
    } catch (err) {
      console.log('⚠️  Loads screenshot failed:', err.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    try {
      await page.screenshot({ path: 'test-logistics-error-final.png' });
    } catch {}
  } finally {
    console.log('\n✅ Test complete. Closing browser...');
    await browser.close();
  }
}

testLogisticsTripsSimple().catch(console.error);
