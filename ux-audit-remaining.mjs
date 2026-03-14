import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const PHONE = '9888880101';
const PASSWORD = 'SmokeTest@99';

async function capturePageScreenshots(page, baseName, description) {
  console.log(`\n📸 Capturing: ${description}`);
  
  try {
    await page.waitForTimeout(3000);
    
    // Full page
    const fullPath = join(__dirname, `${baseName}-full.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`   ✓ Full page: ${fullPath}`);
    
    // Top view
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const topPath = join(__dirname, `${baseName}-top.png`);
    await page.screenshot({ path: topPath, fullPage: false });
    console.log(`   ✓ Top view: ${topPath}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Capturing Remaining AgriNext Pages');
  console.log('======================================\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  
  try {
    // Login first
    console.log('=== Logging in ===');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const farmerBtn = page.locator('button:has-text("Farmer")').first();
    await farmerBtn.click();
    await page.waitForTimeout(500);
    
    await page.locator('input[type="tel"]').first().fill(PHONE);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    
    await page.waitForTimeout(4000);
    console.log('   ✓ Logged in');
    
    // Capture remaining pages
    const pages = [
      { url: '/farmer/crops', name: 'ux-audit-08-farmer-crops', desc: 'Crops Page' },
      { url: '/farmer/farmlands', name: 'ux-audit-09-farmer-farmlands', desc: 'Farmlands Page' },
      { url: '/farmer/transport', name: 'ux-audit-10-farmer-transport', desc: 'Transport Page' },
      { url: '/farmer/listings', name: 'ux-audit-11-farmer-listings', desc: 'Listings Page' },
      { url: '/farmer/orders', name: 'ux-audit-12-farmer-orders', desc: 'Orders Page' },
      { url: '/farmer/earnings', name: 'ux-audit-13-farmer-earnings', desc: 'Earnings Page' },
      { url: '/farmer/notifications', name: 'ux-audit-14-farmer-notifications', desc: 'Notifications Page' },
      { url: '/farmer/settings', name: 'ux-audit-15-farmer-settings', desc: 'Settings Page' },
    ];
    
    for (const pageInfo of pages) {
      console.log(`\n=== ${pageInfo.desc} ===`);
      try {
        await page.goto(`${BASE_URL}${pageInfo.url}`, { 
          waitUntil: 'domcontentloaded', 
          timeout: 10000 
        });
        await capturePageScreenshots(page, pageInfo.name, pageInfo.desc);
      } catch (error) {
        console.log(`   ⚠️  Navigation failed: ${error.message}`);
        // Try to capture anyway
        await capturePageScreenshots(page, pageInfo.name, pageInfo.desc);
      }
    }
    
    // Mobile view
    console.log('\n=== Mobile Dashboard ===');
    await context.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/farmer/dashboard`, { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    await page.waitForTimeout(3000);
    
    const mobilePath = join(__dirname, 'ux-audit-16-mobile-dashboard.png');
    await page.screenshot({ path: mobilePath, fullPage: true });
    console.log(`   ✓ Mobile dashboard: ${mobilePath}`);
    
    // Try to open menu
    try {
      const menuBtn = page.locator('button[aria-label*="menu"], button:has-text("☰")').first();
      if (await menuBtn.isVisible({ timeout: 2000 })) {
        await menuBtn.click();
        await page.waitForTimeout(1000);
        const menuPath = join(__dirname, 'ux-audit-17-mobile-menu.png');
        await page.screenshot({ path: menuPath, fullPage: true });
        console.log(`   ✓ Mobile menu: ${menuPath}`);
      }
    } catch (e) {
      console.log('   ⚠️  Menu button not found');
    }
    
    console.log('\n✅ Capture complete!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
