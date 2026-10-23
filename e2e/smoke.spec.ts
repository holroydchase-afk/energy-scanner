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

test('shared links get a preview image', async ({ page, request }) => {
  await page.goto('/');
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(image).toBe('https://chaseholroyd.com/energy-scanner/og.png');
  const res = await request.get('/og.png');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toBe('image/png');
});

test('ES-R46 on a wide screen the palm pad stays put when the reading appears', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const pad = page.locator('.pad');
  const before = await pad.boundingBox();
  await pad.focus();
  await page.keyboard.down('Space');
  await expect(page.getByTestId('energy-reading')).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up('Space');
  const after = await pad.boundingBox();
  expect(Math.abs(after!.x + after!.width / 2 - (before!.x + before!.width / 2))).toBeLessThanOrEqual(2);
});
