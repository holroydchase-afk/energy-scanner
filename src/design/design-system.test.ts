// ES-M2.4 Studio design system (Paper). Written red first by qa-tdd; the engineer makes these pass.
// Source of truth: STUDIO-CORE.md and tokens.json from Hearth (copied to src/design/tokens.json, see README.md).
//
// Contract the tests assume (engineer, please keep these names):
// - Color vars on :root, kebab-case of the token names: --bg --surface --ink --muted --line --fill --accent
//   --accent-ink --accent-soft --safe --safe-soft --danger --danger-text --on-danger --tab-line.
// - Space --space-xs..--space-xxl, corners --radius-small/-medium/-photo/-pill, --target.
// - Type --text-base/--leading-base, --text-title/--leading-title, --text-display/--leading-display,
//   --text-large-title (sizes in rem, 16px = 1rem, so the browser's text size scales them: DS-14).
// - src/design/theme.ts exports paletteFor(dark: boolean, high?: boolean): Colors (Paper only), written from
//   the STUDIO-CORE.md section 3 recipe and the WCAG 2 formula (no Hearth code copied).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp, type AppHandle, type AppOptions } from '../app';
import { drawCaptioned } from '../export/export';
import tokens from './tokens.json';

// Test-only stand-in: jsdom has no WebGL or canvas pixels.
vi.mock('../aura/renderer', () => ({
  createAuraRenderer: () => ({
    canvas: document.createElement('canvas'),
    kind: 'webgl',
    render: () => undefined,
    setEnergy: () => undefined,
    setIntensity: () => undefined,
    destroy: () => undefined,
  }),
}));

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const CSS = read('../style.css');

// ---------- a small CSS reader (no dependency) ----------
interface Rule { selector: string; media: string[]; decls: Array<[string, string]> }

function splitTop(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (const ch of text) {
    if (quote) { if (ch === quote) quote = ''; cur += ch; continue; }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseCss(src: string): Rule[] {
  const css = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  const walk = (text: string, media: string[]) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open < 0) break;
      let prelude = text.slice(i, open);
      prelude = prelude.slice(prelude.lastIndexOf(';') + 1).trim();
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') depth--;
        j++;
      }
      const body = text.slice(open + 1, j - 1);
      if (/^@(media|supports)/.test(prelude)) walk(body, [...media, prelude]);
      else if (!/^@(keyframes|font-face)/.test(prelude)) {
        const decls = splitTop(body, ';').map((d) => {
          const k = d.indexOf(':');
          return [d.slice(0, k).trim().toLowerCase(), d.slice(k + 1).trim()] as [string, string];
        });
        rules.push({ selector: prelude, media, decls });
      }
      i = j;
    }
  };
  walk(css, []);
  return rules;
}

