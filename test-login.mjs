import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testLogin() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Log console messages
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  // Log network errors
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`ERROR: ${response.url()} - ${response.status()}`);
    }
  });

  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(2000);
    
    console.log('Current URL:', page.url());
    await page.screenshot({ path: join(__dirname, 'agent-screenshots', 'test-01-login-page.png') });

    console.log('Clicking Agent button...');
    const agentButton = await page.locator('button:has-text("Agent")');
    await agentButton.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: join(__dirname, 'agent-screenshots', 'test-02-agent-selected.png') });

    console.log('Filling phone...');
    const phoneInput = await page.locator('input[type="tel"]');
    await phoneInput.fill('9900000102');
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: join(__dirname, 'agent-screenshots', 'test-03-phone-filled.png') });

    console.log('Filling password...');
    const passwordInput = await page.locator('input[type="password"]');
    await passwordInput.fill('Dummy@12345');
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: join(__dirname, 'agent-screenshots', 'test-04-password-filled.png') });

    console.log('Clicking Sign In...');
    const signInButton = await page.locator('button:has-text("Sign In")');
    await signInButton.click();
    
    // Wait and see what happens
    console.log('Waiting 5 seconds...');
    await page.waitForTimeout(5000);
    
    console.log('Current URL after login:', page.url());
    await page.screenshot({ path: join(__dirname, 'agent-screenshots', 'test-05-after-signin.png') });

    // Try to navigate to farmers page
    console.log('Navigating to farmers page...');
    await page.goto('http://localhost:5173/agent/farmers');
    await page.waitForTimeout(3000);
    
    console.log('Current URL:', page.url());
    await page.screenshot({ path: join(__dirname, 'agent-screenshots', 'test-06-farmers-page.png') });

    console.log('\n✅ Test complete. Check screenshots in agent-screenshots/test-*.png');
    console.log('Keeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: join(__dirname, 'agent-screenshots', 'test-error.png') });
  } finally {
    await browser.close();
  }
}

testLogin();
