import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Attempting to capture remaining Agent pages...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1920, height: 1080 } 
  });
  
  const page = await context.newPage();

  try {
    // Try direct navigation to agent pages (assuming auth might work or we'll see error states)
    const pages = [
      { url: 'http://localhost:5173/agent/dashboard', name: 'dashboard-direct', waitTime: 10000 },
      { url: 'http://localhost:5173/agent/tasks', name: 'tasks', waitTime: 15000 },
      { url: 'http://localhost:5173/agent/my-farmers', name: 'my-farmers', waitTime: 10000 },
      { url: 'http://localhost:5173/agent/farmers', name: 'farmers-crops', waitTime: 10000 },
    ];

    for (const pageInfo of pages) {
      console.log(`📍 Capturing: ${pageInfo.name}`);
      try {
        await page.goto(pageInfo.url, { timeout: 60000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(pageInfo.waitTime);
        await page.screenshot({ path: `agent-audit-10-${pageInfo.name}.png`, fullPage: true });
        console.log(`   ✓ Screenshot saved: agent-audit-10-${pageInfo.name}.png`);
      } catch (error) {
        console.log(`   ⚠ Error on ${pageInfo.name}: ${error.message}`);
        await page.screenshot({ path: `agent-audit-10-${pageInfo.name}-error.png`, fullPage: true });
      }
    }

    console.log('\n✅ Capture attempt complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
