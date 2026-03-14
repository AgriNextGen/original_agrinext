import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // Capture all network responses
  page.on('response', async response => {
    if (response.url().includes('login') || response.url().includes('auth')) {
      console.log(`NETWORK: ${response.status()} ${response.url()}`);
      try {
        const body = await response.text();
        console.log(`Response body: ${body.substring(0, 200)}`);
      } catch (e) {
        // Can''t read body
      }
    }
  });

  // Log console messages
  page.on('console', msg => console.log('BROWSER:', msg.text()));

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/logistics-complete/01-login-page.png' });

    console.log('Clicking Logistics button...');
    await page.click('button:has-text("Logistics")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/logistics-complete/02-before-login.png' });

    console.log('Filling form...');
    await page.fill('input[type="tel"]', '9900000103');
    await page.fill('input[type="password"]', 'Dummy@12345');
    await page.waitForTimeout(1000);

    console.log('Clicking Sign In button and monitoring network...');
    await page.screenshot({ path: 'screenshots/logistics-complete/03-after-login-click.png' });
    
    // Click and wait for response
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('login') || response.url().includes('auth'), 
        { timeout: 20000 }
      ).catch(() => null),
      page.click('button:has-text("Sign In")')
    ]);

    if (response) {
      console.log(`Login response status: ${response.status()}`);
      const body = await response.text();
      console.log(`Login response body: ${body}`);
    }

    await page.waitForTimeout(20000);
    console.log('Current URL after wait:', page.url());
    await page.screenshot({ path: 'screenshots/logistics-complete/04-final-state.png', fullPage: true });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();
