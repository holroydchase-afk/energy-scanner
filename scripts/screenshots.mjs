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
 * start screens; the aura pages keep the real clock (a fixed clock stalls headless screenshots
 * of the live canvas) and set bedtime 8 hours away instead, so the reading is Rainbow.
 */
async function open(device, { alwaysGrey = true, evening = false } = {}) {
  const page = await browser.newPage(device);
  if (evening) await page.clock.setFixedTime(new Date('2026-10-22T19:00:00'));
  const later = new Date(Date.now() + 8 * 3600e3);
  const bed = `${String(later.getHours()).padStart(2, '0')}:${String(later.getMinutes()).padStart(2, '0')}`;
  await page.addInitScript(
    ([grey, bedtime]) => {
      localStorage.setItem('alwaysGrey', JSON.stringify(grey));
      if (!grey) localStorage.setItem('bed', JSON.stringify(bedtime));
    },
    [alwaysGrey, bed],
  );
  await page.goto(url);
  return page;
}

async function sample(page) {
  await page.getByRole('radio', { name: /Photo scan/ }).click();
  await page.getByRole('button', { name: 'Try the sample' }).click({ force: true });
  await page.waitForSelector('canvas.aura', { timeout: 60_000 });
  await page.waitForTimeout(2500);
}

try {
  // Start screen and a palm scan reading (Always Grey on, the default).
  const start = await open(MOBILE, { evening: true });
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

  // Photo scan of the sample: Grey (the default) and Rainbow (bedtime far off, nothing done).
  const grey = await open(MOBILE);
  await sample(grey);
  await grey.locator('canvas.aura').screenshot({ path: `${out}/aura-grey.png` });
  // One scanner at a time: software GL in headless Chromium struggles with several.
  await grey.close();

  const rainbow = await open(MOBILE, { alwaysGrey: false });
  await sample(rainbow);
  await rainbow.locator('canvas.aura').screenshot({ path: `${out}/aura-rainbow.png` });
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
        <p style="font-size:26px;color:#b9b3d9;margin:24px 0 0">Runs on the phone. Photos never leave the device.</p>
      </div>
    </body>`);
  await card.screenshot({ path: 'public/og.png' });
  console.log(`screenshots written to ${out}/ and public/og.png`);
} finally {
  await browser.close();
  server.kill();
}
