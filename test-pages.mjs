import { chromium } from '@playwright/test';
import * as fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  const errors = [];
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });

  console.log('\n=== TESTING LANDING PAGE ===\n');
  
  // Test landing page
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for any dynamic content
    
    await page.screenshot({ path: 'test-landing.png', fullPage: true });
    console.log('✓ Landing page screenshot saved: test-landing.png');
    
    // Check for key elements
    const heroSection = await page.locator('h1, [class*="hero"]').count();
    console.log(`✓ Hero section elements found: ${heroSection}`);
    
    const ctaButtons = await page.locator('button, a[class*="button"]').count();
    console.log(`✓ CTA buttons/links found: ${ctaButtons}`);
    
    console.log('\nLanding page console logs:');
    consoleLogs.forEach(log => console.log(log));
    
    if (errors.length > 0) {
      console.log('\n⚠ Landing page errors:');
      errors.forEach(err => console.log(err));
    } else {
      console.log('\n✓ No JavaScript errors on landing page');
    }
  } catch (error) {
    console.error('✗ Landing page error:', error.message);
  }

  // Clear logs for next test
  consoleLogs.length = 0;
  errors.length = 0;

  console.log('\n\n=== TESTING LOGIN PAGE ===\n');

  // Test login page
  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-login.png', fullPage: true });
    console.log('✓ Login page screenshot saved: test-login.png');
    
    // Check for key elements
    const roleSelector = await page.locator('select, [role="combobox"], [class*="role"]').count();
    console.log(`✓ Role selector elements found: ${roleSelector}`);
    
    const phoneInput = await page.locator('input[type="tel"], input[placeholder*="phone" i], input[name*="phone" i]').count();
    console.log(`✓ Phone input fields found: ${phoneInput}`);
    
    const passwordInput = await page.locator('input[type="password"]').count();
    console.log(`✓ Password input fields found: ${passwordInput}`);
    
    const signInButton = await page.locator('button:has-text("Sign In"), button:has-text("Login")').count();
    console.log(`✓ Sign In buttons found: ${signInButton}`);
    
    console.log('\nLogin page console logs:');
    consoleLogs.forEach(log => console.log(log));
    
    if (errors.length > 0) {
      console.log('\n⚠ Login page errors:');
      errors.forEach(err => console.log(err));
    } else {
      console.log('\n✓ No JavaScript errors on login page');
    }
  } catch (error) {
    console.error('✗ Login page error:', error.message);
  }

  await browser.close();
  
  console.log('\n=== TEST COMPLETE ===\n');
})();
