// ES-M2.5 "less text" (docs/reviews/2026-11-22-less-text.md, Scope (staff-pm)): the parts only a real
// browser can check (layout, CSS visibility, colors, animation). Written red first by qa-tdd.
// The tap-never-fails test (AC-TXT4, commit 4b) is on its own in e2e/less-text-tap.spec.ts.
// Contract: each step's check circle is `.step .check`; "visually hidden" is the `visually-hidden` class.
import { expect, test, type Page } from '@playwright/test';

const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } as const;

/** Words a sighted person can see on the whole page (scrolling allowed): rendered text, not clipped to 1px. */
function visibleWords(page: Page, selector = 'body'): Promise<number> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel)!;
    let n = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement;
      if (!el || !t.textContent?.trim() || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      n += t.textContent.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
    }
    return n;
  }, selector);
}

/** The visible text inside an element (same visibility rule as visibleWords). */
function visibleText(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.querySelector(sel)!, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement;
      if (!el || !t.textContent?.trim() || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      out.push(t.textContent);
    }
    return out.join(' ').replace(/\s+/g, ' ').trim();
  }, selector);
}

/** A CSS color expression as the browser computes it, read inside #app. */
function color(page: Page, expr: string): Promise<string> {
  return page.evaluate((v) => {
    const p = document.createElement('i');
    p.style.color = v;
    (document.querySelector('#app') ?? document.body).append(p);
    const c = getComputedStyle(p).color;
    p.remove();
    return c;
  }, expr);
}

// ---------- Step 1: strings ----------
for (const size of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`AC-TXT1 TXT-R1 the first screen says what it is in one line at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('p', { hasText: 'A bedtime routine for kids' })).toHaveText(/^\s*A bedtime routine for kids, with an AI aura that runs on your device\.\s*(See the aura demo)?\s*$/);
    await expect(page.getByText('Nothing is uploaded')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'See the aura demo' })).toBeVisible();
  });
}

for (const phone of [true, false]) {
  test(`AC-TXT8 TXT-R8 photo mode has one way to start the sample (${phone ? 'phone' : 'laptop'})`, async ({ browser }) => {
    const ctx = await browser.newContext(phone ? PHONE : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.getByRole('radio', { name: 'Photo' }).click();
    await expect(page.locator('[data-action="demo"]')).toBeHidden();
    const starters = page.getByRole('button', { name: /sample|aura demo/i });
    const visible = await starters.evaluateAll((els) => els.filter((e) => (e as HTMLElement).checkVisibility()).length);
    expect(visible).toBe(1);
    // The other direction: on palm the demo button is there.
    await page.getByRole('radio', { name: 'Palm' }).click();
    await expect(page.locator('[data-action="demo"]')).toBeVisible();
    await ctx.close();
  });
}

test.describe('AC-TXT17 on a laptop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test('AC-TXT17 TXT-R17 while the photo scans, "Scanning energy…" is for screen readers only', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Photo' }).click();
    await page.getByRole('button', { name: 'Try the sample' }).click();
    const status = page.getByRole('status');
    await expect(status).toHaveText('Scanning energy…');
    const box = await status.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    expect(box.w <= 1 && box.h <= 1, `status box ${JSON.stringify(box)}`).toBe(true);
  });
});

// ---------- Step 2: icons and check circles ----------
test.describe('AC-TXT2 check circles', () => {
  test.use(PHONE);
  for (const scheme of ['light', 'dark'] as const) {
    test(`AC-TXT2 TXT-R2 each step has a 20px check circle: hollow --line, then filled --accent (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      const line = await color(page, 'var(--line)');
      const accent = await color(page, 'var(--accent)');
      const checks = page.locator('.step .check');
      await expect(checks).toHaveCount(5);
      const read = (i: number) => checks.nth(i).evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height, border: s.borderTopColor, fill: s.backgroundColor, pressed: el.closest('.step')!.getAttribute('aria-pressed') };
      });
      for (let i = 0; i < 5; i++) {
        const c = await read(i);
        expect(Math.abs(c.w - 20), `width ${c.w}`).toBeLessThanOrEqual(2);
        expect(Math.abs(c.h - 20), `height ${c.h}`).toBeLessThanOrEqual(2);
        expect(c.pressed).toBe('false');
        expect(c.border).toBe(line);
        expect(c.fill).toBe('rgba(0, 0, 0, 0)');
      }
      await page.getByRole('button', { name: 'Teeth' }).click();
      const teeth = await page.locator('[data-step="teeth"] .check').evaluate((el) => ({
        fill: getComputedStyle(el).backgroundColor,
        pressed: el.closest('.step')!.getAttribute('aria-pressed'),
      }));
      expect(teeth).toEqual({ fill: accent, pressed: 'true' });
      // The other direction: an unticked step stays hollow.
      const bath = await page.locator('[data-step="bath"] .check').evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bath).toBe('rgba(0, 0, 0, 0)');
      await expect(page.getByText(/Tap each step|\d of \d/)).toHaveCount(0);
    });
  }
});

