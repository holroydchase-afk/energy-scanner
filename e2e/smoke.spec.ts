import { expect, test } from '@playwright/test';

test('app loads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Energy Scanner');
  expect(errors).toEqual([]);
});

test('the production build ships a Content Security Policy that blocks other origins', async ({ page }) => {
  await page.goto('/');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("connect-src 'self'");
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/upload', { method: 'POST', body: 'photo' });
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
});

test('palm scan: hold the pad to get a reading', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bath' }).click();
  const pad = page.getByRole('button', { name: /Press and hold/ });
  await pad.hover();
  await page.mouse.down();
  await expect(page.getByTestId('energy-reading')).toBeVisible({ timeout: 6_000 });
  await page.mouse.up();
  await expect(page.getByTestId('energy-reading')).toContainText('Grey Energy');
  await expect(page.getByTestId('energy-reading')).toContainText('PJs, Teeth, Potty, Book');
});
