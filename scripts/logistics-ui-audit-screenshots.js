/**
 * AgriNext Logistics Dashboard UI/UX Audit Screenshot Automation
 * 
 * This script automates comprehensive screenshot capture for the logistics
 * dashboard across all pages and viewports (desktop + mobile).
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  credentials: {
    phone: '9900000103',
    password: 'Dummy@12345'
  },
  screenshotsDir: path.join(__dirname, '..', 'screenshots', 'logistics-audit'),
  desktopViewport: { width: 1920, height: 1080 },
  mobileViewport: { width: 375, height: 812 }, // iPhone X
  waitAfterNav: 3000, // Wait time after navigation
  waitAfterAction: 1000 // Wait time after actions like clicks
};

// Pages to capture
const PAGES = [
  { name: 'dashboard', url: '/logistics/dashboard', label: 'Logistics Dashboard' },
  { name: 'loads', url: '/logistics/loads', label: 'Available Loads' },
  { name: 'trips', url: '/logistics/trips', label: 'Active Trips' },
  { name: 'completed', url: '/logistics/completed', label: 'Completed Trips' },
  { name: 'vehicles', url: '/logistics/vehicles', label: 'My Vehicles' },
  { name: 'service-area', url: '/logistics/service-area', label: 'Service Area' },
  { name: 'profile', url: '/logistics/profile', label: 'Profile' }
];

// Ensure screenshots directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✓ Created directory: ${dirPath}`);
  }
}

// Generate timestamp for filenames
function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

// Take screenshot with description
async function takeScreenshot(page, filename, description) {
  const fullPath = path.join(CONFIG.screenshotsDir, filename);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`✓ Screenshot saved: ${filename}`);
  console.log(`  Description: ${description}`);
  
  // Also save description to a text file
  const descPath = fullPath.replace('.png', '.txt');
  fs.writeFileSync(descPath, description);
  
  return fullPath;
}

// Describe what's visible on the page
async function describePage(page) {
  try {
    const title = await page.title();
    const url = page.url();
    const bodyText = await page.evaluate(() => {
      // Get main headings and key text
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent.trim())
        .filter(t => t)
        .slice(0, 5);
      
      const buttons = Array.from(document.querySelectorAll('button'))
        .map(b => b.textContent.trim())
        .filter(t => t)
        .slice(0, 10);
      
      const links = Array.from(document.querySelectorAll('nav a'))
        .map(a => a.textContent.trim())
        .filter(t => t);
      
      return { headings, buttons, links };
    });
    
    return `
Page: ${title}
URL: ${url}
Headings: ${bodyText.headings.join(', ') || 'None visible'}
Buttons: ${bodyText.buttons.join(', ') || 'None visible'}
Navigation Links: ${bodyText.links.join(', ') || 'None visible'}
`.trim();
  } catch (error) {
    return `Error describing page: ${error.message}`;
  }
}

async function main() {
  console.log('🚀 Starting AgriNext Logistics UI/UX Audit Screenshot Automation\n');
  
  // Ensure screenshots directory exists
  ensureDirectoryExists(CONFIG.screenshotsDir);
  
  // Launch browser
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false, // Set to true for headless mode
    slowMo: 500 // Slow down actions for visibility
  });
  
  try {
    // Create context with desktop viewport
    const context = await browser.newContext({
      viewport: CONFIG.desktopViewport,
      locale: 'en-IN'
    });
    
    const page = await context.newPage();
    
    // ========================================
    // STEP 1: Login Page - Initial View
    // ========================================
    console.log('\n📍 STEP 1: Login Page - Initial View');
    await page.goto(`${CONFIG.baseUrl}/login`);
    await page.waitForTimeout(CONFIG.waitAfterNav);
    
    let description = await describePage(page);
    await takeScreenshot(
      page, 
      '01-login-initial.png',
      `Login page initial view\n${description}`
    );
    
    // ========================================
    // STEP 1b: Select Logistics Role
    // ========================================
    console.log('\n📍 STEP 1b: Select Logistics Role');
    try {
      // Try to find and click logistics role selector
      const logisticsSelectors = [
        'button:has-text("Logistics")',
        '[data-role="logistics"]',
        'button[value="logistics"]',
        'input[value="logistics"]',
        'div:has-text("Logistics")',
        'label:has-text("Logistics")'
      ];
      
      let clicked = false;
      for (const selector of logisticsSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          clicked = true;
          console.log(`✓ Clicked logistics selector: ${selector}`);
          break;
        } catch (e) {
          // Try next selector
        }
      }
      
      if (clicked) {
        await page.waitForTimeout(CONFIG.waitAfterAction);
        description = await describePage(page);
        await takeScreenshot(
          page,
          '02-login-logistics-selected.png',
          `Login page with logistics role selected\n${description}`
        );
      } else {
        console.log('⚠ Could not find logistics role selector - may already be selected or not present');
      }
    } catch (error) {
      console.log(`⚠ Error selecting logistics role: ${error.message}`);
    }
    
    // ========================================
    // STEP 2: Fill Login Form
    // ========================================
    console.log('\n📍 STEP 2: Fill Login Form');
    
    // Find and fill phone input
    const phoneSelectors = [
      'input[type="tel"]',
      'input[name="phone"]',
      'input[placeholder*="phone" i]',
      'input[id*="phone" i]'
    ];
    
    for (const selector of phoneSelectors) {
      try {
        await page.fill(selector, CONFIG.credentials.phone, { timeout: 2000 });
        console.log(`✓ Filled phone input: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    // Find and fill password input
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]'
    ];
    
    for (const selector of passwordSelectors) {
      try {
        await page.fill(selector, CONFIG.credentials.password, { timeout: 2000 });
        console.log(`✓ Filled password input: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    await page.waitForTimeout(CONFIG.waitAfterAction);
    description = await describePage(page);
    await takeScreenshot(
      page,
      '03-login-filled-form.png',
      `Login form filled with credentials\n${description}`
    );
    
    // ========================================
    // STEP 2b: Submit Login
    // ========================================
    console.log('\n📍 STEP 2b: Submit Login');
    
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      'button:has-text("Log In")',
      'form button[type="button"]'
    ];
    
    for (const selector of submitSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        console.log(`✓ Clicked submit button: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    // Wait for navigation and page load
    await page.waitForTimeout(5000);
    
    description = await describePage(page);
    await takeScreenshot(
      page,
      '04-after-login.png',
      `Page immediately after login (should be logistics dashboard)\n${description}`
    );
    
    // ========================================
    // STEP 3: Desktop Screenshots of All Pages
    // ========================================
    console.log('\n📍 STEP 3: Desktop Screenshots');
    
    for (const pageInfo of PAGES) {
      console.log(`\n  Capturing: ${pageInfo.label}`);
      await page.goto(`${CONFIG.baseUrl}${pageInfo.url}`);
      await page.waitForTimeout(CONFIG.waitAfterNav);
      
      description = await describePage(page);
      await takeScreenshot(
        page,
        `05-desktop-${pageInfo.name}.png`,
        `Desktop view: ${pageInfo.label}\n${description}`
      );
      
      // Try scrolling down and take another screenshot if page is long
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = CONFIG.desktopViewport.height;
      
      if (scrollHeight > viewportHeight * 1.5) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
        await page.waitForTimeout(500);
        await takeScreenshot(
          page,
          `05-desktop-${pageInfo.name}-scrolled.png`,
          `Desktop view (scrolled): ${pageInfo.label}\n${description}`
        );
        
        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);
      }
    }
    
    // ========================================
    // STEP 4: Mobile Screenshots
    // ========================================
    console.log('\n📍 STEP 4: Mobile Screenshots');
    
    // Create new context with mobile viewport
    await context.close();
    const mobileContext = await browser.newContext({
      viewport: CONFIG.mobileViewport,
      locale: 'en-IN',
      isMobile: true,
      hasTouch: true
    });
    
    const mobilePage = await mobileContext.newPage();
    
    // Need to login again in mobile context
    console.log('\n  Mobile: Logging in...');
    await mobilePage.goto(`${CONFIG.baseUrl}/login`);
    await mobilePage.waitForTimeout(CONFIG.waitAfterNav);
    
    // Fill login form (mobile)
    for (const selector of phoneSelectors) {
      try {
        await mobilePage.fill(selector, CONFIG.credentials.phone, { timeout: 2000 });
        break;
      } catch (e) {}
    }
    
    for (const selector of passwordSelectors) {
      try {
        await mobilePage.fill(selector, CONFIG.credentials.password, { timeout: 2000 });
        break;
      } catch (e) {}
    }
    
    for (const selector of submitSelectors) {
      try {
        await mobilePage.click(selector, { timeout: 2000 });
        break;
      } catch (e) {}
    }
    
    await mobilePage.waitForTimeout(5000);
    
    // Capture key mobile pages
    const mobilePages = [
      { name: 'dashboard', url: '/logistics/dashboard', label: 'Dashboard' },
      { name: 'loads', url: '/logistics/loads', label: 'Available Loads' },
      { name: 'trips', url: '/logistics/trips', label: 'Active Trips' }
    ];
    
    for (const pageInfo of mobilePages) {
      console.log(`\n  Mobile: Capturing ${pageInfo.label}`);
      await mobilePage.goto(`${CONFIG.baseUrl}${pageInfo.url}`);
      await mobilePage.waitForTimeout(CONFIG.waitAfterNav);
      
      description = await describePage(mobilePage);
      await takeScreenshot(
        mobilePage,
        `06-mobile-${pageInfo.name}.png`,
        `Mobile view (${CONFIG.mobileViewport.width}x${CONFIG.mobileViewport.height}): ${pageInfo.label}\n${description}`
      );
    }
    
    // Try to open mobile menu/hamburger
    console.log('\n  Mobile: Attempting to open navigation menu');
    const menuSelectors = [
      'button[aria-label*="menu" i]',
      'button[aria-label*="navigation" i]',
      'button:has-text("☰")',
      '[data-menu-trigger]',
      '.hamburger'
    ];
    
    await mobilePage.goto(`${CONFIG.baseUrl}/logistics/dashboard`);
    await mobilePage.waitForTimeout(CONFIG.waitAfterNav);
    
    for (const selector of menuSelectors) {
      try {
        await mobilePage.click(selector, { timeout: 2000 });
        console.log(`✓ Clicked mobile menu: ${selector}`);
        await mobilePage.waitForTimeout(CONFIG.waitAfterAction);
        
        description = await describePage(mobilePage);
        await takeScreenshot(
          mobilePage,
          '06-mobile-menu-open.png',
          `Mobile view with navigation menu open\n${description}`
        );
        break;
      } catch (e) {
        // Try next selector
      }
    }
    
    await mobileContext.close();
    
    // ========================================
    // Complete
    // ========================================
    console.log('\n✅ Screenshot automation complete!');
    console.log(`📁 Screenshots saved to: ${CONFIG.screenshotsDir}`);
    console.log(`📊 Total screenshots: ${fs.readdirSync(CONFIG.screenshotsDir).filter(f => f.endsWith('.png')).length}`);
    
    // Generate index file
    const screenshots = fs.readdirSync(CONFIG.screenshotsDir)
      .filter(f => f.endsWith('.png'))
      .sort();
    
    let indexContent = `# AgriNext Logistics Dashboard UI/UX Audit Screenshots
Generated: ${new Date().toISOString()}

## Screenshots Captured

`;
    
    screenshots.forEach((filename, idx) => {
      const txtFile = filename.replace('.png', '.txt');
      const txtPath = path.join(CONFIG.screenshotsDir, txtFile);
      let description = 'No description available';
      if (fs.existsSync(txtPath)) {
        description = fs.readFileSync(txtPath, 'utf-8');
      }
      indexContent += `### ${idx + 1}. ${filename}\n\n${description}\n\n---\n\n`;
    });
    
    fs.writeFileSync(
      path.join(CONFIG.screenshotsDir, 'INDEX.md'),
      indexContent
    );
    
    console.log('📝 Generated INDEX.md with all screenshot descriptions');
    
  } catch (error) {
    console.error('❌ Error during screenshot automation:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
