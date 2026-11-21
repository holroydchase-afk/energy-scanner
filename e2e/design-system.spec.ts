// ES-M2.4 Studio design system (Paper), the parts only a real browser can check. Written red first by qa-tdd.
// Runs on CI with CI's fonts (QA-R3 lesson: the sandbox's fonts are narrower than CI's).
import { readdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

type Screen = 'start' | 'palm' | 'palm result' | 'photo start' | 'photo result' | 'grown-ups';
const SCREENS: Screen[] = ['start', 'palm', 'palm result', 'photo start', 'photo result', 'grown-ups'];

/** Open the app fresh (first visit) and get to a screen the way a person would. */
async function open(page: Page, screen: Screen) {
  await page.goto('/');
  if (screen === 'palm') {
    await page.getByRole('radio', { name: /Photo scan/ }).click();
    await page.getByRole('radio', { name: /Palm scan/ }).click();
  }
  if (screen === 'palm result') {
    // The press-and-hold path (ES-M2.4 D1's Scan button is tested on its own).
    await page.getByRole('button', { name: /Press and hold/ }).focus();
    await page.keyboard.down('Space');
    await expect(page.getByTestId('energy-reading')).toBeVisible({ timeout: 10_000 });
    await page.keyboard.up('Space');
  }
  if (screen === 'photo start' || screen === 'photo result') await page.getByRole('radio', { name: /Photo scan/ }).click();
  if (screen === 'photo result') {
    await page.getByRole('button', { name: 'Try the sample' }).first().click();
    await expect(page.locator('canvas.aura')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('energy-reading')).toBeVisible();
  }
  if (screen === 'grown-ups') await page.locator('summary', { hasText: 'Grown-ups' }).click();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** A CSS color expression (e.g. "var(--accent)") as the browser computes it, read inside #app. */
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

/** DS-6: visible text under 17px, targets under 48x48, targets closer than 8px. */
function auditTargetsAndText() {
  const small: string[] = [];
  const name = (el: Element) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.textContent ?? '').trim().slice(0, 30) || el.getAttribute('aria-label') || ''}"`;
  const shown = (el: Element) => {
    if (!el.checkVisibility({ visibilityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.textContent?.trim() || !shown(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 16.95) small.push(`${name(el)} ${size}px`);
  }
  for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]), select')) {
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (shown(el) && size < 16.95) small.push(`${name(el)} ${size}px`);
  }
  // A checkbox or radio inside its label is hit through the whole label.
  const targets = [...document.querySelectorAll('a[href], button, summary, input, select, [role=radio], [role=button]')]
    .filter(shown)
    .map((el) => (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label') ? el.closest('label')! : el))
    .filter((el, i, all) => all.indexOf(el) === i);
  const tiny = targets
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width < 47.5 || r.height < 47.5)
    .map(({ el, r }) => `${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  const close: string[] = [];
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i]!;
      const b = targets[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const dx = Math.max(0, rb.left - ra.right, ra.left - rb.right);
      const dy = Math.max(0, rb.top - ra.bottom, ra.top - rb.bottom);
      const gap = dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
      if (gap < 7.5) close.push(`${name(a)} / ${name(b)} ${gap.toFixed(1)}px`);
    }
  }
  return { small, tiny, close };
}

const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const width of [390, 320]) {
  test.describe(`DS-6 at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 320 ? 640 : 844 } });
    for (const screen of SCREENS) {
      test(`DS-6 ${screen} at ${width}px: text 17px or more, targets 48x48 with 8px between`, async ({ page }) => {
        await open(page, screen);
        const { small, tiny, close } = await page.evaluate(auditTargetsAndText);
        expect.soft(small, 'visible text under 17px').toEqual([]);
        expect.soft(tiny, 'targets under 48x48').toEqual([]);
        expect.soft(close, 'targets closer than 8px').toEqual([]);
      });
    }
  });
}

test.describe('DS-10 at 320x640', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  for (const screen of SCREENS) {
    test(`DS-10 ${screen} at 320px has no sideways scroll`, async ({ page }) => {
      await open(page, screen);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });
  }

  test('DS-10 the five steps fit one row at 320px with 17px labels', async ({ page }) => {
    await open(page, 'start');
    const steps = await page.locator('.step').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), over: el.scrollWidth - el.clientWidth, size: parseFloat(getComputedStyle(el).fontSize) };
    }));
    expect(steps).toHaveLength(5);
    expect(new Set(steps.map((s) => s.top)).size, 'one row').toBe(1);
    expect(steps.map((s) => s.over), 'labels fit inside their step').toEqual([0, 0, 0, 0, 0]);
    for (const s of steps) expect(s.size).toBeGreaterThanOrEqual(17);
  });

  test('DS-10 the header (clock and pretend tag) fits at 320px with 17px words', async ({ page }) => {
    await open(page, 'grown-ups');
    await page.locator('[data-input="fake"]').fill('-180');
    await expect(page.locator('[data-pretend]')).toBeVisible();
    expect(await page.locator('.bt-head').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    const sizes = await page.locator('.clock, .clock *').evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(17);
  });
});

