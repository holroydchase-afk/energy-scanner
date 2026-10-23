import { expect, test } from '@playwright/test';
import { makePng } from './helpers';

test('uploading a large photo shows it downscaled', async ({ page }) => {
  await page.goto('/');
  const png = await makePng(page, 3000, 2000);
  await page.locator('[data-input="upload"]').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: png });
  const canvas = page.getByTestId('photo').locator('canvas');
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate((c: HTMLCanvasElement) => [c.width, c.height])).toEqual([1280, 853]);
});

test('dropping a photo onto the page loads it', async ({ page }) => {
  await page.goto('/');
  const png = await makePng(page, 400, 600);
  const dataTransfer = await page.evaluateHandle((b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'drop.png', { type: 'image/png' }));
    return dt;
  }, png.toString('base64'));
  await page.dispatchEvent('#app', 'drop', { dataTransfer });
  await expect(page.getByTestId('photo').locator('canvas')).toBeVisible();
});

test('take a photo hands off to the native camera and loads the result', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Photo scan/ }).click();
  await expect(page.locator('[data-input="capture"]')).toHaveAttribute('capture', 'environment');
  const png = await makePng(page, 600, 800);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Take a photo' }).click();
  await (await chooser).setFiles({ name: 'IMG_0001.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('photo').locator('canvas')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
});

test('a non-image file shows a friendly error', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-input="upload"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.getByRole('alert')).toContainText('not an image');
});

test('on a phone, the not-an-image error shows on screen under the buttons', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 640 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('radio', { name: /Photo scan/ }).click();
    await page.locator('[data-input="upload"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('not an image');
    await expect(alert).toBeInViewport({ ratio: 1 });
  }
});
