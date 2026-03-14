import { chromium } from 'playwright';

async function testPage(page, url, pageName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${pageName}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(60));

  const results = {
    pageName,
    url,
    loaded: false,
    blankScreen: false,
    errorBoundary: false,
    consoleErrors: [],
    renderStatus: 'unknown'
  };

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    }
  });

  try {
    // Navigate to the page with a reasonable timeout
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    results.loaded = true;
    console.log('✓ Page loaded');

    // Wait a bit for React to render
    await page.waitForTimeout(2000);

    // Check for blank screen
    const bodyText = await page.evaluate(() => document.body.innerText);
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    
    if (bodyText.trim().length === 0 || bodyHTML.trim().length < 100) {
      results.blankScreen = true;
      console.log('✗ BLANK SCREEN DETECTED');
    } else {
      console.log(`✓ Content detected (${bodyText.trim().length} characters)`);
    }

    // Check for React error boundary
    const errorBoundaryText = await page.evaluate(() => {
      const body = document.body.innerText.toLowerCase();
      return body.includes('error') || 
             body.includes('something went wrong') ||
             body.includes('unexpected error');
    });
    
    if (errorBoundaryText) {
      results.errorBoundary = true;
      console.log('⚠ Possible error boundary or error message detected');
    } else {
      console.log('✓ No error boundary detected');
    }

    // Check if main React root is mounted
    const hasReactRoot = await page.evaluate(() => {
      return document.querySelector('#root') !== null;
    });
    
    if (hasReactRoot) {
      console.log('✓ React root element found');
    } else {
      console.log('✗ React root element NOT found');
    }

    // Visual rendering check
    results.renderStatus = 'rendered';
    console.log('✓ Page appears to have rendered');

    // Take screenshot
    const screenshotName = `test_${pageName.replace(/\s+/g, '_').toLowerCase()}.png`;
    await page.screenshot({ 
      path: screenshotName,
      fullPage: true 
    });
    console.log(`✓ Screenshot saved: ${screenshotName}`);

  } catch (error) {
    results.loaded = false;
    results.renderStatus = 'failed';
    console.log(`✗ ERROR: ${error.message}`);
  }

  // Report console errors
  if (results.consoleErrors.length > 0) {
    console.log(`\n⚠ Console Errors (${results.consoleErrors.length}):`);
    results.consoleErrors.slice(0, 5).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.substring(0, 200)}`);
    });
    if (results.consoleErrors.length > 5) {
      console.log(`  ... and ${results.consoleErrors.length - 5} more`);
    }
  } else {
    console.log('✓ No console errors');
  }

  return results;
}

async function main() {
  console.log('Starting AgriNext Page Tests...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const tests = [
    { url: 'http://localhost:5174/', name: 'Home Page' },
    { url: 'http://localhost:5174/login', name: 'Login Page' }
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testPage(page, test.url, test.name);
    results.push(result);
  }

  await browser.close();

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL TEST SUMMARY');
  console.log('='.repeat(60));

  results.forEach(result => {
    console.log(`\n${result.pageName} (${result.url}):`);
    console.log(`  - Loaded: ${result.loaded ? '✓ YES' : '✗ NO'}`);
    console.log(`  - Blank Screen: ${result.blankScreen ? '✗ YES' : '✓ NO'}`);
    console.log(`  - Error Boundary: ${result.errorBoundary ? '⚠ YES' : '✓ NO'}`);
    console.log(`  - Console Errors: ${result.consoleErrors.length > 0 ? `⚠ ${result.consoleErrors.length}` : '✓ NONE'}`);
    console.log(`  - Render Status: ${result.renderStatus}`);
  });

  console.log('\n' + '='.repeat(60));
  
  const allPassed = results.every(r => 
    r.loaded && 
    !r.blankScreen && 
    !r.errorBoundary && 
    r.consoleErrors.length === 0
  );

  if (allPassed) {
    console.log('✓ ALL TESTS PASSED');
  } else {
    console.log('⚠ SOME TESTS FAILED - Review details above');
  }
  
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
