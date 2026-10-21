import { expect, test } from '@playwright/test';
import { makePng } from './helpers';

test.use({
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
  permissions: ['camera'],
});

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

test('taking a photo with the camera captures a frame', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Take a photo' }).click();
  await expect(page.locator('.camera-video')).toBeVisible();
  await page.waitForFunction(() => (document.querySelector('.camera-video') as HTMLVideoElement).videoWidth > 0);
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect(page.locator('.camera')).toHaveCount(0);
  await expect(page.getByTestId('photo').locator('canvas')).toBeVisible();
});

test('a non-image file shows a friendly error', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-input="upload"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.getByRole('alert')).toContainText('not an image');
});
