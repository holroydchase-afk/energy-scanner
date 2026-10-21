import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersonMask, Segmenter } from '../segment/types';

// Test-only stand-ins: jsdom has no WebGL or canvas pixels.
const render = vi.fn();
const setEnergy = vi.fn();
const setIntensity = vi.fn();
vi.mock('../aura/renderer', () => ({
  createAuraRenderer: () => ({
    canvas: document.createElement('canvas'),
    kind: 'webgl',
    render,
    setEnergy,
    setIntensity,
    destroy: vi.fn(),
  }),
}));

const { showResult } = await import('./result');

function photo(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 100;
  c.height = 100;
  return c;
}

/** Labeled fake segmenter for tests only. */
function fakeSegmenter(inside: (x: number, y: number) => boolean): Segmenter {
  return {
    async segment(): Promise<PersonMask> {
      const data = new Float32Array(64 * 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) data[y * 64 + x] = inside(x, y) ? 1 : 0;
      return { width: 64, height: 64, data };
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 10));

describe('showResult', () => {
  let stage: HTMLElement;
  beforeEach(() => {
    stage = document.createElement('div');
    document.body.append(stage);
  });
  afterEach(() => {
    stage.remove();
    vi.clearAllMocks();
  });

  it('scans, then shows the energy reading and controls', async () => {
    const view = showResult(stage, photo(), {
      getSegmenter: async () => fakeSegmenter((x, y) => Math.hypot(x - 32, y - 32) < 16),
      onReset: () => undefined,
      minScanMs: 0,
    });
    expect(stage.querySelector('.status')!.textContent).toMatch(/Scanning/);
    await flush();
    const panel = stage.querySelector<HTMLElement>('.panel')!;
    expect(panel.hidden).toBe(false);
    expect(stage.querySelector('.energy-name')!.textContent).not.toBe('');
    expect(setEnergy).toHaveBeenCalled();
    expect(setIntensity).toHaveBeenCalledWith(0.7);
    expect(view.energy()).not.toBeNull();
    expect(stage.querySelectorAll('[aria-checked="true"]')).toHaveLength(1);
    expect(stage.querySelector<HTMLElement>('[data-action="save-image"]')!.hidden).toBe(false);
    // jsdom has neither MediaRecorder nor the Web Share API.
    expect(stage.querySelector<HTMLElement>('[data-action="save-video"]')!.hidden).toBe(true);
    expect(stage.querySelector<HTMLElement>('[data-action="share"]')!.hidden).toBe(true);
    view.destroy();
  });

  it('switches energy type from the chips', async () => {
    const view = showResult(stage, photo(), {
      getSegmenter: async () => fakeSegmenter((x, y) => Math.hypot(x - 32, y - 32) < 16),
      onReset: () => undefined,
      minScanMs: 0,
    });
    await flush();
    stage.querySelector<HTMLButtonElement>('[data-energy="calm"]')!.click();
    expect(stage.querySelector('.energy-name')!.textContent).toBe('Calm');
    expect(setEnergy).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'calm' }));
    expect(stage.querySelector('[data-energy="calm"]')!.getAttribute('aria-checked')).toBe('true');
    view.destroy();
  });

  it('passes the intensity slider to the renderer', async () => {
    const view = showResult(stage, photo(), {
      getSegmenter: async () => fakeSegmenter((x, y) => Math.hypot(x - 32, y - 32) < 16),
      onReset: () => undefined,
      minScanMs: 0,
    });
    await flush();
    const slider = stage.querySelector<HTMLInputElement>('[data-input="intensity"]')!;
    slider.value = '25';
    slider.dispatchEvent(new Event('input'));
    expect(setIntensity).toHaveBeenLastCalledWith(0.25);
    view.destroy();
  });

  it('says so when nobody is in the photo', async () => {
    showResult(stage, photo(), { getSegmenter: async () => fakeSegmenter(() => false), onReset: () => undefined, minScanMs: 0 });
    await flush();
    expect(stage.querySelector('.status')!.textContent).toMatch(/No person found/);
    expect(stage.querySelector<HTMLElement>('.panel')!.hidden).toBe(true);
    expect(stage.querySelector<HTMLElement>('[data-action="save-image"]')!.hidden).toBe(true);
  });

  it('explains when the scanner cannot load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    showResult(stage, photo(), {
      getSegmenter: () => Promise.reject(new Error('no wasm')),
      onReset: () => undefined,
      minScanMs: 0,
    });
    await flush();
    expect(stage.querySelector('.status')!.textContent).toMatch(/could not start/);
  });

  it('calls onReset from New photo', () => {
    const onReset = vi.fn();
    showResult(stage, photo(), { getSegmenter: () => new Promise(() => undefined), onReset, minScanMs: 0 });
    stage.querySelector<HTMLButtonElement>('[data-action="reset"]')!.click();
    expect(onReset).toHaveBeenCalled();
  });
});
