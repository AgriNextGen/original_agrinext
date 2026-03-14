import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const AGENT_PHONE = '9900000102';
const AGENT_PASSWORD = 'Dummy@12345';
const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = 'agent-audit';

// Create output directory
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
} catch (err) {
  console.log(`Output directory exists: ${OUTPUT_DIR}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureFullPage(page, filename, description) {
  console.log(`\n📸 Capturing: ${description}`);
  const screenshotPath = join(OUTPUT_DIR, filename);
  
  // Wait for network to be mostly idle
  await sleep(2000);
  
  // Take full page screenshot
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  
  console.log(`   ✓ Saved: ${screenshotPath}`);
  return screenshotPath;
}

async function main() {
  console.log('🚀 Starting Agent Dashboard Visual Audit...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    // ========== STEP 1: LOGIN ==========
    console.log('\n═══════════════════════════════════');
    console.log('   STEP 1: LOGIN');
    console.log('═══════════════════════════════════');
    
    console.log('→ Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await sleep(1000);
    
    await captureFullPage(page, '01-login-initial.png', 'Login page initial state');
    
    console.log('→ Selecting Agent role...');
    // Click Agent button - try multiple selectors
    try {
      await page.click('button:has-text("Agent")');
    } catch (e) {
      await page.click('[data-role="agent"]');
    }
    await sleep(500);
    
    console.log('→ Filling phone number...');
    await page.fill('input[type="tel"], input[placeholder*="phone" i], input[name="phone"]', AGENT_PHONE);
    await sleep(300);
    
    console.log('→ Filling password...');
    await page.fill('input[type="password"]', AGENT_PASSWORD);
    await sleep(500);
    
    await captureFullPage(page, '02-login-filled.png', 'Login form filled with Agent selected');
    
    console.log('→ Clicking Sign In...');
    await page.click('button:has-text("Sign In"), button:has-text("Login")');
    
    console.log('→ Waiting for navigation (up to 30 seconds)...');
    try {
      await page.waitForURL(url => url.href.includes('/agent/'), { timeout: 30000 });
      console.log(`   ✓ Navigation successful: ${page.url()}`);
    } catch (e) {
      console.log(`   ⚠ Navigation timeout or still on login. Current URL: ${page.url()}`);
    }
    
    await sleep(2000);
    await captureFullPage(page, '03-after-login.png', 'Page after login attempt');

    // ========== STEP 2: AGENT DASHBOARD ==========
    console.log('\n═══════════════════════════════════');
    console.log('   STEP 2: AGENT DASHBOARD');
    console.log('═══════════════════════════════════');
    
    console.log('→ Navigating to /agent/dashboard...');
    await page.goto(`${BASE_URL}/agent/dashboard`, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(3000);
    
    await captureFullPage(page, '04-dashboard-full.png', 'Agent Dashboard - Full Page');
    
    // Check if scrollable and capture bottom
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    if (scrollHeight > viewportHeight * 1.2) {
      console.log('→ Page has more content, scrolling down...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1000);
      await captureFullPage(page, '05-dashboard-bottom.png', 'Agent Dashboard - Bottom Section');
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // ========== STEP 3: TODAY PAGE ==========
    console.log('\n═══════════════════════════════════');
    console.log('   STEP 3: TODAY PAGE');
    console.log('═══════════════════════════════════');
    
    console.log('→ Navigating to /agent/today...');
    await page.goto(`${BASE_URL}/agent/today`, { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    
    await captureFullPage(page, '06-today-full.png', 'Agent Today Page - Full');

    // ========== STEP 4: TASKS PAGE ==========
    console.log('\n═══════════════════════════════════');
    console.log('   STEP 4: TASKS PAGE');
    console.log('═══════════════════════════════════');
    
    console.log('→ Navigating to /agent/tasks...');
    await page.goto(`${BASE_URL}/agent/tasks`, { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    
    await captureFullPage(page, '07-tasks-full.png', 'Agent Tasks Page - Full');
    
    // Try to open Create Task dialog
    console.log('→ Looking for New/Create Task button...');
    try {
      const createButton = await page.locator('button:has-text("New Task"), button:has-text("Create Task"), button:has-text("Add Task")').first();
      if (await createButton.isVisible({ timeout: 2000 })) {
        console.log('   Found Create Task button, clicking...');
        await createButton.click();
        await sleep(1000);
        await captureFullPage(page, '08-create-task-dialog.png', 'Create Task Dialog');
        
        // Close dialog
        console.log('   Closing dialog...');
        await page.keyboard.press('Escape');
        await sleep(500);
      }
    } catch (e) {
      console.log('   No Create Task button found or not clickable');
    }

    // ========== STEP 5: MY FARMERS ==========
    console.log('\n═══════════════════════════════════');
    console.log('   STEP 5: MY FARMERS');
    console.log('═══════════════════════════════════');
    
    console.log('→ Navigating to /agent/my-farmers...');
    await page.goto(`${BASE_URL}/agent/my-farmers`, { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    
    await captureFullPage(page, '09-my-farmers-full.png', 'My Farmers Page - Full');

    // ========== STEP 6: FARMERS & CROPS ==========
    console.log('\n═══════════════════════════════════');
    console.log('   STEP 6: FARMERS & CROPS');
    console.log('═══════════════════════════════════');
    
    console.log('→ Navigating to /agent/farmers...');
    await page.goto(`${BASE_URL}/agent/farmers`, { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(2000);
    
    await captureFullPage(page, '10-farmers-crops-full.png', 'Farmers & Crops Page - Full');

    // ========== BONUS: Profile & Notifications ==========
    console.log('\n═══════════════════════════════════');
    console.log('   BONUS: ADDITIONAL PAGES');
    console.log('═══════════════════════════════════');
    
    // Profile
    try {
      console.log('→ Navigating to /agent/profile...');
      await page.goto(`${BASE_URL}/agent/profile`, { waitUntil: 'networkidle', timeout: 10000 });
      await sleep(2000);
      await captureFullPage(page, '11-profile-full.png', 'Agent Profile Page');
    } catch (e) {
      console.log('   Profile page not accessible');
    }

    // Mobile viewport test
    console.log('\n→ Testing mobile viewport (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/agent/dashboard`, { waitUntil: 'networkidle' });
    await sleep(2000);
    await captureFullPage(page, '12-dashboard-mobile.png', 'Dashboard - Mobile View');

    console.log('\n✅ Visual audit complete!');
    console.log(`\nScreenshots saved to: ${OUTPUT_DIR}/`);
    
    // Save console logs
    const logPath = join(OUTPUT_DIR, 'console-logs.txt');
    writeFileSync(logPath, consoleLogs.join('\n'));
    console.log(`Console logs saved to: ${logPath}`);

  } catch (error) {
    console.error('\n❌ Error during audit:', error.message);
    await page.screenshot({ path: join(OUTPUT_DIR, 'error-screenshot.png') });
    throw error;
  } finally {
    console.log('\n→ Closing browser...');
    await browser.close();
  }
}

main().catch(console.error);
