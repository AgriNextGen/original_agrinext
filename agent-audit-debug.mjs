import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const AGENT_PHONE = '9900000102';
const AGENT_PASSWORD = 'Dummy@12345';
const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = 'agent-audit-debug';

mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Agent Dashboard Debug Audit\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
  });
  
  const page = await browser.newPage({ 
    viewport: { width: 1920, height: 1080 }
  });
  
  const logs = [];
  const errors = [];
  const networkLogs = [];
  
  page.on('console', msg => {
    const log = `[${msg.type()}] ${msg.text()}`;
    logs.push(log);
    console.log(log);
  });
  
  page.on('pageerror', err => {
    const error = `[PAGE ERROR] ${err.message}`;
    errors.push(error);
    console.error(error);
  });
  
  page.on('response', response => {
    if (response.url().includes('login-by-phone') || response.url().includes('supabase')) {
      networkLogs.push(`${response.status()} ${response.url()}`);
      console.log(`🌐 ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('→ Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { timeout: 60000 });
    await sleep(3000);
    await page.screenshot({ path: join(OUTPUT_DIR, '01-login-initial.png'), fullPage: true });
    
    console.log('→ Clicking Agent role button...');
    await page.click('button:has-text("Agent")');
    await sleep(1000);
    await page.screenshot({ path: join(OUTPUT_DIR, '02-agent-selected.png'), fullPage: true });
    
    console.log('→ Filling phone...');
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.fill(AGENT_PHONE);
    await sleep(500);
    
    console.log('→ Filling password...');
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(AGENT_PASSWORD);
    await sleep(1000);
    await page.screenshot({ path: join(OUTPUT_DIR, '03-credentials-filled.png'), fullPage: true });
    
    console.log('→ Clicking Sign In button...');
    await page.click('button:has-text("Sign In")');
    
    console.log('→ Waiting 10 seconds for auth...');
    await sleep(10000);
    await page.screenshot({ path: join(OUTPUT_DIR, '04-after-signin.png'), fullPage: true });
    
    console.log(`→ Current URL: ${page.url()}`);
    
    // Check if we're still on login or on dashboard
    if (page.url().includes('/login')) {
      console.log('⚠️  Still on login page - auth failed');
      
      // Check for error messages on the page
      const errorText = await page.locator('[role="alert"], .text-destructive, .text-red-500').allTextContents();
      if (errorText.length > 0) {
        console.log('Error messages on page:', errorText);
        errors.push(...errorText);
      }
    } else if (page.url().includes('/agent/')) {
      console.log('✅ Successfully navigated to agent dashboard!');
      
      // Wait for content to load
      await sleep(5000);
      await page.screenshot({ path: join(OUTPUT_DIR, '05-dashboard-loaded.png'), fullPage: true });
      
      // Navigate to other agent pages
      console.log('\n→ Testing agent/today...');
      await page.goto(`${BASE_URL}/agent/today`);
      await sleep(3000);
      await page.screenshot({ path: join(OUTPUT_DIR, '06-today-page.png'), fullPage: true });
      
      console.log('→ Testing agent/tasks...');
      await page.goto(`${BASE_URL}/agent/tasks`);
      await sleep(3000);
      await page.screenshot({ path: join(OUTPUT_DIR, '07-tasks-page.png'), fullPage: true });
      
      console.log('→ Testing agent/my-farmers...');
      await page.goto(`${BASE_URL}/agent/my-farmers`);
      await sleep(3000);
      await page.screenshot({ path: join(OUTPUT_DIR, '08-my-farmers-page.png'), fullPage: true });
      
      console.log('→ Testing agent/farmers...');
      await page.goto(`${BASE_URL}/agent/farmers`);
      await sleep(3000);
      await page.screenshot({ path: join(OUTPUT_DIR, '09-farmers-crops-page.png'), fullPage: true });
    }

    // Save logs
    writeFileSync(join(OUTPUT_DIR, 'console-logs.txt'), logs.join('\n'));
    writeFileSync(join(OUTPUT_DIR, 'errors.txt'), errors.join('\n'));
    writeFileSync(join(OUTPUT_DIR, 'network.txt'), networkLogs.join('\n'));
    
    console.log('\n✅ Debug audit complete');
    console.log(`Screenshots: ${OUTPUT_DIR}/`);
    console.log(`Console logs: ${logs.length} entries`);
    console.log(`Errors: ${errors.length} entries`);
    console.log(`Network logs: ${networkLogs.length} entries`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: join(OUTPUT_DIR, 'error-screenshot.png') });
  } finally {
    await browser.close();
  }
}

main();
