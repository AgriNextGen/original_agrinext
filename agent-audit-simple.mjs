import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const AGENT_PHONE = '9900000102';
const AGENT_PASSWORD = 'Dummy@12345';
const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = 'agent-audit';

mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureFullPage(page, filename, description) {
  console.log(`\n📸 ${description}`);
  const screenshotPath = join(OUTPUT_DIR, filename);
  await sleep(1500);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`   ✓ ${filename}`);
  return screenshotPath;
}

async function main() {
  console.log('🚀 Starting Agent Dashboard Visual Audit...\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  // Set longer timeout
  page.setDefaultTimeout(60000);

  try {
    // ========== STEP 1: LOGIN ==========
    console.log('\n════════════════════════════');
    console.log('STEP 1: LOGIN');
    console.log('════════════════════════════');
    
    console.log('→ Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    await captureFullPage(page, '01-login-initial.png', 'Login page initial');
    
    console.log('→ Selecting Agent role...');
    await page.click('button:has-text("Agent")');
    await sleep(800);
    
    console.log('→ Filling credentials...');
    await page.fill('input[type="tel"]', AGENT_PHONE);
    await sleep(500);
    await page.fill('input[type="password"]', AGENT_PASSWORD);
    await sleep(800);
    await captureFullPage(page, '02-login-filled.png', 'Login form filled');
    
    console.log('→ Signing in...');
    await page.click('button:has-text("Sign In")');
    await sleep(8000); // Wait longer for auth
    await captureFullPage(page, '03-after-login.png', 'After login');
    
    console.log(`   Current URL: ${page.url()}`);

    // ========== STEP 2: DASHBOARD ==========
    console.log('\n════════════════════════════');
    console.log('STEP 2: DASHBOARD');
    console.log('════════════════════════════');
    
    await page.goto(`${BASE_URL}/agent/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
    await captureFullPage(page, '04-dashboard-full.png', 'Dashboard full page');

    // ========== STEP 3: TODAY ==========
    console.log('\n════════════════════════════');
    console.log('STEP 3: TODAY');
    console.log('════════════════════════════');
    
    await page.goto(`${BASE_URL}/agent/today`, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await captureFullPage(page, '06-today-full.png', 'Today page');

    // ========== STEP 4: TASKS ==========
    console.log('\n════════════════════════════');
    console.log('STEP 4: TASKS');
    console.log('════════════════════════════');
    
    await page.goto(`${BASE_URL}/agent/tasks`, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await captureFullPage(page, '07-tasks-full.png', 'Tasks page');
    
    // Try Create Task button
    try {
      const btn = page.locator('button:has-text("New Task"), button:has-text("Create")').first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click();
        await sleep(1500);
        await captureFullPage(page, '08-create-task-dialog.png', 'Create task dialog');
        await page.keyboard.press('Escape');
        await sleep(500);
      }
    } catch (e) { console.log('   No create button found'); }

    // ========== STEP 5: MY FARMERS ==========
    console.log('\n════════════════════════════');
    console.log('STEP 5: MY FARMERS');
    console.log('════════════════════════════');
    
    await page.goto(`${BASE_URL}/agent/my-farmers`, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await captureFullPage(page, '09-my-farmers-full.png', 'My Farmers page');

    // ========== STEP 6: FARMERS & CROPS ==========
    console.log('\n════════════════════════════');
    console.log('STEP 6: FARMERS & CROPS');
    console.log('════════════════════════════');
    
    await page.goto(`${BASE_URL}/agent/farmers`, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await captureFullPage(page, '10-farmers-crops-full.png', 'Farmers & Crops page');

    console.log('\n✅ Audit complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: join(OUTPUT_DIR, 'error.png') });
  } finally {
    await browser.close();
  }
}

main();
