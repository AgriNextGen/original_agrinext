import { chromium } from '@playwright/test';
import fs from 'fs';

async function testLogisticsPages() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Capture console logs and errors
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', err => {
    const errorText = `[PAGE ERROR] ${err.message}\n${err.stack}`;
    errors.push(errorText);
    console.error(errorText);
  });

  try {
    console.log('\n=== STEP 1: Login as LOGISTICS ===');
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    console.log('✓ Login page loaded');

    // Click Logistics role button
    await page.click('button:has-text("Logistics")');
    await page.waitForTimeout(1000);

    // Enter credentials
    await page.fill('input[type="tel"]', '9900000103');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await page.waitForTimeout(500);
    console.log('✓ Credentials filled');

    // Click Sign In
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    console.log('✓ Login completed, current URL:', page.url());

    // Clear previous errors
    errors.length = 0;
    consoleMessages.length = 0;

    console.log('\n=== STEP 2: Navigate to /logistics/trips ===');
    try {
      await page.goto('http://localhost:5173/logistics/trips', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
    } catch (e) {
      console.log('⚠ Page navigation error:', e.message);
    }
    
    console.log('Waiting 10 seconds for any content to render...');
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: 'logistics-test-trips-page.png', fullPage: true });
    console.log('✓ Trips page screenshot taken');
    
    // Analyze the page
    const url = page.url();
    const title = await page.title();
    const bodyText = await page.locator('body').textContent();
    const hasErrorText = bodyText.includes('TypeError') || 
                         bodyText.includes('Cannot read properties') ||
                         bodyText.includes('Something went wrong') ||
                         bodyText.includes('Error');
    
    console.log('\nTRIPS PAGE ANALYSIS:');
    console.log('  URL:', url);
    console.log('  Title:', title);
    console.log('  Has error text visible:', hasErrorText);
    console.log('  Console errors count:', errors.length);
    
    if (errors.length > 0) {
      console.log('\n  Console/Page Errors:');
      errors.forEach((err, i) => console.log(`    ${i + 1}. ${err}`));
    }

    // Save detailed error log
    fs.writeFileSync('logistics-trips-errors.txt', errors.join('\n\n'));

    // Clear errors again
    errors.length = 0;

    console.log('\n=== STEP 3: Navigate to /logistics/loads ===');
    try {
      await page.goto('http://localhost:5173/logistics/loads', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
    } catch (e) {
      console.log('⚠ Page navigation error:', e.message);
    }
    
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'logistics-test-loads-page.png', fullPage: true });
    console.log('✓ Loads page screenshot taken');
    console.log('  URL:', page.url());
    console.log('  Console errors count:', errors.length);

    if (errors.length > 0) {
      console.log('\n  Console/Page Errors:');
      errors.forEach((err, i) => console.log(`    ${i + 1}. ${err}`));
    }

    fs.writeFileSync('logistics-loads-errors.txt', errors.join('\n\n'));
    errors.length = 0;

    console.log('\n=== STEP 4: Navigate to /logistics/dashboard ===');
    await page.goto('http://localhost:5173/logistics/dashboard', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'logistics-test-dashboard-page.png', fullPage: true });
    console.log('✓ Dashboard page screenshot taken');
    console.log('  URL:', page.url());
    console.log('  Console errors count:', errors.length);

    if (errors.length > 0) {
      console.log('\n  Console/Page Errors:');
      errors.forEach((err, i) => console.log(`    ${i + 1}. ${err}`));
    }

    fs.writeFileSync('logistics-dashboard-errors.txt', errors.join('\n\n'));

    console.log('\n=== TEST SUMMARY ===');
    console.log('✓ All navigation attempts completed');
    console.log('✓ Screenshots saved');
    console.log('✓ Error logs saved');

  } catch (error) {
    console.error('\n❌ FATAL ERROR during test:', error.message);
    await page.screenshot({ path: 'logistics-test-fatal-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testLogisticsPages().catch(console.error);
