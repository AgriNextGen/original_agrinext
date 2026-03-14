import { chromium } from 'playwright';

async function simpleTest() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: false });
  console.log('Browser launched!');
  
  const page = await browser.newPage();
  console.log('New page created!');
  
  console.log('Navigating to localhost:5173/login...');
  try {
    await page.goto('http://localhost:5173/login', { 
      waitUntil: 'commit',
      timeout: 30000 
    });
    console.log('Navigation succeeded!');
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-simple.png' });
    console.log('Screenshot taken!');
    
  } catch (error) {
    console.error('Navigation failed:', error.message);
  }
  
  await browser.close();
  console.log('Browser closed.');
}

simpleTest().catch(console.error);
