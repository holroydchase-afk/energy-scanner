// Captures the README screenshots and the link preview image from the built app, using the
// illustrated sample (no photos of real people).
//   npm run screenshots
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

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
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/**
 * A fresh page. `alwaysGrey` is the grown-up switch. `evening` fixes the clock at 7:00pm for the
 * start screens. The aura pages keep a running clock (a fixed clock stalls headless screenshots of
 * the live canvas) but shifted to noon, with the default 8pm bedtime, so the reading is Rainbow.
 */
async function open(device, { alwaysGrey = true, evening = false } = {}) {
  const page = await browser.newPage(device);
  if (evening) await page.clock.setFixedTime(new Date('2026-10-22T19:00:00'));
  else {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    await page.addInitScript((offset) => {
      const RealDate = Date;
      globalThis.Date = class extends RealDate {
        constructor(...args) {
          super(...(args.length ? args : [RealDate.now() + offset]));
        }
        static now() {
          return RealDate.now() + offset;
        }
      };
    }, noon.getTime() - Date.now());
  }
  await page.addInitScript((grey) => localStorage.setItem('alwaysGrey', JSON.stringify(grey)), alwaysGrey);
  await page.goto(url);
  return page;
}

async function sample(page) {
  await page.getByRole('radio', { name: /Photo scan/ }).click();
  await page.getByRole('button', { name: 'Try the sample' }).click({ force: true });
  await page.waitForSelector('canvas.aura', { timeout: 60_000 });
  await page.waitForTimeout(2500);
  // Square corners, so the README image has no page color in its corners (GitHub's light theme).
  await page.locator('canvas.aura').evaluate((c) => (c.style.borderRadius = '0'));
}

/** Just the aura canvas, cropped inside its edges so no page color shows at a fractional border. */
async function auraShot(page, path) {
  const box = await page.locator('canvas.aura').boundingBox();
  const x = Math.ceil(box.x);
  const y = Math.ceil(box.y);
  const clip = { x, y, width: Math.floor(box.x + box.width) - x, height: Math.floor(box.y + box.height) - y };
  await page.screenshot({ path, clip });
}

try {
  // Start screen and a palm scan reading at 7pm, as a first visit sees it (Always Grey off).
  const start = await open(MOBILE, { evening: true, alwaysGrey: false });
  await start.waitForTimeout(300);
  await start.screenshot({ path: `${out}/start-mobile.png` });
  await start.locator('.pad').focus();
  await start.keyboard.down('Space');
  await start.waitForTimeout(2900);
  await start.keyboard.up('Space');
  await start.waitForTimeout(500);
  await start.locator('.pad').scrollIntoViewIfNeeded();
  await start.screenshot({ path: `${out}/palm-mobile.png`, fullPage: true });
  await start.close();

  // Photo scan of the sample: Grey (the grown-up switch on) and Rainbow (bedtime far off, nothing done).
  const grey = await open(MOBILE);
  await sample(grey);
  await auraShot(grey, `${out}/aura-grey.png`);
  // One scanner at a time: software GL in headless Chromium struggles with several.
  await grey.close();

  const rainbow = await open(MOBILE, { alwaysGrey: false });
  await sample(rainbow);
  await auraShot(rainbow, `${out}/aura-rainbow.png`);
  await rainbow.close();

  // Link preview (1200x630): the Rainbow aura beside the name and promise.
  const aura = readFileSync(`${out}/aura-rainbow.png`).toString('base64');
  const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await card.setContent(`
    <body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 72px;box-sizing:border-box;
      background:radial-gradient(ellipse at 70% 0%,#1d2457,#07060d 70%);color:#f3f0ff;font-family:Inter,system-ui,sans-serif">
      <img src="data:image/png;base64,${aura}" style="height:540px;border-radius:24px" />
      <div>
        <div style="font-size:72px;font-weight:800;line-height:1;background:linear-gradient(90deg,#ffd36e,#ff6ec7,#8b7bff,#4fe3ff);-webkit-background-clip:text;color:transparent">Energy Scanner</div>
        <p style="font-size:34px;line-height:1.3;margin:28px 0 0">A bedtime helper for kids: finish the steps, then scan.</p>
        <p style="font-size:26px;color:#b9b3d9;margin:24px 0 0">A live AI aura that runs on your device. Nothing is uploaded.</p>
      </div>
    </body>`);
  await card.screenshot({ path: 'public/og.png' });
  console.log(`screenshots written to ${out}/ and public/og.png`);
} finally {
  await browser.close();
  server.kill();
}