test('AC-TXT14 TXT-R14 the mode switch reads Palm and Photo in a group named "Scan with"', async ({ page }) => {
  await page.goto('/');
  const group = page.getByRole('radiogroup', { name: 'Scan with' });
  await expect(group.getByRole('radio', { name: 'Palm', exact: true })).toBeVisible();
  await expect(group.getByRole('radio', { name: 'Photo', exact: true })).toBeVisible();
});

test.describe('TXT-R9 icon sizes on a phone', () => {
  test.use(PHONE);
  test('TXT-R9 icons are 28px in the steps, 20px in the mode switch and 96px on the pad', async ({ page }) => {
    await page.goto('/');
    const size = (sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(await size('.step svg:not(.check svg)')).toEqual([28, 28, 28, 28, 28]);
    expect(await size('[data-mode] svg')).toEqual([20, 20]);
    expect(await size('.pad svg:not(.ring)')).toEqual([96]);
  });
});

// ---------- Step 3: silent pad and word budgets ----------
test.describe('step 3 on a touch phone', () => {
  test.use(PHONE);

  test('AC-TXT1 TXT-R1, R3 the Scan button is in view on load at 390x844', async ({ page }) => {
    await page.goto('/');
    const box = (await page.getByRole('button', { name: 'Scan', exact: true }).boundingBox())!;
    expect(box.y + box.height, `Scan bottom ${box.y + box.height}`).toBeLessThanOrEqual(844);
  });

  test('AC-TXT1c the palm first screen shows 45 words or fewer', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    expect(await visibleWords(page)).toBeLessThanOrEqual(45);
  });

  test('AC-TXT1c the photo pick screen shows 50 words or fewer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Photo' }).click();
    await expect(page.getByTestId('dropzone')).toBeVisible();
    expect(await visibleWords(page)).toBeLessThanOrEqual(50);
  });

  test('AC-TXT3 TXT-R3 the pad hint is never shown: idle, scanning, done', async ({ page }) => {
    await page.goto('/');
    const hint = page.locator('[data-hint]');
    await expect(hint).toHaveClass(/visually-hidden/);
    await page.getByRole('button', { name: 'Scan', exact: true }).click();
    await expect(hint).toHaveText('Scanning');
    await expect(hint).toHaveClass(/visually-hidden/);
    await expect(page.getByTestId('energy-reading')).toBeVisible({ timeout: 10_000 });
    await expect(hint).toHaveText('Done');
    await expect(hint).toHaveClass(/visually-hidden/);
    await expect(page.getByText(/Scan complete|keep holding|Put your hand/)).toHaveCount(0);
  });
});

test('AC-TXT3 TXT-R3 the idle ring breathes, and is still with reduced motion', async ({ page }) => {
  await page.goto('/');
  const running = () => page.locator('.pad svg.ring').evaluate((el) => el.getAnimations({ subtree: true }).length);
  expect(await running(), 'idle ring animates').toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  expect(await running(), 'no animation with reduced motion').toBe(0);
});

// ---------- Step 4: drag state ----------
for (const phone of [true, false]) {
  test(`AC-TXT7 TXT-R7 the photo pick screen is only its buttons, and "Drop to scan" shows only while dragging (${phone ? 'phone' : 'laptop'})`, async ({ browser }) => {
    const ctx = await browser.newContext(phone ? PHONE : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.getByRole('radio', { name: 'Photo' }).click();
    const zone = page.getByTestId('dropzone');
    const labels = await zone.getByRole('button').evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).checkVisibility()).map((e) => (e.textContent ?? '').trim()),
    );
    expect(await visibleText(page, '[data-testid="dropzone"]')).toBe(labels.join(' '));
    const drop = page.getByText('Drop to scan');
    await expect(drop).toBeHidden();

    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    await page.dispatchEvent('body', 'dragover', { dataTransfer });
    await expect(drop).toBeVisible();
    const accent = await color(page, 'var(--accent)');
    const edge = await zone.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        outline: [s.outlineStyle, s.outlineWidth, s.outlineColor],
        border: [s.borderTopStyle, s.borderTopWidth, s.borderTopColor],
      };
    });
    const want = ['dashed', '2px', accent];
    expect(JSON.stringify(edge.outline) === JSON.stringify(want) || JSON.stringify(edge.border) === JSON.stringify(want), JSON.stringify(edge)).toBe(true);

    await page.dispatchEvent('body', 'dragleave', { dataTransfer });
    await expect(drop).toBeHidden();
    await page.dispatchEvent('body', 'dragover', { dataTransfer });
    await expect(drop).toBeVisible();
    await page.dispatchEvent('body', 'drop', { dataTransfer });
    await expect(drop).toBeHidden();
    await ctx.close();
  });
}

// ---------- Step 5a: "Keep holding" (always ships). The 4b commit replaces this test. ----------
test('AC-TXT4b an early release shows exactly "Keep holding", and no reading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.pad').hover();
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.up();
  const hint = page.locator('[data-hint]');
  await expect(hint).toHaveText('Keep holding');
  await expect(hint).toBeVisible();
  expect(await hint.evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(1);
  await expect(page.getByText(/Too fast/)).toHaveCount(0);
  await page.waitForTimeout(3_000);
  await expect(page.getByTestId('energy-reading')).toBeHidden();
});
