import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const baseURL = 'http://localhost:5174';
const screenshotsDir = process.cwd();

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('Step 1: Navigate to homepage');
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('Step 2: Full page screenshot');
  await page.screenshot({ 
    path: join(screenshotsDir, 'screenshot-00-full-page.png'),
    fullPage: true 
  });

  console.log('Step 3: Scroll to Trust Banner and screenshot');
  const trustBanner = page.locator('.bg-emerald-500, .bg-green-600, .bg-emerald-600').first();
  if (await trustBanner.count() > 0) {
    await trustBanner.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-06-trust-banner.png'),
      fullPage: false 
    });
  } else {
    console.log('Trust banner not found, scrolling down manually');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.7));
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-06-trust-banner.png'),
      fullPage: false 
    });
  }

  console.log('Step 4: Scroll to Impact section');
  const impactSection = page.getByText(/impact|outcomes|results/i).first();
  if (await impactSection.count() > 0) {
    await impactSection.scrollIntoViewIfNeeded();
  } else {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.75));
  }
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: join(screenshotsDir, 'screenshot-07-impact-section.png'),
    fullPage: false 
  });

  console.log('Step 5: Hover over impact card');
  const impactCard = page.locator('[class*="card"], [class*="Card"]').first();
  if (await impactCard.count() > 0) {
    await impactCard.hover();
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-08-impact-card-hover.png'),
      fullPage: false 
    });
  }

  console.log('Step 6: Scroll to CTA section');
  const ctaSection = page.getByText(/ready to get started|get started|join/i).first();
  if (await ctaSection.count() > 0) {
    await ctaSection.scrollIntoViewIfNeeded();
  } else {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.85));
  }
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: join(screenshotsDir, 'screenshot-09-cta-section.png'),
    fullPage: false 
  });

  console.log('Step 7: Hover over Create Account button');
  const createAccountBtn = page.getByRole('button', { name: /create account|sign up/i }).or(
    page.getByRole('link', { name: /create account|sign up/i })
  ).first();
  if (await createAccountBtn.count() > 0) {
    await createAccountBtn.hover();
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-10-create-account-hover.png'),
      fullPage: false 
    });
  }

  console.log('Step 8: Hover over Request Demo button');
  const requestDemoBtn = page.getByRole('button', { name: /request.*demo|demo/i }).or(
    page.getByRole('link', { name: /request.*demo|demo/i })
  ).first();
  if (await requestDemoBtn.count() > 0) {
    await requestDemoBtn.hover();
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-11-request-demo-hover.png'),
      fullPage: false 
    });
  }

  console.log('Step 9: Scroll to Footer');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ 
    path: join(screenshotsDir, 'screenshot-12-footer.png'),
    fullPage: false 
  });

  console.log('Step 10: Navigate to Login page');
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const signInBtn = page.getByRole('link', { name: /sign in|login/i }).first();
  if (await signInBtn.count() > 0) {
    await signInBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-13-login-page.png'),
      fullPage: true 
    });
  } else {
    // Try navigating directly
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-13-login-page.png'),
      fullPage: true 
    });
  }

  console.log('Step 11: Navigate to Signup page');
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  const signUpBtn = page.getByRole('link', { name: /sign up|create account/i }).first();
  if (await signUpBtn.count() > 0) {
    await signUpBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-14-signup-page.png'),
      fullPage: true 
    });
  } else {
    // Try navigating directly
    await page.goto(`${baseURL}/signup`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(screenshotsDir, 'screenshot-14-signup-page.png'),
      fullPage: true 
    });
  }

  console.log('Step 12: Return to landing page');
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await browser.close();
  console.log('\n✅ All screenshots captured successfully!');
}

captureScreenshots().catch(console.error);
