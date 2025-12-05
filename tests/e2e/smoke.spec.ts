import { test, expect } from '@playwright/test';

const base = process.env.E2E_BASE_URL || 'http://localhost:3000';

// Skip if no base URL is configured to avoid CI failures when the app isn't running
const maybe = process.env.E2E_BASE_URL ? test : test.skip;

maybe('app responds on home route', async ({ page }) => {
  const response = await page.goto(base, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/(home)?$/i);
});


