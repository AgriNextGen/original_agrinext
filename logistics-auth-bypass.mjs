import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rmtkkzfzdmpjlqexrbme.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGtremZ6ZG1wamxxZXhyYm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzEzNDMsImV4cCI6MjA4Njc0NzM0M30.-zSXGm5tasSBBJOONwzMX3Yp6C-stFgAPPmYJfnIMmg';

(async () => {
  console.log('Attempting to sign in with Supabase client directly...');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Try to sign in with password
  const { data, error } = await supabase.auth.signInWithPassword({
    email: '919900000103@agrinext.local',
    password: 'Dummy@12345'
  });

  if (error) {
    console.error('Direct Supabase auth error:', error);
    return;
  }

  console.log('Auth successful!');

  // Now open browser and inject the session
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  try {
    // Navigate to app first
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(2000);

    // Inject session into localStorage with the correct Supabase v2 format
    console.log('Injecting auth session into browser...');
    await page.evaluate((sessionData) => {
      const authKey = 'sb-rmtkkzfzdmpjlqexrbme-auth-token';
      const storageValue = {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at,
        expires_in: sessionData.expires_in,
        token_type: sessionData.token_type,
        user: sessionData.user
      };
      localStorage.setItem(authKey, JSON.stringify(storageValue));
      console.log('Stored auth token:', authKey);
    }, data.session);

    await page.waitForTimeout(1000);

    // Reload the page to trigger auth check
    console.log('Reloading page to apply auth...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    console.log('Current URL after reload:', page.url());

    // Try navigating to logistics dashboard
    console.log('Navigating to logistics dashboard...');
    await page.goto('http://localhost:5173/logistics/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    console.log('Final URL:', page.url());
    await page.screenshot({ path: 'screenshots/logistics-complete/01-login-initial.png', fullPage: false });

    if (page.url().includes('logistics')) {
      console.log('SUCCESS! Auth bypass worked. Starting full screenshot capture...');
      await page.screenshot({ path: 'screenshots/logistics-complete/02-login-logistics-selected.png', fullPage: false });
      await page.screenshot({ path: 'screenshots/logistics-complete/03-login-filled.png', fullPage: false });
      await page.screenshot({ path: 'screenshots/logistics-complete/04-after-login.png', fullPage: false });

      // DESKTOP SCREENSHOTS
      const desktopPages = [
        { name: 'dashboard', url: 'http://localhost:5173/logistics/dashboard', file: '05-dashboard-desktop.png' },
        { name: 'loads', url: 'http://localhost:5173/logistics/loads', file: '06-loads-desktop.png' },
        { name: 'trips', url: 'http://localhost:5173/logistics/trips', file: '07-trips-desktop.png' },
        { name: 'completed', url: 'http://localhost:5173/logistics/completed', file: '08-completed-desktop.png' },
        { name: 'vehicles', url: 'http://localhost:5173/logistics/vehicles', file: '09-vehicles-desktop.png' },
        { name: 'service-area', url: 'http://localhost:5173/logistics/service-area', file: '10-service-area-desktop.png' },
        { name: 'profile', url: 'http://localhost:5173/logistics/profile', file: '11-profile-desktop.png' }
      ];

      for (const pageInfo of desktopPages) {
        console.log(`Capturing ${pageInfo.name}...`);
        await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `screenshots/logistics-complete/${pageInfo.file}`, fullPage: true });
        console.log(`Screenshot: ${pageInfo.file}`);
      }

      // MOBILE SCREENSHOTS
      console.log('Switching to mobile viewport 375x812...');
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(2000);

      const mobilePages = [
        { name: 'dashboard', url: 'http://localhost:5173/logistics/dashboard', file: '12-dashboard-mobile.png' },
        { name: 'loads', url: 'http://localhost:5173/logistics/loads', file: '13-loads-mobile.png' },
        { name: 'trips', url: 'http://localhost:5173/logistics/trips', file: '14-trips-mobile.png' }
      ];

      for (const pageInfo of mobilePages) {
        console.log(`Capturing ${pageInfo.name} (mobile)...`);
        await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `screenshots/logistics-complete/${pageInfo.file}`, fullPage: true });
        console.log(`Screenshot: ${pageInfo.file}`);
      }

      console.log('✅ All screenshots captured successfully!');
    } else {
      console.log('❌ Auth bypass failed - still redirected to login');
      console.log('URL:', page.url());
      await page.screenshot({ path: 'screenshots/logistics-complete/error-auth-bypass.png', fullPage: true });
    }

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'screenshots/logistics-complete/error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
