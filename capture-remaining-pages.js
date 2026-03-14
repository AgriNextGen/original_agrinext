import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.join(__dirname, 'agent-screenshots');

async function captureWithRetry(page, url, filename, description, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n📍 ${description} (Attempt ${attempt}/${maxRetries})`);
      
      // Navigate with shorter timeout and less strict wait condition
      await page.goto(url, { 
        waitUntil: 'load',
        timeout: 10000 
      });
      
      // Wait a bit for content to render
      await page.waitForTimeout(2000);
      
      console.log(`📸 Taking screenshot: ${filename}`);
      await page.screenshot({ 
        path: path.join(screenshotsDir, filename),
        fullPage: true 
      });
      
      console.log(`✅ Success!`);
      return true;
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        // Last attempt - save error screenshot
        try {
          await page.screenshot({ 
            path: path.join(screenshotsDir, `error-${filename}`),
            fullPage: true 
          });
          console.log(`📸 Saved error screenshot: error-${filename}`);
        } catch (e) {}
        return false;
      }
      
      // Wait before retry
      await page.waitForTimeout(2000);
    }
  }
  return false;
}

(async () => {
  console.log('🚀 Capturing Remaining Agent Pages...\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    // Login
    console.log('📍 Logging in...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1000);
    
    await page.locator('button:has-text("Agent")').first().click();
    await page.waitForTimeout(200);
    
    await page.locator('input[type="tel"]').first().fill('9900000102');
    await page.waitForTimeout(200);
    
    await page.locator('input[type="password"]').first().fill('Dummy@12345');
    await page.waitForTimeout(200);
    
    await page.locator('button:has-text("Sign In")').first().click();
    
    // Wait for dashboard - use a more lenient wait
    try {
      await page.waitForURL('**/agent/**', { timeout: 8000 });
    } catch (e) {
      console.log('⚠️ URL wait timeout, checking if we landed on dashboard...');
    }
    
    await page.waitForTimeout(2000);
    console.log('✅ Logged in!\n');

    // Capture pages
    const pages = [
      { url: 'http://localhost:5173/agent/farmers', filename: '07-agent-farmers.png', desc: 'Farmers & Crops' },
      { url: 'http://localhost:5173/agent/transport', filename: '08-agent-transport.png', desc: 'Transport' },
      { url: 'http://localhost:5173/agent/service-area', filename: '09-agent-service-area.png', desc: 'Service Area' },
      { url: 'http://localhost:5173/agent/profile', filename: '10-agent-profile.png', desc: 'Profile' },
    ];

    for (const pageInfo of pages) {
      await captureWithRetry(page, pageInfo.url, pageInfo.filename, pageInfo.desc);
      await page.waitForTimeout(1000);
    }

    // Mobile view
    console.log('\n📍 Switching to mobile view (375px)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    
    await captureWithRetry(
      page,
      'http://localhost:5173/agent/dashboard',
      '11-agent-dashboard-mobile.png',
      'Mobile Dashboard'
    );

    // Try mobile menu
    try {
      console.log('\n📍 Looking for mobile menu button...');
      const menuButton = page.locator('button').filter({ hasText: '' }).first();
      
      if (await menuButton.isVisible({ timeout: 2000 })) {
        await menuButton.click();
        await page.waitForTimeout(1000);
        
        console.log('📸 Taking screenshot: 11b-agent-mobile-menu.png');
        await page.screenshot({ 
          path: path.join(screenshotsDir, '11b-agent-mobile-menu.png'),
          fullPage: true 
        });
      }
    } catch (e) {
      console.log('⚠️ Could not capture mobile menu');
    }

    // Back to desktop
    console.log('\n📍 Switching back to desktop...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    await page.goto('http://localhost:5173/agent/dashboard', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(1500);

    // Try notifications
    try {
      console.log('\n📍 Looking for notification bell...');
      const bell = page.locator('button[aria-label*="notification" i], button:has([data-lucide="bell"])').first();
      
      if (await bell.isVisible({ timeout: 2000 })) {
        await bell.click();
        await page.waitForTimeout(1000);
        
        console.log('📸 Taking screenshot: 12-agent-notifications.png');
        await page.screenshot({ 
          path: path.join(screenshotsDir, '12-agent-notifications.png'),
          fullPage: false 
        });
      }
    } catch (e) {
      console.log('⚠️ Could not capture notifications');
    }

    console.log('\n✅ Capture complete!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await browser.close();
    console.log('✨ Done!');
  }
})();
