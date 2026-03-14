import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotDir = join(__dirname, 'buyer-admin-test-screenshots');

async function analyzePageContent() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  const analysis = [];

  try {
    console.log('\n=== DETAILED PAGE CONTENT ANALYSIS ===\n');

    // Login as Buyer
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.click('text=Buyer');
    await page.fill('input[type="tel"]', '9900000104');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(5000);

    // Analyze Buyer Pages
    const buyerPages = [
      { url: 'http://localhost:5173/marketplace/browse', name: 'Browse' },
      { url: 'http://localhost:5173/marketplace/orders', name: 'Orders' },
      { url: 'http://localhost:5173/marketplace/profile', name: 'Profile' }
    ];

    console.log('BUYER PAGES ANALYSIS:\n');

    for (const pageInfo of buyerPages) {
      await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const pageAnalysis = {
        role: 'Buyer',
        page: pageInfo.name,
        url: pageInfo.url
      };

      // Get main heading
      try {
        const h1 = await page.locator('h1').first().textContent({ timeout: 2000 });
        pageAnalysis.mainHeading = h1?.trim();
      } catch {
        pageAnalysis.mainHeading = 'Not found';
      }

      // Get visible text
      try {
        const bodyText = await page.locator('body').textContent({ timeout: 2000 });
        pageAnalysis.bodyLength = bodyText?.length || 0;
        pageAnalysis.hasContent = bodyText && bodyText.length > 1000;
      } catch {
        pageAnalysis.bodyLength = 0;
        pageAnalysis.hasContent = false;
      }

      // Check for empty state
      try {
        const emptyState = await page.locator('[data-empty-state], .empty-state, :has-text("No data")').count();
        pageAnalysis.hasEmptyState = emptyState > 0;
      } catch {
        pageAnalysis.hasEmptyState = false;
      }

      // Check for error message
      try {
        const errorEl = await page.locator('.error, [role="alert"], :has-text("Error"), :has-text("error")').first().textContent({ timeout: 1000 });
        pageAnalysis.errorMessage = errorEl?.trim();
      } catch {
        pageAnalysis.errorMessage = null;
      }

      // Check for loading state
      try {
        const loading = await page.locator('[data-loading], .loading, .spinner').count();
        pageAnalysis.isLoading = loading > 0;
      } catch {
        pageAnalysis.isLoading = false;
      }

      // Get all visible button/link text
      try {
        const buttons = await page.locator('button:visible, a:visible').allTextContents();
        pageAnalysis.visibleControls = buttons.filter(b => b.trim()).slice(0, 10);
      } catch {
        pageAnalysis.visibleControls = [];
      }

      analysis.push(pageAnalysis);

      console.log(`${pageInfo.name}:`);
      console.log(`  Main Heading: ${pageAnalysis.mainHeading}`);
      console.log(`  Has Content: ${pageAnalysis.hasContent} (${pageAnalysis.bodyLength} chars)`);
      console.log(`  Empty State: ${pageAnalysis.hasEmptyState}`);
      console.log(`  Error: ${pageAnalysis.errorMessage || 'None'}`);
      console.log(`  Loading: ${pageAnalysis.isLoading}`);
      console.log(`  Controls: ${pageAnalysis.visibleControls.slice(0, 5).join(', ')}`);
      console.log('');
    }

    // Login as Admin
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.click('text=Admin');
    await page.fill('input[type="tel"]', '9900000105');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(5000);

    // Analyze Admin Pages
    const adminPages = [
      { url: 'http://localhost:5173/admin/transporters', name: 'Transporters' },
      { url: 'http://localhost:5173/admin/agents', name: 'Agents' },
      { url: 'http://localhost:5173/admin/buyers', name: 'Buyers' },
      { url: 'http://localhost:5173/admin/finance', name: 'Finance' },
      { url: 'http://localhost:5173/admin/crops', name: 'Crops' },
      { url: 'http://localhost:5173/admin/transport', name: 'Transport' },
      { url: 'http://localhost:5173/admin/orders', name: 'Orders' }
    ];

    console.log('\nADMIN PAGES ANALYSIS:\n');

    for (const pageInfo of adminPages) {
      await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const pageAnalysis = {
        role: 'Admin',
        page: pageInfo.name,
        url: pageInfo.url
      };

      // Get main heading
      try {
        const h1 = await page.locator('h1').first().textContent({ timeout: 2000 });
        pageAnalysis.mainHeading = h1?.trim();
      } catch {
        pageAnalysis.mainHeading = 'Not found';
      }

      // Get visible text
      try {
        const bodyText = await page.locator('body').textContent({ timeout: 2000 });
        pageAnalysis.bodyLength = bodyText?.length || 0;
        pageAnalysis.hasContent = bodyText && bodyText.length > 1000;
      } catch {
        pageAnalysis.bodyLength = 0;
        pageAnalysis.hasContent = false;
      }

      // Check for empty state
      try {
        const emptyState = await page.locator('[data-empty-state], .empty-state, :has-text("No data")').count();
        pageAnalysis.hasEmptyState = emptyState > 0;
      } catch {
        pageAnalysis.hasEmptyState = false;
      }

      // Check for error message
      try {
        const errorEl = await page.locator('.error, [role="alert"], :has-text("Error"), :has-text("error")').first().textContent({ timeout: 1000 });
        pageAnalysis.errorMessage = errorEl?.trim();
      } catch {
        pageAnalysis.errorMessage = null;
      }

      // Check for loading state
      try {
        const loading = await page.locator('[data-loading], .loading, .spinner').count();
        pageAnalysis.isLoading = loading > 0;
      } catch {
        pageAnalysis.isLoading = false;
      }

      // Get all visible button/link text
      try {
        const buttons = await page.locator('button:visible, a:visible').allTextContents();
        pageAnalysis.visibleControls = buttons.filter(b => b.trim()).slice(0, 10);
      } catch {
        pageAnalysis.visibleControls = [];
      }

      analysis.push(pageAnalysis);

      console.log(`${pageInfo.name}:`);
      console.log(`  Main Heading: ${pageAnalysis.mainHeading}`);
      console.log(`  Has Content: ${pageAnalysis.hasContent} (${pageAnalysis.bodyLength} chars)`);
      console.log(`  Empty State: ${pageAnalysis.hasEmptyState}`);
      console.log(`  Error: ${pageAnalysis.errorMessage || 'None'}`);
      console.log(`  Loading: ${pageAnalysis.isLoading}`);
      console.log(`  Controls: ${pageAnalysis.visibleControls.slice(0, 5).join(', ')}`);
      console.log('');
    }

    // Write detailed analysis
    fs.writeFileSync(
      join(screenshotDir, 'detailed-analysis.json'),
      JSON.stringify(analysis, null, 2)
    );

    console.log('\n=== SUMMARY ===\n');
    console.log(`Total pages analyzed: ${analysis.length}`);
    console.log(`Pages with content: ${analysis.filter(a => a.hasContent).length}`);
    console.log(`Pages with empty state: ${analysis.filter(a => a.hasEmptyState).length}`);
    console.log(`Pages with errors: ${analysis.filter(a => a.errorMessage).length}`);

  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    await browser.close();
  }
}

analyzePageContent();
