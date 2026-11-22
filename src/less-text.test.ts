// ES-M2.5 "less text" (docs/reviews/2026-11-22-less-text.md, Scope (staff-pm)). Written red first by qa-tdd.
// One describe per build step, in build order. The tap-never-fails test (AC-TXT4, step 5 commit 4b) lives
// on its own in src/less-text-tap.test.ts so it can be reverted alone; AC-TXT4b ("Keep holding", 4a) is here.
//
// Contract the tests assume (engineer, please keep these names):
// - Each step's check circle is an element with class `check` inside `.step`.
// - Icons are inline <svg> (Lucide). A step's icon is an <svg> in `.step` that is not inside `.check`;
//   the pad's hand icon is an <svg> in `.pad` that is not `.ring`.
// - "Visually hidden" means the existing `visually-hidden` class.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp, type AppHandle, type AppOptions } from './app';

// Test-only stand-in: jsdom has no WebGL or canvas pixels.
vi.mock('./aura/renderer', () => ({
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
const mounted: AppHandle[] = [];
function mount(options: AppOptions = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  mounted.push(mountApp(root, { random: () => 0.5, ...options }));
  return root;
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const click = (root: HTMLElement, sel: string) => root.querySelector<HTMLElement>(sel)!.click();
const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
/** jsdom has no layout: "shown" means not inside [hidden] and not visually hidden. */
const shown = (el: Element) => !el.closest('[hidden], .visually-hidden');
/** The text a sighted person sees inside `el` (text nodes not inside hidden or visually hidden elements). */
function seenText(el: Element): string {
  const out: string[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.parentElement && shown(n.parentElement)) out.push(n.textContent ?? '');
  return norm(out.join(' '));
}
const person = { width: 4, height: 4, data: new Float32Array(16).fill(1) };
const withPerson = { minScanMs: 0, getSegmenter: async () => ({ segment: async () => person }) as never };
/** A laptop: mouse or trackpad (fine pointer). */
function asLaptop<T>(run: () => T): T {
  const original = window.matchMedia;
  window.matchMedia = ((q: string) => ({ matches: q.includes('pointer: fine'), media: q })) as never;
  try {
    return run();
  } finally {
    window.matchMedia = original;
  }
}
async function palmScan(root: HTMLElement) {
  root.querySelector('.pad')!.dispatchEvent(new Event('pointerdown'));
  await wait(60);
}

const TAGLINE = 'A bedtime routine for kids, with an AI aura that runs on your device.';

describe('ES-M2.5 less text', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });
  afterEach(() => {
    for (const app of mounted.splice(0)) app.destroy();
    document.documentElement.removeAttribute('data-theme');
  });

  // ---------- Step 1: strings only ----------
  describe('step 1, strings', () => {
    it('AC-TXT1 TXT-R1 between the byline and the steps there is one line: the tagline', () => {
      const root = mount();
      const byline = root.querySelector('.byline')!;
      const steps = root.querySelector('section[aria-label="Bedtime steps"]')!;
      const between: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
        const el = n.parentElement!;
        if (!n.textContent?.trim() || byline.contains(n) || el.closest('button') || !shown(el)) continue;
        const after = byline.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING;
        const before = steps.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING;
        if (after && before) between.push(n);
      }
      expect(norm(between.map((t) => t.textContent).join(' '))).toBe(TAGLINE);
      const paragraphs = new Set(between.map((t) => t.parentElement!.closest('p')));
      expect(paragraphs.size, 'all of it in one <p>').toBe(1);
      expect([...paragraphs][0]).not.toBeNull();
      // The recruiter's proof stays one tap away on palm.
      expect(root.querySelector('[data-action="demo"]')?.textContent).toBe('See the aura demo');
    });

    it('AC-TXT5 TXT-R5 a reading never repeats the steps (none done, and all done)', async () => {
      const root = mount({ holdMs: 1 });
      await palmScan(root);
      const card = root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!;
      expect(card.hidden).toBe(false);
      const todo = card.querySelector('.rc-todo');
      expect(todo === null || !shown(todo), 'no visible .rc-todo').toBe(true);
      expect(seenText(card)).not.toMatch(/Steps left|All steps done/);

      for (const id of ['bath', 'pjs', 'teeth', 'potty', 'book']) click(root, `[data-step="${id}"]`);
      click(root, '[data-action="again"]');
      await palmScan(root);
      expect(card.hidden).toBe(false);
      expect(seenText(card)).not.toMatch(/Steps left|All steps done/);
    });

    it('AC-TXT6 TXT-R6 nothing says "upload"; the file button reads Choose a photo (phone and laptop)', () => {
      const names = (root: HTMLElement) => [
        root.textContent ?? '',
        ...[...root.querySelectorAll('[aria-label], [title], [alt]')].map((e) => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''} ${e.getAttribute('alt') ?? ''}`),
      ];
      const phone = mount();
      expect(names(phone).filter((s) => /upload/i.test(s)), 'palm screen').toEqual([]);
      click(phone, '[data-mode="photo"]');
      expect(names(phone).filter((s) => /upload/i.test(s)), 'photo pick, phone').toEqual([]);
      expect([...phone.querySelectorAll('.dropzone button')].map((b) => norm(b.textContent))).toContain('Choose a photo');
      // The hidden file input's accessible name too.
      const files = [...phone.querySelectorAll<HTMLInputElement>('input[type="file"]:not([capture])')];
      expect(files.map((f) => f.getAttribute('aria-label'))).toEqual(['Choose a photo']);

      localStorage.clear();
      const laptop = asLaptop(() => {
        const r = mount();
        click(r, '[data-mode="photo"]');
        return r;
      });
      expect(names(laptop).filter((s) => /upload/i.test(s)), 'photo pick, laptop').toEqual([]);
      expect([...laptop.querySelectorAll('.dropzone button')].map((b) => norm(b.textContent))).toEqual(['Try the sample', 'Choose a photo']);
    });

    it('AC-TXT10 TXT-R10 Grown-ups help is one short line, tied to the Always Grey switch', () => {
      const root = mount();
      const help = root.querySelector<HTMLElement>('.grownups .help')!;
      expect(norm(help.textContent)).toBe('Every scan reads Grey.');
      expect(norm(help.textContent).split(' ').length).toBeLessThanOrEqual(5);
      const always = root.querySelector<HTMLInputElement>('[data-input="always"]')!;
      const ids = (always.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      expect(ids.length, 'the switch has aria-describedby').toBeGreaterThan(0);
      const described = ids.map((id) => document.getElementById(id));
      expect(described.some((d) => d !== null && (d === help || help.contains(d)))).toBe(true);
    });

    it('TXT-R10 the cut algorithm paragraph moves to CASE-STUDY.md word for word', () => {
      const study = read('../CASE-STUDY.md').replace(/\s+/g, ' ');
      expect(study).toContain(
        'With it off, the color follows the clock and the steps: closer to bedtime and more steps done means a sleepier color. It never says Rainbow once all five steps are done.',
      );
    });

    it('AC-TXT11 TXT-R11 Grown-ups labels are short: Pretend time, Always Grey, Clear steps, Automatic', () => {
      const root = mount();
      const range = root.querySelector<HTMLInputElement>('[data-input="fake"]')!;
      expect(norm(range.labels?.[0]?.textContent)).toBe('Pretend time');
      const always = root.querySelector<HTMLInputElement>('[data-input="always"]')!;
      expect(norm(always.labels?.[0]?.textContent)).toMatch(/^Always Grey (Off|On)$/);
      expect(norm(root.querySelector('[data-action="clear"]')!.textContent)).toBe('Clear steps');
      const looks = [...root.querySelectorAll<HTMLInputElement>('[data-look]')].map((r) => norm(r.labels?.[0]?.textContent));
      expect(looks).toEqual(['Light', 'Dark', 'Automatic']);
    });

    it('AC-TXT12 TXT-R12 with Always Grey on, the note says only "Always Grey is on."', async () => {
      localStorage.setItem('alwaysGrey', 'true');
      const root = mount({ holdMs: 1 });
      await palmScan(root);
      const note = root.querySelector<HTMLElement>('.rc-note')!;
      expect(note.hidden).toBe(false);
      expect(norm(note.textContent)).toBe('Always Grey is on.');
      // The other direction: with it off, no note.
      localStorage.clear();
      const off = mount({ holdMs: 1 });
      await palmScan(off);
      expect(off.querySelector<HTMLElement>('.rc-note')!.hidden).toBe(true);
    });

    it('AC-TXT13 TXT-R13 the footer says the privacy line once and links the code; the case study is linked once, in the byline', () => {
      const root = mount();
      const foot = root.querySelector('.foot')!;
      expect(seenText(foot)).toBe('Photos never leave your device. Code on GitHub');
      expect([...foot.querySelectorAll('a')].map((a) => [norm(a.textContent), a.href])).toEqual([
        ['Code on GitHub', 'https://github.com/holroydchase-afk/energy-scanner'],
      ]);
      const caseStudy = [...root.querySelectorAll<HTMLAnchorElement>('a')].filter((a) => a.href.includes('energy-scanner.html'));
      expect(caseStudy).toHaveLength(1);
      expect(caseStudy[0]!.closest('.byline')).not.toBeNull();
    });

    it('AC-TXT17 TXT-R17 photo scanning: the status is visually hidden but still says "Scanning energy…" to screen readers', () => {
      const root = mount({ getSegmenter: () => new Promise(() => undefined) });
      click(root, '[data-mode="photo"]');
      click(root, '[data-action="sample"]');
      const status = root.querySelector<HTMLElement>('[role="status"]')!;
      expect(status.textContent).toBe('Scanning energy…');
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.classList.contains('visually-hidden'), 'status is visually hidden while scanning').toBe(true);
    });

    it('AC-TXT17 the other direction: a problem after the scan is shown, not hidden', async () => {
      const empty = { width: 4, height: 4, data: new Float32Array(16) };
      const root = mount({ minScanMs: 0, getSegmenter: async () => ({ segment: async () => empty }) as never });
      click(root, '[data-mode="photo"]');
      click(root, '[data-action="sample"]');
      await wait(20);
      const status = root.querySelector<HTMLElement>('[role="status"]')!;
      expect(status.textContent).toMatch(/No person found/);
      expect(shown(status)).toBe(true);
    });
  });

  // ---------- Step 2: icons ----------
  describe('step 2, icons', () => {
    const iconOk = (svg: SVGElement | null | undefined) =>
      svg ? { hidden: svg.getAttribute('aria-hidden'), stroke: svg.getAttribute('stroke'), width: svg.getAttribute('stroke-width'), fill: svg.getAttribute('fill') } : null;

    it('AC-TXT9 TXT-R9 steps, mode switch and pad use inline line icons (aria-hidden, currentColor, stroke 2, pad 1.5)', () => {
      const root = mount();
      for (const step of root.querySelectorAll('.step')) {
        const icon = [...step.querySelectorAll<SVGElement>('svg')].find((s) => !s.closest('.check'));
        expect(iconOk(icon), `${norm(step.textContent)} icon`).toEqual({ hidden: 'true', stroke: 'currentColor', width: '2', fill: 'none' });
      }
      for (const mode of root.querySelectorAll('[data-mode]')) {
        expect(iconOk(mode.querySelector<SVGElement>('svg')), `${norm(mode.textContent)} icon`).toEqual({ hidden: 'true', stroke: 'currentColor', width: '2', fill: 'none' });
      }
      const hand = [...root.querySelectorAll<SVGElement>('.pad svg')].find((s) => !s.classList.contains('ring'));
      expect(iconOk(hand), 'pad hand icon').toEqual({ hidden: 'true', stroke: 'currentColor', width: '1.5', fill: 'none' });
    });

    it('AC-TXT9 no emoji in any text, on any screen', async () => {
      const emoji = /\p{Extended_Pictographic}/u;
      const root = mount({ holdMs: 1, ...withPerson });
      const screens: Record<string, string> = {};
      screens['palm'] = root.textContent ?? '';
      for (const id of ['bath', 'pjs', 'teeth', 'potty', 'book']) click(root, `[data-step="${id}"]`);
      screens['steps done'] = root.textContent ?? '';
      await palmScan(root);
      screens['palm reading'] = root.textContent ?? '';
      click(root, '[data-mode="photo"]');
      screens['photo pick'] = root.textContent ?? '';
      click(root, '[data-action="sample"]');
      await wait(20);
      screens['photo result'] = root.textContent ?? '';
      const bad = Object.entries(screens).flatMap(([k, t]) => [...t].filter((c) => emoji.test(c)).map((c) => `${k}: ${c}`));
      expect(bad).toEqual([]);
    });

    it('AC-TXT9 no new dependency; Lucide is credited under ISC', () => {
      const pkg = JSON.parse(read('../package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
      expect(pkg.dependencies).toEqual({ '@fontsource/atkinson-hyperlegible-next': '5.3.0', '@mediapipe/tasks-vision': '^1.1.1' });
      expect(Object.keys(pkg.devDependencies).sort()).toEqual(
        ['@eslint/js', '@playwright/test', '@types/node', 'eslint', 'globals', 'jsdom', 'typescript', 'typescript-eslint', 'vite', 'vitest'],
      );
      const notices = read('../THIRD_PARTY_NOTICES.md');
      const row = notices.split('\n').find((l) => /Lucide/.test(l));
      expect(row, 'THIRD_PARTY_NOTICES.md has a Lucide row').toBeTruthy();
      expect(row).toMatch(/ISC/);
      // Path in a variable: Vite rewrites a literal `new URL('../file', import.meta.url)` to http://localhost once the file exists.
      const license = '../licenses/ISC-lucide.txt';
      expect(existsSync(fileURLToPath(new URL(license, import.meta.url))), 'licenses/ISC-lucide.txt').toBe(true);
    });

    it('AC-TXT14 TXT-R14 the mode switch reads Palm and Photo, and the group is still named "Scan with"', () => {
      const root = mount();
      expect([...root.querySelectorAll('[data-mode]')].map((b) => norm(b.textContent))).toEqual(['Palm', 'Photo']);
      const group = root.querySelector('[role="radiogroup"].mode, .mode[role="radiogroup"]')!;
      expect(group.getAttribute('aria-label')).toBe('Scan with');
      for (const b of root.querySelectorAll('[data-mode]')) expect(b.getAttribute('role')).toBe('radio');
    });

    it('AC-TXT2 TXT-R2 no "Tap each step" or "0 of 5"; every step has a check circle; the section keeps its name', () => {
      const root = mount();
      const text = seenText(root);
      expect(text).not.toMatch(/Tap each step/);
      expect(text).not.toMatch(/\d of \d/);
      click(root, '[data-step="teeth"]');
      expect(seenText(root)).not.toMatch(/\d of \d/);
      const steps = [...root.querySelectorAll('.step')];
      expect(steps).toHaveLength(5);
      for (const s of steps) expect(s.querySelector('.check'), `${norm(s.textContent)} has a .check`).not.toBeNull();
      expect(root.querySelector('section[aria-label="Bedtime steps"]')).not.toBeNull();
      // Ticked is still announced as pressed (both directions).
      expect(root.querySelector('[data-step="teeth"]')!.getAttribute('aria-pressed')).toBe('true');
      expect(root.querySelector('[data-step="bath"]')!.getAttribute('aria-pressed')).toBe('false');
    });
  });

  // ---------- Step 3: silent pad ----------
  describe('step 3, silent pad', () => {
    it('AC-TXT3 TXT-R3 the pad hint is visually hidden when idle, scanning and done; it says Scanning, then Done', async () => {
      const root = mount({ holdMs: 80 });
      const hint = () => root.querySelector<HTMLElement>('[data-hint]')!;
      expect(hint().classList.contains('visually-hidden'), 'idle').toBe(true);
      expect(hint().getAttribute('aria-live')).toBe('polite');
      root.querySelector('.pad')!.dispatchEvent(new Event('pointerdown'));
      expect(hint().classList.contains('visually-hidden'), 'scanning').toBe(true);
      expect(hint().textContent).toBe('Scanning');
      await wait(300);
      expect(root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!.hidden).toBe(false);
      expect(hint().classList.contains('visually-hidden'), 'done').toBe(true);
      expect(hint().textContent).toBe('Done');
    });

    it('AC-TXT3 the Scan button path is silent too: Scanning, then Done, never shown', async () => {
      const root = mount({ holdMs: 80 });
      const hint = () => root.querySelector<HTMLElement>('[data-hint]')!;
      click(root, '[data-action="scan"]');
      expect(hint().textContent).toBe('Scanning');
      expect(hint().classList.contains('visually-hidden')).toBe(true);
      await wait(300);
      expect(hint().textContent).toBe('Done');
      expect(hint().classList.contains('visually-hidden')).toBe(true);
    });

    it('AC-TXT3 on a laptop the hint is hidden too (no "Click and hold" sentence)', () => {
      const root = asLaptop(() => mount());
      const hint = root.querySelector<HTMLElement>('[data-hint]')!;
      expect(hint.classList.contains('visually-hidden')).toBe(true);
      expect(seenText(root)).not.toMatch(/Click and hold|Put your hand/);
    });

    it('AC-TXT3 See every color (Always Grey note) also leaves the hint at "Done", hidden', async () => {
      localStorage.setItem('alwaysGrey', 'true');
      const root = mount({ holdMs: 1 });
      await palmScan(root);
      click(root, '[data-action="see-colors"]');
      const hint = root.querySelector<HTMLElement>('[data-hint]')!;
      expect(hint.textContent).toBe('Done');
      expect(hint.classList.contains('visually-hidden')).toBe(true);
    });
  });

  // Step 4 (AC-TXT7, drag state) needs real CSS visibility: see e2e/less-text.spec.ts.
});
