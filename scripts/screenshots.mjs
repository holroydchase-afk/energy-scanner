// Captures portfolio screenshots of the built app with headless Chromium.
//   npm run build && node scripts/screenshots.mjs [path/to/person-photo.jpg]
// Without a photo it captures only the start screen. Only pass a photo that is OK to publish.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const photo = process.argv[2];
const out = process.env.OUT || 'docs/screenshots';
const PORT = 4174;
mkdirSync(out, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const url = `http://localhost:${PORT}/`;
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(url)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
try {
  const desktop = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
  await desktop.goto(url);
  await desktop.waitForTimeout(500);
  await desktop.screenshot({ path: `${out}/start-desktop.png` });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await mobile.goto(url);
  await mobile.waitForTimeout(500);
  await mobile.screenshot({ path: `${out}/start-mobile.png` });

  if (photo) {
    // Scanning state: hold the scan by delaying the model download.
    const scanning = await browser.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2 });
    await scanning.route('**/selfie_segmenter.tflite', async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      await route.continue();
    });
    await scanning.goto(url);
    await scanning.locator('[data-input="upload"]').setInputFiles(photo);
    await scanning.waitForTimeout(1200);
    await scanning.screenshot({ path: `${out}/scanning.png` });
    await scanning.close();

    await desktop.setViewportSize({ width: 1100, height: 1150 });
    await desktop.locator('[data-input="upload"]').setInputFiles(photo);
    await desktop.waitForSelector('canvas.aura', { timeout: 60_000 });
    await desktop.waitForTimeout(2500);
    await desktop.screenshot({ path: `${out}/result-desktop.png` });
    for (const id of ['radiant', 'passion', 'mystic', 'calm', 'vital', 'spectrum']) {
      await desktop.click(`[data-energy="${id}"]`);
      await desktop.waitForTimeout(600);
      await desktop.locator('canvas.aura').screenshot({ path: `${out}/aura-${id}.png` });
    }

    await mobile.locator('[data-input="upload"]').setInputFiles(photo);
    await mobile.waitForSelector('canvas.aura', { timeout: 60_000 });
    await mobile.waitForTimeout(2500);
    await mobile.screenshot({ path: `${out}/result-mobile.png`, fullPage: true });
  }
  console.log(`screenshots written to ${out}/`);
} finally {
  await browser.close();
  server.kill();
}
