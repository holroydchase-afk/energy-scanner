import { expect, test } from '@playwright/test';

test('app loads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Energy Scanner');
  expect(errors).toEqual([]);
});
