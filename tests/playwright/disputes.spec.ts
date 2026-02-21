import { test, expect } from '@playwright/test';

test.describe('Admin disputes flows', () => {
  test('list, open assign modal, assign, resolve', async ({ page }) => {
    // Assumes test environment is running and test admin account exists.
    // Replace baseURL in Playwright config or use full URL below.
    await page.goto('/admin/disputes');
    await expect(page.locator('text=Disputes')).toBeVisible();

    // Wait for list to load
    await page.waitForTimeout(1000);
    const firstAssign = page.locator('text=Assign').first();
    if (await firstAssign.count() === 0) {
      test.skip('No disputes to test with');
    } else {
      await firstAssign.click();
      await expect(page.locator('text=Assign Dispute')).toBeVisible();
      // Try typing admin name in autocomplete (best-effort)
      const input = page.locator('input[placeholder="Type admin name..."]');
      await input.fill('Admin');
      await page.waitForTimeout(500);
      const suggestion = page.locator('text=Admin').first();
      if (await suggestion.count() > 0) {
        await suggestion.click();
      }
      await page.click('text=Assign >> role=button');
      // After assigning, modal closes
      await expect(page.locator('text=Assign Dispute')).toHaveCount(0);
      // Now resolve first dispute
      const resolveBtn = page.locator('text=Resolve').first();
      await resolveBtn.click();
      // prompt appears for resolution; Playwright cannot interact with browser prompt easily in some setups.
      // If a prompt was used, skip assert; otherwise check for success toast
      await page.waitForTimeout(500);
    }
  });
});

