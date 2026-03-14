#!/usr/bin/env node

import { chromium } from 'playwright';
import { join } from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = './screenshots/farmer-audit';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function debugLogin() {
  console.log('🔍 Debug Login Test\n');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
  page.on('pageerror', error => console.error('[ERROR]', error));
  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    if (url.includes('login-by-phone') || url.includes('supabase')) {
      console.log(`[API] ${status} ${url}`);
    }
  });

  try {
    console.log('Navigating to login...');
    await page.goto(`${BASE_URL}/login`);
    await sleep(2000);
    
    console.log('\nClicking Farmer role...');
    await page.click('button:has-text("Farmer")');
    await sleep(500);
    
    console.log('\nEntering credentials...');
    await page.fill('input[type="tel"]', '9888880101');
    await sleep(200);
    await page.fill('input[type="password"]', 'SmokeTest@99');
    await sleep(200);
    
    console.log('\nClicking Sign In...');
    await page.click('button:has-text("Sign In")');
    
    console.log('\nWaiting 15 seconds to see what happens...');
    await sleep(15000);
    
    const currentUrl = page.url();
    console.log(`\nFinal URL: ${currentUrl}`);
    
    // Check for error messages
    const alerts = await page.locator('[role="alert"]').all();
    if (alerts.length > 0) {
      console.log('\nError messages found:');
      for (const alert of alerts) {
        const text = await alert.innerText();
        console.log(`  - ${text}`);
      }
    }
    
    // Take final screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'debug-final.png'),
      fullPage: true
    });
    
    console.log('\nScreenshot saved: debug-final.png');
    console.log('\nPress Ctrl+C to close browser...');
    
    // Keep browser open for manual inspection
    await sleep(300000); // 5 minutes
    
  } catch (error) {
    console.error('\nError:', error);
  } finally {
    await browser.close();
  }
}

debugLogin();
