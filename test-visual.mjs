import puppeteer from 'puppeteer';
import { setTimeout } from 'timers/promises';

const BASE_URL = 'http://localhost:5173';

async function captureScreenshot(page, name, url) {
  console.log(`\n📸 Capturing: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Wait a bit for React to render
    await setTimeout(2000);
    
    // Capture screenshot
    const screenshotPath = `screenshot-${name.toLowerCase().replace(/\s+/g, '-')}.png`;
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`   ✅ Screenshot saved: ${screenshotPath}`);
    
    // Check for errors in console
    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    
    // Get page title
    const title = await page.title();
    console.log(`   📄 Page title: ${title}`);
    
    // Check for error indicators
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    const hasError = /error boundary|something went wrong/i.test(bodyHTML);
    
    if (hasError) {
      console.log('   ❌ ERROR: Found error boundary in page');
      return false;
    } else {
      console.log('   ✅ No error boundary detected');
    }
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

(async () => {
  console.log('🧪 AgriNext Visual Test - Post-Fix Verification\n');
  console.log('Launching headless browser...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  // Capture console logs
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });
  
  // Capture errors
  page.on('pageerror', error => {
    console.log(`   ❌ Page Error: ${error.message}`);
  });
  
  // Test root page
  await captureScreenshot(page, 'Root Page', `${BASE_URL}/`);
  
  // Test login page
  await captureScreenshot(page, 'Login Page', `${BASE_URL}/login`);
  
  // Print console messages
  if (consoleMessages.length > 0) {
    console.log('\n📋 Console Messages:');
    consoleMessages.forEach(msg => {
      const icon = msg.type === 'error' ? '❌' : msg.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`   ${icon} [${msg.type}] ${msg.text}`);
    });
  } else {
    console.log('\n✅ No console messages (no errors or warnings)');
  }
  
  await browser.close();
  
  console.log('\n✅ Test complete! Check the screenshot files.');
})();
