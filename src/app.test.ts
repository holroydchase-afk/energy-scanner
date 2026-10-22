import { beforeEach, describe, expect, it } from 'vitest';
import { mountApp, type AppOptions } from './app';

function mount(options: AppOptions = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  mountApp(root, { random: () => 0.5, ...options });
  return root;
}

const click = (root: HTMLElement, sel: string) => root.querySelector<HTMLElement>(sel)!.click();

describe('bedtime app', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
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

  it('palm scan reads Grey with the grown-up switch on (the default)', async () => {
    const root = mount({ holdMs: 1 });
    root.querySelector('.pad')!.dispatchEvent(new Event('pointerdown'));
    await new Promise((r) => setTimeout(r, 60));
    const card = root.querySelector<HTMLElement>('[data-testid="energy-reading"]')!;
    expect(card.hidden).toBe(false);
    expect(card.querySelector('.rc-name')!.textContent).toBe('Grey Energy');
    expect(card.querySelector('.rc-todo')!.textContent).toMatch(/To drain the battery: Bath, PJs, Teeth, Potty, Book/);
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
    expect(error.textContent).toMatch(/not an image/);
  });
});