test.describe('DS-14 browser text size 200% at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const screen of SCREENS) {
    test(`DS-14 ${screen} scales with the browser text size and has no sideways scroll`, async ({ page }) => {
      // Stands in for the browser or phone text-size setting: the root font size doubles.
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style');
          s.textContent = 'html { font-size: 200% !important; }';
          document.head.append(s);
        });
      });
      await open(page, screen);
      expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize)), 'body text is 17px x 2').toBeCloseTo(34, 0);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });
  }
});

// ---------- DS-4: the CSS vars equal the theme.ts colors in every look ----------
interface Colors { [k: string]: string }
const VARS = ['bg', 'surface', 'ink', 'muted', 'line', 'fill', 'accent', 'accentInk', 'accentSoft', 'safe', 'safeSoft', 'danger', 'dangerText', 'onDanger', 'tabLine'];
const kebab = (k: string) => `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

async function loadPalette(): Promise<(dark: boolean, high?: boolean) => Colors> {
  // Variable path so typecheck passes before the engineer adds the module.
  const path = '../src/design/theme.ts';
  const mod = (await import(path).catch(() => null)) as { paletteFor?: (dark: boolean, high?: boolean) => Colors } | null;
  expect(typeof mod?.paletteFor, 'src/design/theme.ts exports paletteFor(dark, high)').toBe('function');
  return mod!.paletteFor!;
}

const LOOKS: Array<{ name: string; scheme: 'light' | 'dark'; contrast: 'no-preference' | 'more'; theme?: 'light' | 'dark'; dark: boolean; high: boolean }> = [
  { name: 'phone light', scheme: 'light', contrast: 'no-preference', dark: false, high: false },
  { name: 'phone dark', scheme: 'dark', contrast: 'no-preference', dark: true, high: false },
  { name: 'phone light + more contrast', scheme: 'light', contrast: 'more', dark: false, high: true },
  { name: 'phone dark + more contrast', scheme: 'dark', contrast: 'more', dark: true, high: true },
  { name: 'Look Light on a dark phone', scheme: 'dark', contrast: 'no-preference', theme: 'light', dark: false, high: false },
  { name: 'Look Dark on a light phone', scheme: 'light', contrast: 'no-preference', theme: 'dark', dark: true, high: false },
  { name: 'Look Light on a dark phone + more contrast', scheme: 'dark', contrast: 'more', theme: 'light', dark: false, high: true },
  { name: 'Look Dark on a light phone + more contrast', scheme: 'light', contrast: 'more', theme: 'dark', dark: true, high: true },
];

for (const look of LOOKS) {
  test(`DS-4 ${look.name}: the CSS colors equal the theme.ts palette`, async ({ page }) => {
    const paletteFor = await loadPalette();
    await page.emulateMedia({ colorScheme: look.scheme, contrast: look.contrast });
    await page.goto('/');
    await page.evaluate((t) => {
      if (t) document.documentElement.dataset.theme = t;
      else document.documentElement.removeAttribute('data-theme');
    }, look.theme);
    const want = paletteFor(look.dark, look.high);
    const got: Record<string, string> = {};
    const expected: Record<string, string> = {};
    for (const k of VARS) {
      got[k] = await color(page, `var(${kebab(k)}, transparent)`);
      expected[k] = rgb(want[k]!);
    }
    expect(got).toEqual(expected);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toContain(look.dark ? 'dark' : 'light');
  });
}

// ---------- DS-5: bundled font, nothing leaves the device ----------
test('DS-5 the page uses the bundled Atkinson Hyperlegible Next and no request leaves this origin', async ({ page }) => {
  const outside: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://localhost') && !u.startsWith('blob:') && !u.startsWith('data:')) outside.push(u);
  });
  await open(page, 'photo result');
  expect(outside).toEqual([]);
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family.replace(/'/g, '"')).toBe('"Atkinson Hyperlegible Next", system-ui, sans-serif');
  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => /Atkinson Hyperlegible Next/.test(f.family) && f.status === 'loaded').map((f) => f.weight));
  expect(loaded.length, 'the font actually loaded').toBeGreaterThan(0);
});

test('DS-5 the build ships only the 400, 500 and 600 font files, no italics', () => {
  const fonts = readdirSync(new URL('../dist/assets/', import.meta.url)).filter((f) => /\.(woff2?|ttf|otf)$/.test(f));
  const weights = [...new Set(fonts.map((f) => f.match(/-(\d00)-/)?.[1] ?? f))].sort();
  expect(weights).toEqual(['400', '500', '600']);
  expect(fonts.filter((f) => /italic/i.test(f))).toEqual([]);
});

// ---------- DS-7 / DS-8 / D5: what's colored, and the buttons ----------
const VIEW_SCREENS: Screen[] = ['start', 'palm result', 'photo start', 'photo result'];

for (const screen of VIEW_SCREENS) {
  test(`DS-7 ${screen}: plain logo and page, and the accent only on things you tap`, async ({ page }) => {
    await open(page, screen);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const ink = await color(page, 'var(--ink)');
    const logo = await page.locator('.logo').evaluate((el) => {
      const s = getComputedStyle(el);
      return { bg: s.backgroundImage, color: s.color, fill: s.getPropertyValue('-webkit-text-fill-color') };
    });
    expect(logo.bg).toBe('none');
    expect(logo.color).toBe(ink);
    expect(logo.fill === ink || logo.fill === logo.color).toBe(true);
    const gradients = await page.evaluate(() => {
      const els: Array<[string, Element, string | null]> = [['html', document.documentElement, null], ['body', document.body, null], ['body::before', document.body, '::before']];
      for (const el of document.querySelectorAll('.btn, .dropzone')) els.push([el.className, el, null]);
      return els.filter(([, el, pseudo]) => /gradient\(/.test(getComputedStyle(el, pseudo).backgroundImage)).map(([n]) => n);
    });
    expect(gradients).toEqual([]);
    const accent = await color(page, 'var(--accent)');
    const misuse = await page.evaluate((acc) => {
      const out: string[] = [];
      for (const el of document.body.querySelectorAll('*')) {
        if (!el.checkVisibility()) continue;
        if (el.closest('a, button, summary, input, select, label, [role=radio], [role=button]') || el.matches(':focus')) continue;
        const s = getComputedStyle(el);
        const hit = [
          s.color === acc && (el.textContent ?? '').trim() ? 'color' : '',
          s.backgroundColor === acc ? 'background' : '',
          parseFloat(s.borderTopWidth) > 0 && s.borderTopColor === acc ? 'border' : '',
          s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && s.outlineColor === acc ? 'outline' : '',
        ].filter(Boolean);
        if (hit.length) out.push(`${el.tagName.toLowerCase()}.${String(el.className)} ${hit.join('+')}`);
      }
      return out;
    }, accent);
    expect(misuse).toEqual([]);
  });

  test(`DS-8 ${screen}: no filled buttons, at most one tinted, each variant in its colors`, async ({ page }) => {
    await open(page, screen);
    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const [accent, accentSoft, fill, ink] = await Promise.all(['--accent', '--accent-soft', '--fill', '--ink'].map((v) => color(page, `var(${v})`)));
    const buttons = await page.locator('.btn').evaluateAll((els) => els.filter((el) => el.checkVisibility()).map((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { text: (el.textContent ?? '').trim(), cls: el.className, bg: s.backgroundColor, color: s.color, radius: parseFloat(s.borderTopLeftRadius), h: r.height };
    }));
    expect(buttons.filter((b) => /\bprimary\b/.test(b.cls)).map((b) => b.text), 'filled .btn.primary').toEqual([]);
    const tinted = buttons.filter((b) => /\btinted\b/.test(b.cls));
    expect(tinted.length, `tinted: ${tinted.map((b) => b.text).join(', ')}`).toBeLessThanOrEqual(1);
    const main: Partial<Record<Screen, RegExp>> = { start: /^See the aura demo$/, 'photo start': /^Try the sample$/, 'photo result': /^(Share|Save image)$/ };
    if (main[screen]) expect(tinted.map((b) => b.text)).toEqual([expect.stringMatching(main[screen]!)]);
    for (const b of tinted) expect({ text: b.text, bg: b.bg, color: b.color, pill: b.radius >= b.h / 2 }).toEqual({ text: b.text, bg: accentSoft, color: accent, pill: true });
    for (const b of buttons.filter((x) => /\bquiet\b/.test(x.cls))) expect({ text: b.text, color: b.color }).toEqual({ text: b.text, color: accent });
    for (const b of buttons.filter((x) => !/\b(tinted|quiet|primary)\b/.test(x.cls))) expect({ text: b.text, bg: b.bg, color: b.color }).toEqual({ text: b.text, bg: fill, color: ink });
  });
}

test('DS-8 palm result with Always Grey on: See every color is the one tinted button', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('alwaysGrey', 'true'));
  await open(page, 'palm result');
  const tinted = await page.locator('.btn.tinted').evaluateAll((els) => els.filter((el) => el.checkVisibility()).map((el) => (el.textContent ?? '').trim()));
  expect(tinted).toEqual(['See every color']);
});

test('DS-7 energy colors still drive the pad ring, beam and battery', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-22T12:00:00')); // noon: a colorful reading
  await open(page, 'palm result');
  const energy = await color(page, 'var(--energy)');
  expect(energy).not.toBe(await color(page, 'var(--accent)'));
  const got = await page.evaluate(() => ({
    ring: getComputedStyle(document.querySelector('.prog')!).stroke,
    beam: getComputedStyle(document.querySelector('.beam')!).backgroundColor,
    battery: getComputedStyle(document.querySelector('.batt .fill')!).backgroundColor,
  }));
  expect(got).toEqual({ ring: energy, beam: energy, battery: energy });
});

test('ES-M2.4 D5 (P6) the reading name is ink text with an energy swatch dot beside it', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-22T12:00:00'));
  await open(page, 'palm result');
  const ink = await color(page, 'var(--ink)');
  const name = await page.locator('.rc-name').evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, bg: s.backgroundImage, fill: s.getPropertyValue('-webkit-text-fill-color') };
  });
  expect(name.color).toBe(ink);
  expect(name.bg).toBe('none');
  expect(name.fill === ink || name.fill === name.color).toBe(true);
  const dot = page.getByTestId('energy-reading').locator('[aria-hidden="true"]').filter({ hasNotText: /./ }).first();
  await expect(dot, 'an energy swatch dot in the reading').toBeVisible();
  const paint = await dot.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.backgroundImage !== 'none' ? s.backgroundImage : s.backgroundColor;
  });
  expect(paint).not.toMatch(/^(rgba\(0, 0, 0, 0\)|transparent)$/);
});

// ---------- DS-9 / DS-11: focus and picked state ----------
test('DS-9 keyboard focus is a 2px solid accent outline and never moves the layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'grown-ups');
  // Each control's box at rest (nothing focused), in page coordinates.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelectorAll<HTMLElement>('a[href], button, summary, input, select, [tabindex]').forEach((el, i) => {
      const b = el.getBoundingClientRect();
      el.dataset.qaRest = JSON.stringify({ i, x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height });
    });
    document.body.dataset.qaPage = String(document.documentElement.scrollHeight);
  });
  await page.mouse.click(1, 1); // start keyboard navigation from the top of the page
  const accent = await color(page, 'var(--accent)');
  const seen = new Set<string>();
  const bad: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || !el.dataset.qaRest) return null;
      const s = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      return {
        rest: el.dataset.qaRest,
        name: `${el.tagName.toLowerCase()} "${((el.textContent ?? '').trim() || el.getAttribute('aria-label') || '').slice(0, 24)}"`,
        style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor,
        box: { x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height },
        pageGrew: String(document.documentElement.scrollHeight) !== document.body.dataset.qaPage,
      };
    });
    if (!r || seen.has(r.rest)) continue;
    seen.add(r.rest);
    const rest = JSON.parse(r.rest) as { x: number; y: number; w: number; h: number };
    if (r.style !== 'solid' || r.width !== '2px' || r.color !== accent) bad.push(`${r.name} outline ${r.style} ${r.width} ${r.color}`);
    const moved = (['x', 'y', 'w', 'h'] as const).some((k) => Math.abs(r.box[k] - rest[k]) > 0.5);
    if (moved || r.pageGrew) bad.push(`${r.name} moves when focused`);
  }
  expect(seen.size, 'tabbed through the controls').toBeGreaterThan(8);
  expect(bad).toEqual([]);
});

test('DS-11 the picked scan mode shows a 2px accent outline, not color alone', async ({ page }) => {
  await open(page, 'start');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const accent = await color(page, 'var(--accent)');
  const edge = (el: Element) => {
    const s = getComputedStyle(el);
    const outline = s.outlineStyle === 'solid' && s.outlineWidth === '2px' ? s.outlineColor : '';
    const border = s.borderTopStyle === 'solid' && s.borderTopWidth === '2px' ? s.borderTopColor : '';
    return { checked: el.getAttribute('aria-checked'), outline, border };
  };
  const palm = await page.getByRole('radio', { name: /Palm scan/ }).evaluate(edge);
  const photo = await page.getByRole('radio', { name: /Photo scan/ }).evaluate(edge);
  expect(palm.checked).toBe('true');
  expect(palm.outline === accent || palm.border === accent, `picked: ${JSON.stringify(palm)}`).toBe(true);
  expect(photo.checked).toBe('false');
  expect(photo.outline === accent || photo.border === accent, `not picked: ${JSON.stringify(photo)}`).toBe(false);
});

test('ES-M2.4 D1 (P4) a visible Scan button gives the same reading as press-and-hold', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('alwaysGrey', 'true'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Scan', exact: true }).click({ timeout: 5_000 });
  await expect(page.getByTestId('energy-reading')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('energy-reading')).toContainText('Grey Energy');
});