const RULES = parseCss(CSS);
const ROOT_VARS = new Map<string, string>(
  RULES.filter((r) => !r.media.length && /^(:root|html)$/.test(r.selector)).flatMap((r) => r.decls),
);
const STACK = '"Atkinson Hyperlegible Next", system-ui, sans-serif';
const sameStack = (v: string) => v.replace(/'/g, '"').replace(/\s+/g, ' ').trim() === STACK;

/** px value of a token var: px as is, rem at 16px. NaN if missing or another unit. */
function px(value: string | undefined): number {
  const m = value?.trim().match(/^(-?\d*\.?\d+)(px|rem)$/);
  if (!m) return NaN;
  return m[2] === 'rem' ? Number(m[1]) * 16 : Number(m[1]);
}

// ---------- WCAG 2 contrast, the test's own oracle ----------
function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('ES-M2.4 design tokens', () => {
  it('DS-1 :root carries the studio space, corner, target and type tokens, read from tokens.json', () => {
    const got: Record<string, number> = {};
    const want: Record<string, number> = {};
    for (const [k, v] of Object.entries(tokens.space)) { want[`--space-${k}`] = v; got[`--space-${k}`] = px(ROOT_VARS.get(`--space-${k}`)); }
    for (const k of ['small', 'medium', 'photo', 'pill'] as const) { want[`--radius-${k}`] = tokens.radius[k]; got[`--radius-${k}`] = px(ROOT_VARS.get(`--radius-${k}`)); }
    want['--target'] = tokens.target.min;
    got['--target'] = px(ROOT_VARS.get('--target'));
    // Body from tokens.json; title/display line heights and the large title from STUDIO-CORE.md section 4.
    const type: Record<string, number> = {
      '--text-base': tokens.type.default.base,
      '--leading-base': tokens.type.default.line,
      '--text-title': tokens.type.default.title,
      '--leading-title': 28,
      '--text-display': tokens.type.default.display,
      '--leading-display': 34,
      '--text-large-title': 34,
    };
    for (const [k, v] of Object.entries(type)) { want[k] = v; got[k] = px(ROOT_VARS.get(k)); }
    expect(got).toEqual(want);
    expect(want['--space-xxl']).toBe(32); // tokens.json really was read
  });

  it('DS-2 sizes, gaps, padding, margins and corners use token vars (graphics allowlisted)', () => {
    // Content graphics keep their own numbers: the palm pad, its ring, hand and beam, the photo-mode orb,
    // the scan line, the battery's drawing, the step emoji, and the screen-reader-only helper.
    const ALLOW = /(\.(pad|orb|hand|beam|ring|prog|scanline|ic|visually-hidden)(?![\w-]))|(\.batt \.(cell|fill))/;
    const PROPS = /^(font-size|line-height|font|gap|row-gap|column-gap|padding(-[a-z-]+)?|margin(-[a-z-]+)?|border(-[a-z]+)*-radius)$/;
    const bad: string[] = [];
    for (const r of RULES) {
      if (splitTop(r.selector, ',').every((s) => ALLOW.test(s))) continue;
      for (const [prop, value] of r.decls) {
        if (!PROPS.test(prop) || /^(inherit|initial|unset|normal|auto|0)$/.test(value)) continue;
        let v = value;
        for (let n = 0; n < 5; n++) v = v.replace(/\b(var|env)\([^()]*\)/g, ' ');
        for (const m of v.matchAll(/(-?\d*\.?\d+)([a-z%]*)/g)) {
          const [, num, unit] = m;
          if (Number(num) === 0) continue;
          if (['%', 'vw', 'vh', 'svh', 'dvh'].includes(unit!)) continue;
          if (!unit && prop !== 'line-height') continue; // multipliers in calc(), font weights
          bad.push(`${r.selector} { ${prop}: ${value} }`);
          break;
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('DS-14 type sizes are in rem and the page root keeps the browser text size', () => {
    for (const k of ['--text-base', '--text-title', '--text-display', '--text-large-title']) {
      expect(ROOT_VARS.get(k) ?? 'missing', k).toMatch(/^\d*\.?\d+rem$/);
    }
    expect(ROOT_VARS.get('--text-base')).toBe('1.0625rem');
    const rootSize = RULES.filter((r) => /^(:root|html)$/.test(r.selector)).flatMap((r) => r.decls).filter(([p]) => p === 'font-size');
    for (const [, v] of rootSize) expect(v, 'html font-size must not be px').not.toMatch(/px/);
  });
});

// ---------- DS-3: contrast in all four Paper looks ----------
interface Colors {
  bg: string; surface: string; ink: string; muted: string; line: string; fill: string; accent: string;
  accentInk: string; accentSoft: string; safe: string; safeSoft: string; danger: string; dangerText: string;
  onDanger: string; tabLine: string; scrim: string; photo: string;
}
interface ThemeModule { paletteFor(dark: boolean, high?: boolean): Colors }
// A variable path (not import.meta.glob, whose result Vitest caches with this file's transform) so the
// test goes green as soon as the module exists, and typecheck passes before it does.
const THEME_PATH = './theme.ts';
async function loadTheme(): Promise<ThemeModule> {
  const mod = (await import(/* @vite-ignore */ THEME_PATH).catch(() => null)) as Partial<ThemeModule> | null;
  expect(typeof mod?.paletteFor, 'src/design/theme.ts must export paletteFor(dark, high): port Hearth theme.ts color math (DS-3)').toBe('function');
  return mod as ThemeModule;
}

describe('DS-3 Paper contrast (template: Hearth themes.test.ts)', () => {
  it('DS-3 light and dark equal the Paper colors in tokens.json', async () => {
    const { paletteFor } = await loadTheme();
    const pick = (c: Colors, keys: string[]) => Object.fromEntries(keys.map((k) => [k, c[k as keyof Colors]]));
    const keys = Object.keys(tokens.themes.paper.light);
    expect(pick(paletteFor(false), keys)).toEqual(tokens.themes.paper.light);
    expect(pick(paletteFor(true), keys)).toEqual(tokens.themes.paper.dark);
  });

  for (const [name, dark, high] of [['light', false, false], ['dark', true, false], ['light + high contrast', false, true], ['dark + high contrast', true, true]] as const) {
    it(`DS-3 Paper ${name} meets the WCAG 2 ratios`, async () => {
      const { paletteFor } = await loadTheme();
      const c = paletteFor(dark, high);
      const strong = high ? 7 : 4.5;
      const pairs: Array<[string, string, string, number]> = [
        ['ink on bg', c.ink, c.bg, 7],
        ['muted on bg', c.muted, c.bg, strong],
        ['muted on fill', c.muted, c.fill, strong],
        ['accent on bg', c.accent, c.bg, 4.5],
        ['accent on fill', c.accent, c.fill, 4.5],
        ['accent on accentSoft', c.accent, c.accentSoft, 4.5],
        ['accentInk on accent', c.accentInk, c.accent, strong],
        ['safe on bg', c.safe, c.bg, 4.5],
        ['danger on bg', c.danger, c.bg, 4.5],
        ['dangerText on bg', c.dangerText, c.bg, 4.5],
        ['tabLine on bg', c.tabLine, c.bg, 3],
        ['tabLine on surface', c.tabLine, c.surface, 3],
      ];
      if (high) pairs.push(['line on bg', c.line, c.bg, 4.5]);
      const fails = pairs.filter(([, a, b, min]) => ratio(a, b) < min).map(([what, a, b, min]) => `${what} ${ratio(a, b).toFixed(2)} < ${min}`);
      expect(fails).toEqual([]);
    });
  }
});

describe('DS-4 / DS-5 / DS-7 stylesheet rules', () => {
  it('DS-4 style.css has light, dark, high contrast and data-theme overrides, citing tokens.json and theme.ts', () => {
    expect(CSS).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
    expect(CSS).toMatch(/@media[^{]*\(prefers-contrast:\s*more\)/);
    expect(CSS).toMatch(/\[data-theme=["']?light["']?\]/);
    expect(CSS).toMatch(/\[data-theme=["']?dark["']?\]/);
    const comments = (CSS.match(/\/\*[\s\S]*?\*\//g) ?? []).join('\n');
    expect(comments).toMatch(/tokens\.json/);
    expect(comments).toMatch(/theme\.ts/);
  });

  it('DS-5 the font is "Atkinson Hyperlegible Next", system-ui, sans-serif everywhere', () => {
    const root = [...ROOT_VARS.entries()].filter(([p]) => p === 'font-family' || p === '--font-family');
    expect(root.some(([, v]) => sameStack(v)), ':root sets the studio font stack').toBe(true);
    const bad: string[] = [];
    for (const r of RULES) {
      for (const [prop, value] of r.decls) {
        if (prop === 'font-family' && !sameStack(value) && !/^(inherit|var\(--font-family\))$/.test(value)) bad.push(`${r.selector} { font-family: ${value} }`);
        if (prop === 'font' && value !== 'inherit' && !/var\(--font-family\)$/.test(value) && !value.replace(/'/g, '"').endsWith(STACK)) bad.push(`${r.selector} { font: ${value} }`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('DS-5 no weight above 600, no italics, no all caps, no letter-spacing', () => {
    const bad: string[] = [];
    for (const r of RULES) {
      for (const [prop, value] of r.decls) {
        const weight = prop === 'font-weight' ? value : prop === 'font' ? (value.match(/\b([1-9]00)\b/)?.[1] ?? '') : '';
        if (/^(bold|bolder)$/.test(weight) || Number(weight) > 600) bad.push(`${r.selector} { ${prop}: ${value} }`);
        if ((prop === 'font-style' || prop === 'font') && /\b(italic|oblique)\b/.test(value)) bad.push(`${r.selector} { ${prop}: ${value} }`);
        if (prop === 'text-transform' && value !== 'none') bad.push(`${r.selector} { ${prop}: ${value} }`);
        if (prop === 'letter-spacing' && !/^(normal|0)$/.test(value)) bad.push(`${r.selector} { ${prop}: ${value} }`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('DS-5 the font is bundled: @fontsource 5.3.0, weights 400, 500 and 600 imported in main.ts', () => {
    const pkg = JSON.parse(read('../../package.json')) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.['@fontsource/atkinson-hyperlegible-next'] ?? 'missing', 'dependency pinned').toMatch(/^5\.3\.0$/);
    const main = read('../main.ts');
    const imports = [...main.matchAll(/import\s+['"](@fontsource\/[^'"]+)['"]/g)].map((m) => m[1]).sort();
    expect(imports).toEqual([
      '@fontsource/atkinson-hyperlegible-next/latin-400.css',
      '@fontsource/atkinson-hyperlegible-next/latin-500.css',
      '@fontsource/atkinson-hyperlegible-next/latin-600.css',
    ]);
  });

  it('DS-7 no gradients on the logo, buttons, page background or photo drop area', () => {
    const PLAIN = /(^|[\s,])(\.logo|\.btn|body|html|\.dropzone)([.:[\s,]|::|$)/;
    const bad = RULES.filter((r) => PLAIN.test(r.selector) && !/\.(pad|orb)/.test(r.selector))
      .flatMap((r) => r.decls.filter(([p, v]) => /^background/.test(p) && /gradient\(/.test(v)).map(([p, v]) => `${r.selector} { ${p}: ${v} }`));
    expect(bad).toEqual([]);
  });
});

// ---------- the saved image (canvas export) ----------
interface Recorded { fonts: string[]; gradients: number; rects: Array<{ style: string; x: number; y: number; w: number; h: number }>; texts: Array<{ text: string; style: string; y: number }> }
function recordingCanvas(): Recorded {
  const rec: Recorded = { fonts: [], gradients: 0, rects: [], texts: [] };
  const state = { fillStyle: '#000000', font: '' };
  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get(_t, key) {
      if (key === 'fillStyle') return state.fillStyle;
      if (key === 'font') return state.font;
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => (rec.gradients++, { addColorStop: () => undefined });
      if (key === 'fillRect') return (x: number, y: number, w: number, h: number) => rec.rects.push({ style: String(state.fillStyle), x, y, w, h });
      if (key === 'fillText') return (text: string, _x: number, y: number) => rec.texts.push({ text, style: String(state.fillStyle), y });
      if (key === 'measureText') return (t: string) => ({ width: t.length * 10 });
      return () => undefined;
    },
    set(_t, key, value) {
      if (key === 'fillStyle') state.fillStyle = value;
      if (key === 'font') { state.font = value; rec.fonts.push(value); }
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  return rec;
}
/** #rgb/#rrggbb/rgb()/rgba(...,1) to #RRGGBB, or null when see-through. */
function opaqueHex(style: string): string | null {
  const s = style.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${[...s.slice(1)].map((c) => c + c).join('')}`;
  const m = s.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!m || (m[4] !== undefined && Number(m[4]) < 1)) return null;
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

describe('the saved image', () => {
  afterEach(() => vi.restoreAllMocks());
  const energy = { id: 'calm', name: 'Calm', colors: [[1, 1, 1], [0.5, 0.5, 1], [0.2, 0.2, 0.6]] as [number, number, number][] };
  const draw = () => {
    const rec = recordingCanvas();
    const source = document.createElement('canvas');
    source.width = 800;
    source.height = 1000;
    const out = document.createElement('canvas');
    drawCaptioned(out, source, energy as never);
    return rec;
  };

  it('DS-5 the saved image caption uses the studio font at 600 or lighter', () => {
    const rec = draw();
    expect(rec.fonts.length).toBeGreaterThan(0);
    const bad = rec.fonts.filter((f) => !f.replace(/'/g, '"').endsWith(STACK) || Number(f.match(/\b([1-9]00)\b/)?.[1] ?? 400) > 600);
    expect(bad).toEqual([]);
  });

  it('ES-M2.4 D3 (P5) the saved image caption sits on a solid band, not a see-through gradient', () => {
    const rec = draw();
    expect(rec.gradients, 'no gradient behind the caption').toBe(0);
    const band = rec.rects.find((r) => r.w === 800 && r.y > 0 && r.y + r.h === 1000);
    expect(band, 'a full-width band along the bottom').toBeTruthy();
    const bandHex = opaqueHex(band!.style);
    expect(bandHex, `band fill ${band!.style} is opaque`).not.toBeNull();
    expect(rec.texts.length).toBeGreaterThan(0);
    for (const t of rec.texts) {
      expect(t.y, `"${t.text}" sits on the band`).toBeGreaterThan(band!.y);
      const hex = opaqueHex(t.style);
      expect(hex, `"${t.text}" color ${t.style} is opaque`).not.toBeNull();
      expect(ratio(hex!, bandHex!), `"${t.text}" contrast on the band`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// ---------- app markup (jsdom) ----------
const mounted: AppHandle[] = [];
function mount(options: AppOptions = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  mounted.push(mountApp(root, { random: () => 0.5, ...options }));
  return root;
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const visible = (el: Element) => !el.closest('[hidden]');

describe('ES-M2.4 app markup', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    for (const app of mounted.splice(0)) app.destroy();
    document.documentElement.removeAttribute('data-theme');
  });

  it('DS-8 (D4) no filled .btn.primary anywhere; main actions are .btn.tinted', async () => {
    localStorage.setItem('alwaysGrey', 'true');
    const root = mount({ holdMs: 1 });
    expect(root.querySelector('[data-action="demo"]')!.classList.contains('tinted')).toBe(true);
    root.querySelector('.pad')!.dispatchEvent(new Event('pointerdown'));
    await wait(60);
    expect(root.querySelector('[data-action="see-colors"]')!.classList.contains('tinted')).toBe(true);
    expect([...root.querySelectorAll('.primary')].map((e) => e.textContent)).toEqual([]);
    root.querySelector<HTMLElement>('[data-mode="photo"]')!.click();
    expect([...root.querySelectorAll('.primary')].map((e) => e.textContent)).toEqual([]);
  });

  it('DS-11 a done step shows a check mark as well as aria-pressed (TXT-R2: a check circle, not a text tick)', () => {
    const root = mount();
    const teeth = root.querySelector<HTMLElement>('[data-step="teeth"]')!;
    expect(teeth.querySelector('.check')).not.toBeNull();
    teeth.click();
    const now = root.querySelector<HTMLElement>('[data-step="teeth"]')!;
    expect(now.getAttribute('aria-pressed')).toBe('true');
    expect(now.querySelector('.check svg'), 'ticked: the check circle draws a check').not.toBeNull();
    expect(root.textContent).not.toContain('✓');
    expect(root.querySelector('[data-step="bath"]')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('DS-11 Always Grey says Off or On in words beside the checkbox', () => {
    const root = mount();
    const box = root.querySelector<HTMLInputElement>('[data-input="always"]')!;
    const words = () => (box.closest('label') ?? box.parentElement!).textContent ?? '';
    expect(words()).toMatch(/\bOff\b/);
    box.click();
    expect(words()).toMatch(/\bOn\b/);
    expect(words()).not.toMatch(/\bOff\b/);
  });

  it('DS-12 Grown-ups has Look: Light / Dark / Automatic (TXT-R11), default Automatic, saved, sets html[data-theme]', () => {
    const findLook = (root: HTMLElement) => {
      const groups = [...root.querySelectorAll<HTMLElement>('.grownups [role="radiogroup"], .grownups fieldset')];
      const named = (g: HTMLElement) => {
        const by = g.getAttribute('aria-labelledby');
        return (g.getAttribute('aria-label') ?? (by ? document.getElementById(by)?.textContent : null) ?? g.querySelector('legend')?.textContent ?? '').trim();
      };
      const group = groups.find((g) => named(g) === 'Look');
      expect(group, 'a radio group named "Look" in Grown-ups').toBeTruthy();
      const radios = [...group!.querySelectorAll<HTMLElement>('[role="radio"], input[type="radio"]')];
      const label = (r: HTMLElement) => ((r instanceof HTMLInputElement ? r.labels?.[0]?.textContent : r.textContent) ?? '').trim();
      const checked = (r: HTMLElement) => (r instanceof HTMLInputElement ? r.checked : r.getAttribute('aria-checked') === 'true');
      return { radios, label, checked };
    };
    const root = mount();
    const look = findLook(root);
    expect(look.radios.map(look.label)).toEqual(['Light', 'Dark', 'Automatic']);
    expect(look.radios.filter(look.checked).map(look.label)).toEqual(['Automatic']);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    look.radios[1]!.click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(Object.values({ ...localStorage }).some((v) => v === '"dark"' || v === 'dark')).toBe(true);

    for (const app of mounted.splice(0)) app.destroy();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-theme');
    const again = findLook(mount());
    expect(again.radios.filter(again.checked).map(again.label)).toEqual(['Dark']);
    expect(document.documentElement.dataset.theme).toBe('dark');

    again.radios[2]!.click();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    again.radios[0]!.click();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('ES-M2.4 D1 (P4) the palm pad also has a visible Scan button that runs the same scan', async () => {
    const root = mount({ holdMs: 80 });
    const scan = [...root.querySelectorAll<HTMLButtonElement>('.stage button')].find((b) => b.textContent?.trim() === 'Scan');
    expect(scan, 'a button labelled "Scan" on the palm screen').toBeTruthy();
    expect(visible(scan!)).toBe(true);
    expect(root.querySelector('.pad')!.getAttribute('aria-label')).toMatch(/Press and hold/);
    scan!.click();
    expect(root.querySelector('.pad')!.classList.contains('scanning'), 'the same fill runs').toBe(true);
    expect(root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!.hidden).toBe(true);
    await wait(400);
    expect(root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!.hidden).toBe(false);
    expect(root.querySelector('[data-hint]')!.textContent).toBe('Done'); // TXT-R3
  });
});
