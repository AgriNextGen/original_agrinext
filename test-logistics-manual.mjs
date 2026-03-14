import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotsDir = join(__dirname, 'logistics-manual-test-screenshots');

async function testManualLogin() {
  console.log('Starting manual logistics test...');
  console.log('\n⚠️  MANUAL ACTION REQUIRED');
  console.log('The browser will open. Please:');
  console.log('1. Login manually as LOGISTICS (phone: 9900000103, password: Dummy@12345)');
  console.log('2. Wait for dashboard to load');
  console.log('3. Press Enter in this terminal to continue the test\n');
  
  // Create screenshots directory
  try {
    mkdirSync(screenshotsDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Collect console logs
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));

  try {
    // Navigate to login page
    console.log('Opening login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    console.log('\n✋ Please login now. Press Enter when you see the dashboard...');
    
    // Wait for user to login manually (wait for Enter key)
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    console.log('\n✓ Continuing with test...\n');
    await page.waitForTimeout(2000);
    
    // Save current state
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    await page.screenshot({ path: join(screenshotsDir, '00-current-page.png'), fullPage: true });

    // Test the three pages
    console.log('\n=== TESTING LOGISTICS PAGES ===\n');
    
    // Test 1: /logistics/loads
    console.log('--- Testing /logistics/loads ---');
    await page.goto('http://localhost:5173/logistics/loads', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Waiting 10 seconds for content to load...');
    await page.waitForTimeout(10000);
    
    const loadsUrl = page.url();
    const loadsTitle = await page.title();
    console.log(`URL: ${loadsUrl}`);
    console.log(`Title: ${loadsTitle}`);
    
    // Check for UI elements
    const loadsHasLoadingSpinner = await page.locator('[role="status"], .animate-spin').count() > 0;
    const loadsHasEmptyState = await page.locator(':text("No loads"), :text("No data"), :text("Empty")').count() > 0;
    const loadsHasError = await page.locator('[role="alert"], :text("Error"), :text("Failed")').count() > 0;
    const loadsHasDataTable = await page.locator('table, [role="table"]').count() > 0;
    const loadsHasCards = await page.locator('[class*="card"]').count() > 5;
    
    console.log(`  Loading spinner: ${loadsHasLoadingSpinner}`);
    console.log(`  Empty state: ${loadsHasEmptyState}`);
    console.log(`  Error message: ${loadsHasError}`);
    console.log(`  Data table: ${loadsHasDataTable}`);
    console.log(`  Has cards: ${loadsHasCards}`);
    
    // Capture visible text
    const loadsText = await page.locator('body').first().innerText();
    const loadsTextPreview = loadsText.slice(0, 500).replace(/\n+/g, ' | ');
    console.log(`  Page content preview: ${loadsTextPreview}...`);
    
    await page.screenshot({ path: join(screenshotsDir, '01-loads-page.png'), fullPage: true });
    console.log(`✓ Screenshot saved: 01-loads-page.png\n`);
    
    // Test 2: /logistics/trips
    console.log('--- Testing /logistics/trips ---');
    await page.goto('http://localhost:5173/logistics/trips', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Waiting 10 seconds for content to load...');
    await page.waitForTimeout(10000);
    
    const tripsUrl = page.url();
    const tripsTitle = await page.title();
    console.log(`URL: ${tripsUrl}`);
    console.log(`Title: ${tripsTitle}`);
    
    const tripsHasLoadingSpinner = await page.locator('[role="status"], .animate-spin').count() > 0;
    const tripsHasEmptyState = await page.locator(':text("No trips"), :text("No data"), :text("Empty")').count() > 0;
    const tripsHasError = await page.locator('[role="alert"], :text("Error"), :text("Failed")').count() > 0;
    const tripsHasDataTable = await page.locator('table, [role="table"]').count() > 0;
    const tripsHasCards = await page.locator('[class*="card"]').count() > 5;
    
    console.log(`  Loading spinner: ${tripsHasLoadingSpinner}`);
    console.log(`  Empty state: ${tripsHasEmptyState}`);
    console.log(`  Error message: ${tripsHasError}`);
    console.log(`  Data table: ${tripsHasDataTable}`);
    console.log(`  Has cards: ${tripsHasCards}`);
    
    const tripsText = await page.locator('body').first().innerText();
    const tripsTextPreview = tripsText.slice(0, 500).replace(/\n+/g, ' | ');
    console.log(`  Page content preview: ${tripsTextPreview}...`);
    
    await page.screenshot({ path: join(screenshotsDir, '02-trips-page.png'), fullPage: true });
    console.log(`✓ Screenshot saved: 02-trips-page.png\n`);
    
    // Test 3: /logistics/completed
    console.log('--- Testing /logistics/completed ---');
    await page.goto('http://localhost:5173/logistics/completed', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Waiting 5 seconds for content to load...');
    await page.waitForTimeout(5000);
    
    const completedUrl = page.url();
    const completedTitle = await page.title();
    console.log(`URL: ${completedUrl}`);
    console.log(`Title: ${completedTitle}`);
    
    const completedHasLoadingSpinner = await page.locator('[role="status"], .animate-spin').count() > 0;
    const completedHasEmptyState = await page.locator(':text("No trips"), :text("No data"), :text("Empty")').count() > 0;
    const completedHasError = await page.locator('[role="alert"], :text("Error"), :text("Failed")').count() > 0;
    const completedHasDataTable = await page.locator('table, [role="table"]').count() > 0;
    const completedHasCards = await page.locator('[class*="card"]').count() > 5;
    
    console.log(`  Loading spinner: ${completedHasLoadingSpinner}`);
    console.log(`  Empty state: ${completedHasEmptyState}`);
    console.log(`  Error message: ${completedHasError}`);
    console.log(`  Data table: ${completedHasDataTable}`);
    console.log(`  Has cards: ${completedHasCards}`);
    
    const completedText = await page.locator('body').first().innerText();
    const completedTextPreview = completedText.slice(0, 500).replace(/\n+/g, ' | ');
    console.log(`  Page content preview: ${completedTextPreview}...`);
    
    await page.screenshot({ path: join(screenshotsDir, '03-completed-page.png'), fullPage: true });
    console.log(`✓ Screenshot saved: 03-completed-page.png\n`);
    
    // Save logs
    writeFileSync(join(screenshotsDir, 'console-logs.txt'), logs.join('\n'));
    
    console.log('\n=== TEST COMPLETE ===');
    console.log(`Screenshots saved to: ${screenshotsDir}\n`);
    
    console.log('Press Enter to close browser...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: join(screenshotsDir, 'error-screenshot.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

testManualLogin().catch(console.error);
