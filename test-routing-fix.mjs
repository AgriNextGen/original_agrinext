#!/usr/bin/env node

/**
 * AgriNext Routing Test Script
 * Tests that the routing fix resolved the blank page / error boundary issues
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const BASE_URL = 'http://localhost:5173';
const TEST_PAGES = [
  { name: 'Root Page', url: '/', expected: ['AgriNext', 'root'] },
  { name: 'Login Page', url: '/login', expected: ['root', 'login'] }
];

console.log('🧪 AgriNext Routing Test - Post-Fix Verification\n');
console.log('=' .repeat(60));

// Simple HTTP fetch test
async function testPage(name, url, expectedContent) {
  console.log(`\n📄 Testing: ${name}`);
  console.log(`   URL: ${BASE_URL}${url}`);
  
  try {
    const response = await fetch(`${BASE_URL}${url}`);
    const html = await response.text();
    
    console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
    console.log(`   ✅ Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   ✅ Content Length: ${html.length} bytes`);
    
    // Check for error indicators
    const hasError = /error boundary|something went wrong|error occurred/i.test(html);
    if (hasError) {
      console.log('   ❌ FAIL: Found error boundary or error message in HTML');
      return false;
    } else {
      console.log('   ✅ No error boundary detected');
    }
    
    // Check for expected content
    let allFound = true;
    for (const expected of expectedContent) {
      const found = html.toLowerCase().includes(expected.toLowerCase());
      if (found) {
        console.log(`   ✅ Found expected content: "${expected}"`);
      } else {
        console.log(`   ⚠️  Expected content not found: "${expected}"`);
        allFound = false;
      }
    }
    
    // Check for root div
    if (html.includes('<div id="root"')) {
      console.log('   ✅ Found <div id="root">');
    } else {
      console.log('   ❌ FAIL: Missing <div id="root">');
      return false;
    }
    
    return allFound;
    
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  let allPassed = true;
  
  for (const test of TEST_PAGES) {
    const passed = await testPage(test.name, test.url, test.expected);
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('\nThe routing fix appears to be working correctly!');
    console.log('Both pages load without error boundaries.');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\nPlease review the output above for details.');
  }
  console.log('='.repeat(60));
  
  console.log('\n📌 IMPORTANT NOTE:');
  console.log('   This script only tests HTTP responses and HTML content.');
  console.log('   For full verification:');
  console.log('   1. Open http://localhost:5173/ in your browser');
  console.log('   2. Check the browser console for JavaScript errors');
  console.log('   3. Verify the UI renders correctly (no blank page)');
  console.log('   4. Navigate to /login and verify the form appears');
  console.log('\n   Or use the test page: test-pages.html');
}

// Check if dev server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch {
    return false;
  }
}

// Main
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Dev server is not running at', BASE_URL);
    console.log('   Please start it with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Dev server is running at', BASE_URL);
  console.log('');
  
  await runTests();
})();
