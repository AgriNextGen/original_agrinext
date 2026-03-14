import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Step 1: Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    console.log('Step 2: Waiting 3 seconds for full load');
    await page.waitForTimeout(3000);
    
    console.log('Step 3: Scrolling to Problem section and taking screenshot');
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      const problemHeading = headings.find(h => /problem|challenge/i.test(h.textContent));
      if (problemHeading) {
        const section = problemHeading.closest('section') || problemHeading.parentElement;
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(__dirname, 'screenshot-problem-section.png'), fullPage: false });
    
    console.log('Step 4: Hovering over a problem card');
    const problemCard = page.locator('.group').first();
    if (await problemCard.count() > 0) {
      await problemCard.hover();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(__dirname, 'screenshot-problem-card-hover.png'), fullPage: false });
    }
    
    console.log('Step 5: Scrolling to Platform/Features section');
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      const platformHeading = headings.find(h => /platform|features/i.test(h.textContent));
      if (platformHeading) {
        const section = platformHeading.closest('section') || platformHeading.parentElement;
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(__dirname, 'screenshot-platform-section.png'), fullPage: false });
    
    console.log('Step 6: Hovering over a platform feature card');
    const featureCards = await page.locator('.group').all();
    if (featureCards.length > 1) {
      await featureCards[1].hover();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(__dirname, 'screenshot-platform-card-hover.png'), fullPage: false });
    }
    
    console.log('Step 7: Scrolling to Roles section');
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      const rolesHeading = headings.find(h => /roles|who/i.test(h.textContent));
      if (rolesHeading) {
        const section = rolesHeading.closest('section') || rolesHeading.parentElement;
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(__dirname, 'screenshot-roles-section.png'), fullPage: false });
    
    console.log('Step 8: Hovering over a role card');
    const roleCards = await page.locator('.group').all();
    if (roleCards.length > 2) {
      await roleCards[2].hover();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(__dirname, 'screenshot-role-card-hover.png'), fullPage: false });
    }
    
    console.log('Step 9: Clicking a "Start as..." CTA button');
    const ctaButton = page.locator('button, a').filter({ hasText: /start as/i }).first();
    if (await ctaButton.count() > 0) {
      await ctaButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(__dirname, 'screenshot-cta-navigation.png'), fullPage: false });
      await page.goBack();
      await page.waitForTimeout(1000);
    }
    
    console.log('Step 10: Scrolling to Workflow/How it Works section');
    await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      const workflowHeading = headings.find(h => /workflow|how.*works/i.test(h.textContent));
      if (workflowHeading) {
        const section = workflowHeading.closest('section') || workflowHeading.parentElement;
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(__dirname, 'screenshot-workflow-section.png'), fullPage: false });
    
    console.log('All screenshots captured successfully!');
    
  } catch (error) {
    console.error('Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
