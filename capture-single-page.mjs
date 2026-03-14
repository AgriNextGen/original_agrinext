import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173';

// Get page URL from command line argument
const pageUrl = process.argv[2];
const outputName = process.argv[3];

if (!pageUrl || !outputName) {
  console.error('Usage: node capture-single-page.mjs <url> <output-name>');
  console.error('Example: node capture-single-page.mjs /farmer/crops crops-page');
  process.exit(1);
}

async function main() {
  console.log(`📸 Capturing: ${BASE_URL}${pageUrl}`);
  console.log(`   Output: ${outputName}.png\n`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    storageState: {
      cookies: [],
      origins: []
    }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to page
    await page.goto(`${BASE_URL}${pageUrl}`, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Wait for content to load
    await page.waitForTimeout(4000);
    
    // Take full page screenshot
    const fullPath = join(__dirname, `${outputName}-full.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`✓ Full page saved: ${fullPath}`);
    
    // Take viewport screenshot
    const viewportPath = join(__dirname, `${outputName}-viewport.png`);
    await page.screenshot({ path: viewportPath, fullPage: false });
    console.log(`✓ Viewport saved: ${viewportPath}`);
    
    // Get page info
    const title = await page.title();
    const url = page.url();
    console.log(`\nPage Info:`);
    console.log(`  Title: ${title}`);
    console.log(`  URL: ${url}`);
    
    console.log(`\n✅ Capture complete!`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    // Try to capture anyway
    try {
      const errorPath = join(__dirname, `${outputName}-error.png`);
      await page.screenshot({ path: errorPath, fullPage: true });
      console.log(`   Error screenshot saved: ${errorPath}`);
    } catch (e) {
      console.error(`   Could not save error screenshot`);
    }
    
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
