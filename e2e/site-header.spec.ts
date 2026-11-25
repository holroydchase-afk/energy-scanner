import { expect, test, type Page } from '@playwright/test';

/**
 * Intake #60, AC-SH6 (docs/product/SPEC-SITE-HEADER.md). The portfolio's /assets/demo-bar.js
 * only exists on chaseholroyd.com, so under `vite preview` it is missing. A browser's script
 * request gets a plain 404 there (the preview's index.html fallback only answers requests that
 * accept text/html, e.g. curl's * / *), so no stub is needed: these tests use the real 404.
 */

/** Records every response the page gets for demo-bar.js. */
function watchDemoBar(page: Page): number[] {
  const statuses: number[] = [];
  page.on('response', (r) => {
    if (new URL(r.url()).pathname.endsWith('/assets/demo-bar.js')) statuses.push(r.status());
  });
  return statuses;
}

test('AC-SH6 the page asks for the site header script once, gets a 404, and nothing breaks', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const demoBar = watchDemoBar(page);
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Energy Scanner');
  await page.waitForLoadState('load');
  expect(new URL(page.url()).pathname).toBe('/');
  expect(demoBar).toEqual([404]);
  expect(errors).toEqual([]);
});

test('AC-SH6 with the header script missing, See the aura demo still produces a reading', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const demoBar = watchDemoBar(page);
  await page.addInitScript(() => localStorage.setItem('alwaysGrey', 'true'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'See the aura demo' }).click();
  await expect(page.locator('canvas.aura')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('energy-reading')).toContainText('Grey Energy');
  expect(demoBar).toEqual([404]);
  expect(errors).toEqual([]);
});
