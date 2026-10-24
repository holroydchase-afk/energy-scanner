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
  await page.addInitScript(() => localStorage.setItem('alwaysGrey', 'true'));
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

test('ES-R47 on a wide screen the palm reading is centred under the pad, and ES-R50 the to-do line is quiet', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const pad = page.locator('.pad');
  await pad.focus();
  await page.keyboard.down('Space');
  const card = page.getByTestId('energy-reading');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up('Space');
  const p = (await pad.boundingBox())!;
  const c = (await card.boundingBox())!;
  expect(Math.abs(c.x + c.width / 2 - (p.x + p.width / 2))).toBeLessThanOrEqual(2);
  const weight = await page.locator('.rc-todo').evaluate((el) => Number(getComputedStyle(el).fontWeight));
  expect(weight).toBeLessThanOrEqual(600);
});

test('ES-R48 the first phone screen pitches the on-device aura, and the demo button shows it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.pitch')).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'See the aura demo' }).click();
  await expect(page.locator('canvas.aura')).toBeVisible({ timeout: 45_000 });
});

test('ES-R62 after a palm scan the whole reading is in view, and the pad stays put', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const pad = page.locator('.pad');
    const before = (await pad.boundingBox())!;
    await pad.focus();
    await page.keyboard.down('Space');
    const card = page.getByTestId('energy-reading');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await page.keyboard.up('Space');
    // Whole card in view (allowing for sub-pixel rounding at the edge).
    await expect(card).toBeInViewport({ ratio: 0.99 });
    const after = (await pad.boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(2);
  }
});

test('ES-R65 the link preview text pitches the on-device aura', async ({ page }) => {
  await page.goto('/');
  const content = await page.locator('meta[property="og:description"]').getAttribute('content');
  expect(content).toContain('Nothing is uploaded');
});
