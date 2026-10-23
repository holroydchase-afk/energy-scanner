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

const GREY = { id: 'grey', name: 'Grey Energy', colors: [[1, 1, 1], [0.7, 0.7, 0.8], [0.4, 0.4, 0.5]] } as const;
const base = { onReset: () => undefined, minScanMs: 0, energy: GREY };

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

  it('scans, then shows the aura and save controls', async () => {
    const view = showResult(stage, photo(), {
      ...base,
      getSegmenter: async () => fakeSegmenter((x, y) => Math.hypot(x - 32, y - 32) < 16),
    });
    expect(stage.querySelector('.status')!.textContent).toMatch(/Scanning/);
    await flush();
    expect(setEnergy).toHaveBeenCalledWith(GREY);
    expect(setIntensity).toHaveBeenCalledWith(0.7);
    expect(view.energy()).toBe(GREY);
    expect(stage.querySelector('canvas.aura')!.getAttribute('aria-label')).toBe('Photo with a glowing Grey Energy aura around the person');
    expect(stage.querySelector<HTMLElement>('[data-action="save-image"]')!.hidden).toBe(false);
    // jsdom has neither MediaRecorder nor the Web Share API.
    expect(stage.querySelector<HTMLElement>('[data-action="save-video"]')!.hidden).toBe(true);
    expect(stage.querySelector<HTMLElement>('[data-action="share"]')!.hidden).toBe(true);
    view.destroy();
  });

  it('uses the given intensity and says when it is ready', async () => {
    const onReady = vi.fn();
    const view = showResult(stage, photo(), {
      ...base,
      getSegmenter: async () => fakeSegmenter((x, y) => Math.hypot(x - 32, y - 32) < 16),
      intensity: 0.4,
      onReady,
    });
    await flush();
    expect(onReady).toHaveBeenCalled();
    expect(setIntensity).toHaveBeenCalledWith(0.4);
    view.destroy();
  });

  it('says so when nobody is in the photo', async () => {
    showResult(stage, photo(), { ...base, getSegmenter: async () => fakeSegmenter(() => false) });
    await flush();
    expect(stage.querySelector('.status')!.textContent).toMatch(/No person found/);
    expect(setEnergy).not.toHaveBeenCalled();
    expect(stage.querySelector<HTMLElement>('[data-action="save-image"]')!.hidden).toBe(true);
  });

  it('explains when the scanner cannot load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    showResult(stage, photo(), {
      ...base,
      getSegmenter: () => Promise.reject(new Error('no wasm')),
    });
    await flush();
    expect(stage.querySelector('.status')!.textContent).toMatch(/could not start/);
  });

  it('retries a failed scanner load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let calls = 0;
    showResult(stage, photo(), {
      getSegmenter: async () => {
        calls++;
        if (calls === 1) throw new Error('offline');
        return fakeSegmenter((x, y) => Math.hypot(x - 32, y - 32) < 16);
      },
      ...base,
    });
    await flush();
    const retry = [...stage.querySelectorAll<HTMLButtonElement>('.status button')].find((b) => b.textContent === 'Try again')!;
    retry.click();
    await flush();
    expect(calls).toBe(2);
    expect(setEnergy).toHaveBeenCalledWith(GREY);
  });

  it('calls onReset from New photo', () => {
    const onReset = vi.fn();
    showResult(stage, photo(), { ...base, getSegmenter: () => new Promise(() => undefined), onReset });
    stage.querySelector<HTMLButtonElement>('[data-action="reset"]')!.click();
    expect(onReset).toHaveBeenCalled();
  });
});
