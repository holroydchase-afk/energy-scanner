import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp, type AppHandle } from './app';

// Test-only stand-in: jsdom has no WebGL or canvas pixels.
vi.mock('./aura/renderer', () => ({
  createAuraRenderer: () => ({
    canvas: document.createElement('canvas'), kind: 'webgl',
    render: () => undefined, setEnergy: () => undefined, setIntensity: () => undefined, destroy: () => undefined,
  }),
}));

const mounted: AppHandle[] = [];
function mount(now?: () => Date) {
  const root = document.createElement('div');
  document.body.append(root);
  mounted.push(mountApp(root, { random: () => 0.5, ...(now ? { now } : {}) }));
  return root;
}
function slide(root: HTMLElement, v: string) {
  const range = root.querySelector<HTMLInputElement>('[data-input="fake"]')!;
  range.value = v;
  range.dispatchEvent(new Event('input'));
  return root.querySelector('[data-fake]')!.textContent;
}

describe('QA gaps ES-R69/R70', () => {
  beforeEach(() => { localStorage.clear(); document.body.innerHTML = ''; });
  afterEach(() => { for (const a of mounted.splice(0)) a.destroy(); });

  it('ES-R70 slider ends and small steps read right (+60, -5, -60, -120, +5)', () => {
    const root = mount();
    expect(slide(root, '60')).toBe('1 h later');
    expect(slide(root, '-5')).toBe('5 min earlier');
    expect(slide(root, '-60')).toBe('1 h earlier');
    expect(slide(root, '-120')).toBe('2 h earlier');
    expect(slide(root, '5')).toBe('5 min later');
    expect(root.querySelector('[data-input="fake"]')!.getAttribute('aria-valuetext')).toBe('5 min later');
  });

  it('ES-R69 the reset button is a real button named Back to real time and returns focus to the slider', () => {
    const root = mount(() => new Date(2026, 10, 1, 20, 0));
    slide(root, '60');
    const btn = root.querySelector<HTMLButtonElement>('[data-action="real-time"]')!;
    expect(btn.type).toBe('button');
    expect(btn.textContent!.trim()).toBe('Back to real time');
    btn.focus();
    btn.click();
    expect(document.activeElement).toBe(root.querySelector('[data-input="fake"]'));
    expect(root.querySelector('[data-fake]')!.textContent).toBe('real time');
  });

  it('ES-R69 a later pretend time also shows the tag and button; returning the slider to 0 by hand hides both', () => {
    const root = mount(() => new Date(2026, 10, 1, 20, 0));
    slide(root, '60');
    expect(root.querySelector('[data-clock]')!.textContent).toContain('9:00');
    expect(root.querySelector<HTMLElement>('[data-pretend]')!.hidden).toBe(false);
    slide(root, '0');
    expect(root.querySelector<HTMLElement>('[data-pretend]')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('[data-action="real-time"]')!.hidden).toBe(true);
  });

  it('ES-R69 the header reads the time and the pretend tag as separate words', () => {
    const root = mount(() => new Date(2026, 10, 1, 20, 0));
    slide(root, '-60');
    const text = root.querySelector('.clock b')!.textContent!;
    expect(text).toMatch(/\d \S*\s+pretend|\d\s+pretend/i);
  });
});
