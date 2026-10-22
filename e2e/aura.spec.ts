import { expect, test } from '@playwright/test';
import { makePng } from './helpers';

// These run the real, self-hosted MediaPipe model in the browser.

test('the scanner loads on-device and reports when nobody is in the photo', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  const png = await makePng(page, 640, 480);
  await page.locator('[data-input="upload"]').setInputFiles({ name: 'empty.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('status')).toContainText('No person found', { timeout: 45_000 });
  // Privacy: every request stays on this app's own origin.
  const origin = new URL(page.url()).origin;
  expect(requests.filter((u) => !u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:'))).toEqual([]);
});

// Repo rule: no photos of real people are committed. The happy path runs on the app's own
// illustrated sample, which goes through the same on-device model as a photo.
test('the illustrated sample gets an animated aura, and saves as image and video', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Photo scan/ }).click();
  await page.getByRole('button', { name: 'Try the sample' }).click();
  await expect(page.getByText('Illustrated sample, not a real person')).toBeVisible();
  const aura = page.locator('canvas.aura');
  await expect(aura).toBeVisible({ timeout: 45_000 });
  // Always Grey is on by default, so the bedtime reading is Grey.
  await expect(page.getByTestId('energy-reading')).toContainText('Grey Energy');

  const image = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image' }).click();
  expect((await image).suggestedFilename()).toBe('energy-scanner-grey.png');

  const video = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Save video' }).click();
  const saved = await video;
  expect(saved.suggestedFilename()).toMatch(/^energy-scanner-grey\.(webm|mp4)$/);
  const path = await saved.path();
  const { statSync } = await import('node:fs');
  expect(statSync(path).size).toBeGreaterThan(10_000);
});

// Optional: the same flow on a local photo of a real person, never committed.
const samplePhoto = process.env.SAMPLE_PHOTO;
test('a local photo of a person gets an animated aura', async ({ page }) => {
  test.skip(!samplePhoto, 'set SAMPLE_PHOTO to a local photo of a person');
  await page.goto('/');
  await page.locator('[data-input="upload"]').setInputFiles(samplePhoto!);
  await expect(page.locator('canvas.aura')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('energy-reading')).toContainText('Grey Energy');
});
