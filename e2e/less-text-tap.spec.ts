// ES-M2.5 step 5, commit 4b (TXT-R4, pending Chase's call): a tap never fails.
// Kept in its own file so `git revert` of the 4b commit takes this test with it. 4b also removes the
// AC-TXT4b ("Keep holding") test in e2e/less-text.spec.ts, which this behavior replaces.
// Written red first by qa-tdd.
import { expect, test } from '@playwright/test';

test.describe('AC-TXT4 on a touch phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('AC-TXT4 TXT-R4 a quick tap on the pad finishes as a button scan, with no error text', async ({ page }) => {
    await page.goto('/');
    await page.locator('.pad').tap();
    await expect(page.locator('.pad')).toHaveClass(/scanning/);
    await expect(page.getByTestId('energy-reading')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Too fast|Keep holding/)).toHaveCount(0);
  });
});

test('AC-TXT4 TXT-R4 a mouse press released after 200ms still gives a reading', async ({ page }) => {
  await page.goto('/');
  await page.locator('.pad').hover();
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(page.getByTestId('energy-reading')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Too fast|Keep holding/)).toHaveCount(0);
});
