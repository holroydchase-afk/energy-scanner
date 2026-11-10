import { expect, test } from '@playwright/test';

async function openGrownups(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.locator('summary', { hasText: 'Grown-ups' }).click();
}

test('ES-R69 the empty reset row takes no space until a pretend time is set', async ({ page }) => {
  await openGrownups(page);
  const row = page.locator('.parent .row', { has: page.locator('[data-action="real-time"]') });
  await expect(row).toBeHidden();
  await page.locator('[data-input="fake"]').fill('-60');
  const btn = page.getByRole('button', { name: 'Back to real time' });
  await expect(btn).toBeVisible();
  const box = await btn.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.clock')).toContainText('pretend');
  await btn.click();
  await expect(page.locator('[data-input="fake"]')).toBeFocused();
  await expect(row).toBeHidden();
  await expect(page.locator('[data-pretend]')).toBeHidden();
});

test('ES-R69 the pretend tag fits the header on a 320px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openGrownups(page);
  await page.locator('[data-input="fake"]').fill('-180');
  await expect(page.locator('[data-pretend]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const head = await page.locator('.bt-head').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(head).toBeLessThanOrEqual(0);
});

test('ES-R71 a mouse-and-keyboard desktop keeps the normal footer padding', async ({ page }) => {
  await page.goto('/');
  const pad = await page.locator('.foot').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
  expect(pad).toBeLessThan(72);
});
