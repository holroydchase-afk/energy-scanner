import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp, type AppOptions, type AppHandle } from './app';
import { nightKey } from './bedtime/energy';

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

const mounted: AppHandle[] = [];

function mount(options: AppOptions = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  mounted.push(mountApp(root, { random: () => 0.5, ...options }));
  return root;
}

const click = (root: HTMLElement, sel: string) => root.querySelector<HTMLElement>(sel)!.click();

describe('bedtime app', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });
  afterEach(() => {
    for (const app of mounted.splice(0)) app.destroy();
    vi.useRealTimers();
  });

  it('renders the routine, scan choice and privacy promise', () => {
    const root = mount();
    expect(root.querySelector('h1')?.textContent).toBe('Energy Scanner');
    expect(root.querySelectorAll('.step')).toHaveLength(5);
    expect(root.querySelector('[data-mode="palm"]')!.getAttribute('aria-checked')).toBe('true');
    expect(root.querySelector('.pad')).not.toBeNull();
    expect(root.textContent).toContain('Photos never leave your device');
  });

  it('says what it is and links back to the portfolio and the code', () => {
    const root = mount();
    expect(root.querySelector('.tagline')?.textContent).toBe('A bedtime helper for kids: finish the steps, then scan.');
    const links = [...root.querySelectorAll<HTMLAnchorElement>('.foot a')].map((a) => [a.textContent, a.href]);
    expect(links).toEqual([
      ['Chase Holroyd', 'https://chaseholroyd.com/energy-scanner.html'],
      ['Code on GitHub', 'https://github.com/holroydchase-afk/energy-scanner'],
    ]);
  });

  it('ticks off steps and remembers them tonight', () => {
    const root = mount();
    click(root, '[data-step="teeth"]');
    expect(root.querySelector('[data-step="teeth"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[data-count]')!.textContent).toBe('1 of 5');
    const again = mount();
    expect(again.querySelector('[data-step="teeth"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches to the photo scan and remembers the choice', () => {
    const root = mount();
    click(root, '[data-mode="photo"]');
    expect(root.querySelector('[data-action="camera"]')?.textContent).toBe('Take a photo');
    expect(root.querySelector('.pad')).toBeNull();
    expect(mount().querySelector('[data-mode="photo"]')!.getAttribute('aria-checked')).toBe('true');
  });

  it('the scan choice works like radio buttons from the keyboard', () => {
    const root = mount();
    const palm = root.querySelector<HTMLElement>('[data-mode="palm"]')!;
    const photo = root.querySelector<HTMLElement>('[data-mode="photo"]')!;
    expect([palm.tabIndex, photo.tabIndex]).toEqual([0, -1]);
    palm.focus();
    palm.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(photo.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(photo);
    expect([palm.tabIndex, photo.tabIndex]).toEqual([-1, 0]);
    photo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(palm.getAttribute('aria-checked')).toBe('true');
  });

  it('palm scan reads Grey with the grown-up switch on', async () => {
    localStorage.setItem('alwaysGrey', 'true');
    const root = mount({ holdMs: 1 });
    root.querySelector('.pad')!.dispatchEvent(new Event('pointerdown'));
    await new Promise((r) => setTimeout(r, 60));
    const card = root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!;
    expect(card.hidden).toBe(false);
    expect(card.querySelector('.rc-name')!.textContent).toBe('Grey Energy');
    expect(card.querySelector('.rc-todo')!.textContent).toBe('Steps left tonight: Bath, PJs, Teeth, Potty, Book.');
    const note = card.querySelector<HTMLElement>('.rc-note')!;
    expect(note.hidden).toBe(false);
    expect(note.textContent).toBe('Always Grey is on, so every scan reads Grey. See every color');
  });

  it('See every color turns Always Grey off and scans again in color', async () => {
    // Noon with an 8pm bedtime and nothing done: Rainbow once Always Grey is off.
    localStorage.setItem('alwaysGrey', 'true');
    const root = mount({ holdMs: 1, now: () => new Date(2026, 9, 21, 12, 0) });
    root.querySelector('.pad')!.dispatchEvent(new Event('pointerdown'));
    await new Promise((r) => setTimeout(r, 60));
    const see = root.querySelector<HTMLButtonElement>('[data-action="see-colors"]')!;
    expect(see.textContent).toBe('See every color');
    see.click();
    expect(root.querySelector<HTMLInputElement>('[data-input="always"]')!.checked).toBe(false);
    expect(localStorage.getItem('alwaysGrey')).toBe('false');
    expect(root.querySelector('.rc-name')!.textContent).toBe('Rainbow Energy');
    expect(root.querySelector<HTMLElement>('.rc-note')!.hidden).toBe(true);
  });

  it('See every color re-scans the same photo', async () => {
    localStorage.setItem('alwaysGrey', 'true');
    let scans = 0;
    const person = { width: 4, height: 4, data: new Float32Array(16).fill(1) };
    const root = mount({
      minScanMs: 0,
      getSegmenter: async () => ({ segment: async () => (scans++, person) }) as never,
    });
    click(root, '[data-mode="photo"]');
    click(root, '[data-action="sample"]');
    await new Promise((r) => setTimeout(r, 20));
    click(root, '[data-action="see-colors"]');
    await new Promise((r) => setTimeout(r, 20));
    expect(scans).toBe(2);
    expect(root.querySelector('.caption')?.textContent).toBe('Illustrated sample, not a real person');
  });

  it('ES-R61 a first visit reads in color; a saved Always Grey choice is kept', () => {
    expect(mount().querySelector<HTMLInputElement>('[data-input="always"]')!.checked).toBe(false);
    localStorage.setItem('alwaysGrey', 'true');
    expect(mount().querySelector<HTMLInputElement>('[data-input="always"]')!.checked).toBe(true);
  });

  it('ES-R48 the first screen pitches the on-device aura with a one-tap demo', async () => {
    const person = { width: 4, height: 4, data: new Float32Array(16).fill(1) };
    const root = mount({ minScanMs: 0, getSegmenter: async () => ({ segment: async () => person }) as never });
    const pitch = root.querySelector('.pitch')!.textContent!;
    expect(pitch).toContain('AI that runs on your device');
    expect(pitch).toContain('Nothing is uploaded');
    click(root, '[data-action="demo"]');
    expect(root.querySelector('[data-mode="photo"]')!.getAttribute('aria-checked')).toBe('true');
    expect(root.querySelector('.caption')?.textContent).toBe('Illustrated sample, not a real person');
    await new Promise((r) => setTimeout(r, 20));
    expect(root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!.hidden).toBe(false);
  });

  it('a palm scan released too early is not counted', () => {
    const root = mount({ holdMs: 10_000 });
    const pad = root.querySelector('.pad')!;
    pad.dispatchEvent(new Event('pointerdown'));
    pad.dispatchEvent(new Event('pointerup'));
    expect(root.querySelector('[data-hint]')!.textContent).toMatch(/Too fast/);
    expect(root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!.hidden).toBe(true);
  });

  it('reads by the clock when Always Grey is off', async () => {
    // Noon with an 8pm bedtime and nothing done: lots of energy.
    const root = mount({ holdMs: 1, now: () => new Date(2026, 9, 21, 12, 0) });
    const always = root.querySelector<HTMLInputElement>('[data-input="always"]')!;
    always.checked = false;
    always.dispatchEvent(new Event('change'));
    root.querySelector('.pad')!.dispatchEvent(new Event('pointerdown'));
    await new Promise((r) => setTimeout(r, 60));
    expect(root.querySelector('.rc-name')!.textContent).toBe('Rainbow Energy');
    expect(root.querySelector<HTMLElement>('.rc-note')!.hidden).toBe(true);
  });

  it('scans the illustrated sample, labeled as not a real person', () => {
    let asked = false;
    const root = mount({
      getSegmenter: () => {
        asked = true;
        return new Promise(() => undefined);
      },
    });
    click(root, '[data-mode="photo"]');
    expect(root.querySelector('[data-action="sample"]')?.textContent).toBe('Try the sample');
    click(root, '[data-action="sample"]');
    expect(root.querySelector('[data-testid="photo"] canvas')).not.toBeNull();
    expect(root.querySelector('.caption')?.textContent).toBe('Illustrated sample, not a real person');
    expect(asked).toBe(true);
  });

  it('offers the sample when a photo has nobody in it, and brings the photo into view', async () => {
    const scrolled: Element[] = [];
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled.push(this);
    };
    const empty = { width: 4, height: 4, data: new Float32Array(16) };
    const root = mount({ minScanMs: 0, getSegmenter: async () => ({ segment: async () => empty }) as never });
    click(root, '[data-mode="photo"]');
    click(root, '[data-action="sample"]');
    expect(scrolled).toContain(root.querySelector('[data-testid="stage"]'));
    await new Promise((r) => setTimeout(r, 20));
    expect(root.querySelector('[role="status"]')!.textContent).toMatch(/No person found/);
    expect(root.querySelector('.viewer [data-action="sample"]')?.textContent).toBe('Try the sample');
  });

  it('opens the phone camera through the native capture input', () => {
    const root = mount();
    click(root, '[data-mode="photo"]');
    const capture = root.querySelector<HTMLInputElement>('[data-input="capture"]')!;
    let clicked = false;
    capture.click = () => {
      clicked = true;
    };
    click(root, '[data-action="camera"]');
    expect(capture.getAttribute('capture')).toBe('environment');
    expect(clicked).toBe(true);
  });

  it('shows an error for a file that is not an image', async () => {
    const root = mount();
    const upload = root.querySelector<HTMLInputElement>('[data-input="upload"]')!;
    Object.defineProperty(upload, 'files', { value: [new File(['hello'], 'notes.txt', { type: 'text/plain' })], configurable: true });
    upload.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r, 0));
    const error = root.querySelector<HTMLElement>('.error')!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('That file is not an image. Choose a photo (JPG, PNG or HEIC).');
    // Right under the buttons, where the person is looking, not below the fold.
    expect(error.previousElementSibling?.classList.contains('actions')).toBe(true);
  });

  it('takes a photo dropped anywhere on the page, even outside the app column', async () => {
    const root = mount();
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    document.body.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(root.querySelector('[data-mode="photo"]')!.getAttribute('aria-checked')).toBe('true');
    expect(root.querySelector<HTMLElement>('.error')!.hidden).toBe(false);
  });

  it('keeps focus on Take a photo after New photo', async () => {
    const person = { width: 4, height: 4, data: new Float32Array(16).fill(1) };
    const root = mount({ minScanMs: 0, getSegmenter: async () => ({ segment: async () => person }) as never });
    click(root, '[data-mode="photo"]');
    click(root, '[data-action="sample"]');
    await new Promise((r) => setTimeout(r, 20));
    click(root, '[data-action="reset"]');
    expect(document.activeElement).toBe(root.querySelector('[data-action="camera"]'));
  });

  it('is labeled for screen readers', () => {
    const root = mount();
    expect(root.querySelector('[data-hint]')!.getAttribute('aria-live')).toBe('polite');
    for (const b of root.querySelectorAll('[data-mode]')) expect(b.querySelector('[aria-hidden="true"]')).not.toBeNull();
    const range = root.querySelector<HTMLInputElement>('[data-input="fake"]')!;
    expect(range.labels?.[0]?.textContent).toContain('Try a different time');
    expect(range.getAttribute('aria-valuetext')).toBe('real time');
    const main = root.querySelector('main')!;
    expect(main.contains(root.querySelector('.steps'))).toBe(true);
    expect(main.contains(root.querySelector('.reading-card'))).toBe(true);
  });

  it('ES-R45 unmount removes page-wide listeners and the clock', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    document.body.append(root);
    const app = mountApp(root);
    app.destroy();
    expect(vi.getTimerCount()).toBe(0);
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    document.body.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(false);
  });

  it('ES-R36 starts a fresh night when the page stays open past 5am', () => {
    vi.useFakeTimers();
    let t = new Date(2026, 9, 22, 19, 0);
    const root = mount({ now: () => t });
    for (const id of ['bath', 'pjs', 'teeth', 'potty', 'book']) click(root, `[data-step="${id}"]`);
    expect(root.querySelector('[data-count]')!.textContent).toBe('5 of 5');
    t = new Date(2026, 9, 23, 19, 0);
    vi.advanceTimersByTime(15_000);
    expect(root.querySelector('[data-count]')!.textContent).toBe('0 of 5');
    for (const b of root.querySelectorAll('.step')) expect(b.getAttribute('aria-pressed')).toBe('false');
    click(root, '[data-step="bath"]');
    expect(JSON.parse(localStorage.getItem('steps-2026-10-23')!)).toEqual(['bath']);
  });

  it('ES-R41 mounts with defaults when saved settings are corrupt', () => {
    const now = new Date(2026, 9, 22, 19, 0);
    for (const bad of ['2000', 'null', '"abc"']) {
      localStorage.clear();
      localStorage.setItem('bed', bad);
      localStorage.setItem(nightKey(now), '{"a":1}');
      localStorage.setItem('mode', '42');
      const root = mount({ now: () => now });
      expect(root.querySelector('.pad')).not.toBeNull();
      expect(root.querySelector('[data-bed]')!.textContent).toMatch(/^8:00\s?PM$/);
      expect(root.querySelector('[data-count]')!.textContent).toBe('0 of 5');
    }
    localStorage.setItem(nightKey(now), '"bathbook"');
    expect(mount({ now: () => now }).querySelector('[data-count]')!.textContent).toBe('0 of 5');
    localStorage.setItem(nightKey(now), '["bath","bath","nope"]');
    expect(mount({ now: () => now }).querySelector('[data-count]')!.textContent).toBe('1 of 5');
  });

  it('ES-R39 palm scan keeps going while any finger is still on the pad', () => {
    const root = mount({ holdMs: 10_000 });
    const pad = root.querySelector('.pad')!;
    const ev = (type: string, pointerId: number) => Object.assign(new Event(type), { pointerId });
    pad.dispatchEvent(ev('pointerdown', 1));
    pad.dispatchEvent(ev('pointerdown', 2));
    pad.dispatchEvent(ev('pointerup', 1));
    expect(root.querySelector('[data-hint]')!.textContent).toBe('Scanning… keep holding');
    pad.dispatchEvent(ev('pointerup', 2));
    expect(root.querySelector('[data-hint]')!.textContent).toMatch(/Too fast/);
  });

  it('ES-R40 switching to Photo scan mid-hold cancels the palm scan', async () => {
    const root = mount({ holdMs: 30 });
    root.querySelector('.pad')!.dispatchEvent(new Event('pointerdown'));
    click(root, '[data-mode="photo"]');
    await new Promise((r) => setTimeout(r, 120));
    expect(root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!.hidden).toBe(true);
  });

  it('ES-R38 a photo that finishes decoding after switching to Palm scan is dropped', async () => {
    let finish: (c: HTMLCanvasElement) => void = () => undefined;
    const decode = vi.spyOn(await import('./photo/image'), 'fileToCanvas').mockImplementation(
      () => new Promise((r) => (finish = r)),
    );
    const root = mount({ getSegmenter: () => new Promise(() => undefined) });
    click(root, '[data-mode="photo"]');
    const upload = root.querySelector<HTMLInputElement>('[data-input="upload"]')!;
    Object.defineProperty(upload, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })], configurable: true });
    upload.dispatchEvent(new Event('change'));
    click(root, '[data-mode="palm"]');
    finish(document.createElement('canvas'));
    await new Promise((r) => setTimeout(r, 0));
    expect(root.querySelector('.pad')).not.toBeNull();
    expect(root.querySelector('[data-testid="photo"]')).toBeNull();
    decode.mockRestore();
  });

  it('ES-R38 the last photo picked wins', async () => {
    const pending: ((c: HTMLCanvasElement) => void)[] = [];
    const decode = vi.spyOn(await import('./photo/image'), 'fileToCanvas').mockImplementation(
      () => new Promise((r) => pending.push(r)),
    );
    const root = mount({ getSegmenter: () => new Promise(() => undefined) });
    click(root, '[data-mode="photo"]');
    const upload = root.querySelector<HTMLInputElement>('[data-input="upload"]')!;
    for (const name of ['a.png', 'b.png']) {
      Object.defineProperty(upload, 'files', { value: [new File(['x'], name, { type: 'image/png' })], configurable: true });
      upload.dispatchEvent(new Event('change'));
    }
    const [a, b] = [document.createElement('canvas'), document.createElement('canvas')];
    pending[1]!(b);
    await new Promise((r) => setTimeout(r, 0));
    pending[0]!(a);
    await new Promise((r) => setTimeout(r, 0));
    expect(root.querySelector('[data-testid="photo"] canvas')).toBe(b);
    decode.mockRestore();
  });

  it('Scan again in photo mode re-scans the same photo', async () => {
    let scans = 0;
    const person = { width: 4, height: 4, data: new Float32Array(16).fill(1) };
    const root = mount({ minScanMs: 0, getSegmenter: async () => ({ segment: async () => (scans++, person) }) as never });
    click(root, '[data-mode="photo"]');
    click(root, '[data-action="sample"]');
    await new Promise((r) => setTimeout(r, 20));
    click(root, '[data-step="teeth"]');
    click(root, '[data-action="again"]');
    await new Promise((r) => setTimeout(r, 20));
    expect(scans).toBe(2);
    expect(root.querySelector('.caption')?.textContent).toBe('Illustrated sample, not a real person');
    expect(root.querySelector('.rc-todo')!.textContent).not.toContain('Teeth');
  });
});
