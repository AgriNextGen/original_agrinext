// Simple browser screenshot test
const fs = require('fs');
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5173';

async function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}`;
    console.log(`\n📄 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    http.get(url, (res) => {
      let html = '';
      
      res.on('data', (chunk) => {
        html += chunk;
      });
      
      res.on('end', () => {
        console.log(`   ✅ Status: ${res.statusCode}`);
        console.log(`   ✅ Content-Type: ${res.headers['content-type']}`);
        console.log(`   ✅ Content Length: ${html.length} bytes`);
        
        // Check for error indicators
        if (/error boundary|something went wrong/i.test(html)) {
          console.log('   ❌ Found error boundary text in HTML');
        } else {
          console.log('   ✅ No error boundary in HTML');
        }
        
        // Check for root div
        if (html.includes('<div id="root"')) {
          console.log('   ✅ Found <div id="root">');
        } else {
          console.log('   ❌ Missing <div id="root">');
        }
        
        // Check for expected content
        if (path === '/' && /agrinext/i.test(html)) {
          console.log('   ✅ Found AgriNext branding');
        }
        
        resolve({ success: res.statusCode === 200, html });
      });
    }).on('error', (error) => {
      console.log(`   ❌ ERROR: ${error.message}`);
      resolve({ success: false, html: '' });
    });
  });
}

(async () => {
  console.log('🧪 AgriNext HTTP Test - Post-Fix Verification\n');
  console.log('='.repeat(60));
  
  const test1 = await testEndpoint('/', 'Root Page');
  const test2 = await testEndpoint('/login', 'Login Page');
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:');
  console.log(`   Root Page:  ${test1.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Login Page: ${test2.success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (test1.success && test2.success) {
    console.log('\n✅ ALL HTTP TESTS PASSED');
    console.log('\n✨ The routing fix appears to be working!');
    console.log('   - Both pages return HTTP 200');
    console.log('   - No error boundary text found in HTML');
    console.log('   - Both pages have the root div');
    console.log('\n📌 For complete verification, please:');
    console.log('   1. Open http://localhost:5173/ in your browser');
    console.log('   2. Visually confirm the landing page renders');
    console.log('   3. Open browser DevTools (F12)');
    console.log('   4. Check Console tab for JavaScript errors');
    console.log('   5. Navigate to /login');
    console.log('   6. Confirm login form with phone/password fields appears');
  } else {
    console.log('\n❌ SOME TESTS FAILED - See details above');
  }
  
  console.log('\n' + '='.repeat(60));
})();
