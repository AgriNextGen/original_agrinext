import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const screenshotsDir = './screenshots/landing-redesign';

async function captureScreenshots() {
  // Create screenshots directory
  await mkdir(screenshotsDir, { recursive: true });
  
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  try {
    console.log('📍 Step 1: Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    console.log('⏳ Step 2: Waiting 4 seconds for full load...');
    await page.waitForTimeout(4000);
    
    // Step 3: Navbar + Hero Section (top of page)
    console.log('📸 Step 3: Capturing Navbar + Hero Section...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: join(screenshotsDir, '01-hero-navbar.png'),
      fullPage: false
    });
    console.log('✅ Saved: 01-hero-navbar.png');
    
    // Step 4: Problem Section
    console.log('📸 Step 4: Scrolling to Problem Section...');
    await page.evaluate(() => {
      window.scrollTo(0, 900);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: join(screenshotsDir, '02-problem-section.png'),
      fullPage: false
    });
    console.log('✅ Saved: 02-problem-section.png');
    
    // Step 5: Platform/Features Section
    console.log('📸 Step 5: Scrolling to Platform/Features Section...');
    await page.evaluate(() => {
      window.scrollTo(0, 1800);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: join(screenshotsDir, '03-platform-section.png'),
      fullPage: false
    });
    console.log('✅ Saved: 03-platform-section.png');
    
    // Step 6: Test interactive tabs
    console.log('📸 Step 6: Testing platform feature tabs...');
    
    // Try to find and click different tab buttons
    const tabSelectors = [
      'button:has-text("AI")',
      'button:has-text("Logistics")',
      'button:has-text("Marketplace")',
      'button:has-text("Finance")'
    ];
    
    for (let i = 0; i < tabSelectors.length; i++) {
      try {
        const button = await page.locator(tabSelectors[i]).first();
        if (await button.isVisible()) {
          await button.click();
          await page.waitForTimeout(800);
          await page.screenshot({ 
            path: join(screenshotsDir, `03b-platform-tab-${i + 1}.png`),
            fullPage: false
          });
          console.log(`✅ Saved: 03b-platform-tab-${i + 1}.png (${tabSelectors[i]})`);
        }
      } catch (e) {
        console.log(`⚠️  Could not click tab: ${tabSelectors[i]}`);
      }
    }
    
    // Step 7: Roles Section
    console.log('📸 Step 7: Scrolling to Roles Section...');
    await page.evaluate(() => {
      window.scrollTo(0, 2700);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: join(screenshotsDir, '04-roles-section.png'),
      fullPage: false
    });
    console.log('✅ Saved: 04-roles-section.png');
    
    // Step 8: Workflow Section
    console.log('📸 Step 8: Scrolling to Workflow Section...');
    await page.evaluate(() => {
      window.scrollTo(0, 3600);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: join(screenshotsDir, '05-workflow-section.png'),
      fullPage: false
    });
    console.log('✅ Saved: 05-workflow-section.png');
    
    // Step 9: Trust Banner
    console.log('📸 Step 9: Scrolling to Trust Banner...');
    await page.evaluate(() => {
      window.scrollTo(0, 4500);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: join(screenshotsDir, '06-trust-banner.png'),
      fullPage: false
    });
    console.log('✅ Saved: 06-trust-banner.png');
    
    // Step 10: Impact Section
    console.log('📸 Step 10: Scrolling to Impact Section...');
    await page.evaluate(() => {
      window.scrollTo(0, 5400);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: join(screenshotsDir, '07-impact-section.png'),
      fullPage: false
    });
    console.log('✅ Saved: 07-impact-section.png');
    
    // Step 11: CTA Section
    console.log('📸 Step 11: Scrolling to CTA Section...');
    await page.evaluate(() => {
      window.scrollTo(0, 6300);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: join(screenshotsDir, '08-cta-section.png'),
      fullPage: false
    });
    console.log('✅ Saved: 08-cta-section.png');
    
    // Step 12: Footer
    console.log('📸 Step 12: Scrolling to Footer...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ 
      path: join(screenshotsDir, '09-footer.png'),
      fullPage: false
    });
    console.log('✅ Saved: 09-footer.png');
    
    // Bonus: Full page screenshot
    console.log('📸 Bonus: Capturing full page screenshot...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: join(screenshotsDir, '00-full-page.png'),
      fullPage: true
    });
    console.log('✅ Saved: 00-full-page.png');
    
    console.log('\n✨ All screenshots captured successfully!');
    console.log(`📁 Location: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    await page.screenshot({ 
      path: join(screenshotsDir, 'error-screenshot.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

captureScreenshots();
