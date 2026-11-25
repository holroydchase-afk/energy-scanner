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

/**
 * AC-SH10 (SH-R2, P1): with the portfolio's fixed 52px bar on the page, the Palm/Photo switch
 * must not scroll under it after "See the aura demo". A stub #site-bar stands in for the real
 * portfolio bar (the real /assets/demo-bar.js does not exist under `vite preview`, and loading
 * it is not what is under test): same id, same fixed 52px box, so the CSS rule is exercised.
 */
const SITE_BAR_H = 52;

async function addStubSiteBar(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `#site-bar { position: fixed; top: 0; left: 0; right: 0; height: ${SITE_BAR_H}px; box-sizing: border-box; background: #111; color: #fff; z-index: 10; }`,
  });
  // The app's CSP (script-src 'self') blocks page.addScriptTag's inline script, so the stub bar's
  // element is created with page.evaluate instead; addStyleTag is fine (style-src 'unsafe-inline').
  await page.evaluate(() => {
    const bar = document.createElement('div');
    bar.id = 'site-bar';
    bar.textContent = 'stub site bar';
    document.body.prepend(bar);
  });
}

test('AC-SH10 with a fixed 52px #site-bar, the Palm/Photo switch stays below it after See the aura demo', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('alwaysGrey', 'true'));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await addStubSiteBar(page);
  await expect(page.locator('#site-bar')).toBeVisible();
  await page.getByRole('button', { name: 'See the aura demo' }).click();
  const mode = page.locator('.mode');
  await expect(mode).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.querySelector('.mode');
    if (!el) return false;
    const t = el.getBoundingClientRect().top;
    return t > -1 && Math.abs(t) < 2000;
  });
  // Settle the smooth scroll before measuring.
  await page.waitForTimeout(1_000);
  const box = (await mode.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(SITE_BAR_H);
});

test('AC-SH10 with no #site-bar, the Palm/Photo switch is still scrolled into view (default 0px)', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('alwaysGrey', 'true'));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  expect(await page.locator('#site-bar').count()).toBe(0);
  await page.getByRole('button', { name: 'See the aura demo' }).click();
  const mode = page.locator('.mode');
  await expect(mode).toBeVisible();
  await page.waitForTimeout(1_000);
  const box = (await mode.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(800);
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
