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
    await expect(page.locator('p', { hasText: "A kids' bedtime routine" })).toHaveText(/^\s*A kids' bedtime routine with an on-device AI aura\.\s*(See the aura demo)?\s*$/);
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
    test(`AC-TXT2 TXT-R2 each step has a 20px check circle: hollow --muted (TXT-R19, was --line), then filled --accent (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      const muted = await color(page, 'var(--muted)'); // AC-TXT19 replaced --line (1.1:1) with --muted
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
        expect(c.border).toBe(muted);
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
    // QA-R1: measure with the bundled font, not whatever fallback the machine has (CI's is wider).
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
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

// ---------- Fix round after the rescore (TXT-R19, R20) ----------
/** WCAG contrast between two CSS colors as painted (any color syntax, alpha composited over `under`). */
function contrast(page: Page, fg: string, bg: string, under: string): Promise<number> {
  return page.evaluate(({ f, b, u }) => {
    const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const paint = (...layers: string[]) => {
      c.clearRect(0, 0, 1, 1);
      for (const l of layers) { c.fillStyle = l; c.fillRect(0, 0, 1, 1); }
      const [r = 0, g = 0, bl = 0] = c.getImageData(0, 0, 1, 1).data;
      const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
    };
    const back = paint(u, b);
    const front = paint(u, b, f);
    return (Math.max(back, front) + 0.05) / (Math.min(back, front) + 0.05);
  }, { f: fg, b: bg, u: under });
}

test.describe('TXT-R19 the empty check circle is visible', () => {
  test.use(PHONE);
  for (const scheme of ['light', 'dark'] as const) {
    test(`AC-TXT19 TXT-R19 an unticked step's check circle border reaches 3:1 against the step (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/');
      const steps = page.locator('.step[aria-pressed="false"]');
      await expect(steps).toHaveCount(5);
      for (let i = 0; i < 5; i++) {
        const c = await steps.nth(i).evaluate((step) => {
          const check = step.querySelector('.check')!;
          let under = 'white';
          for (let el = step.parentElement; el; el = el.parentElement) {
            const bg = getComputedStyle(el).backgroundColor;
            if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { under = bg; break; }
          }
          return { border: getComputedStyle(check).borderTopColor, width: parseFloat(getComputedStyle(check).borderTopWidth), step: getComputedStyle(step).backgroundColor, under };
        });
        expect(c.width, 'the circle has a border').toBeGreaterThanOrEqual(1.5);
        const ratio = await contrast(page, c.border, c.step, c.under);
        expect(ratio, `step ${i}: ${c.border} on ${c.step} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
      }
      // The other direction: a ticked step still uses the accent fill.
      await page.getByRole('button', { name: 'Teeth' }).click();
      const accent = await color(page, 'var(--accent)');
      await expect.poll(() => page.locator('[data-step="teeth"] .check').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(accent);
    });
  }
});

for (const width of [390, 320]) {
  test(`AC-TXT20 TXT-R20 the tagline never leaves one or two words alone on its last line at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const lines = await page.locator('.tagline').evaluate((el) => {
      const text = el.firstChild as Text;
      const words: { w: string; top: number }[] = [];
      const re = /\S+/g;
      for (let m = re.exec(text.data); m; m = re.exec(text.data)) {
        const r = document.createRange();
        r.setStart(text, m.index);
        r.setEnd(text, m.index + m[0].length);
        words.push({ w: m[0], top: Math.round(r.getBoundingClientRect().top) });
      }
      const byLine = new Map<number, string[]>();
      for (const { w, top } of words) {
        const key = [...byLine.keys()].find((k) => Math.abs(k - top) < 4) ?? top;
        byLine.set(key, [...(byLine.get(key) ?? []), w]);
      }
      return [...byLine.values()].map((ws) => ws.join(' '));
    });
    if (lines.length > 1) expect(lines.at(-1)!.split(' ').length, JSON.stringify(lines)).toBeGreaterThanOrEqual(3);
  });
}
