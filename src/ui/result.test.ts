import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersonMask, Segmenter } from '../segment/types';

// Test-only stand-ins: jsdom has no WebGL or canvas pixels.
const render = vi.fn();
const setEnergy = vi.fn();
const setIntensity = vi.fn();
const fakeRenderer = () => ({
  canvas: document.createElement('canvas'),
  kind: 'webgl',
  render,
  setEnergy,
  setIntensity,
  destroy: vi.fn(),
});
const createAuraRenderer = vi.fn(fakeRenderer);
vi.mock('../aura/renderer', () => ({ createAuraRenderer: (...args: unknown[]) => createAuraRenderer(...(args as [])) }));

// Test-only video export stand-in that records until it is cancelled.
let videoSignal: AbortSignal | undefined;
vi.mock('../export/export', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../export/export')>()),
  canRecordVideo: () => true,
  exportVideo: (_c: unknown, _e: unknown, _s: unknown, _p: unknown, signal?: AbortSignal) => {
    videoSignal = signal;
    return new Promise((_, reject) => signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError'))));
  },
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
    // Video recording is stubbed on here; jsdom has no Web Share API.
    expect(stage.querySelector<HTMLElement>('[data-action="save-video"]')!.hidden).toBe(false);
    expect(stage.querySelector<HTMLElement>('[data-action="share"]')!.hidden).toBe(true);
    view.destroy();
  });

  it('ES-R52 without a share sheet, Save image is the main button', async () => {
    const view = showResult(stage, photo(), {
      ...base,
      getSegmenter: async () => fakeSegmenter((x, y) => Math.hypot(x - 32, y - 32) < 16),
    });
    await flush();
    expect(stage.querySelector('[data-action="save-image"]')!.classList.contains('primary')).toBe(true);
    view.destroy();
  });

  it('ES-R59 dims the photo when nobody is in it', async () => {
    showResult(stage, photo(), { ...base, getSegmenter: async () => fakeSegmenter(() => false) });
    await flush();
    expect(stage.querySelector('.frame')!.classList.contains('noperson')).toBe(true);
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

  it('ES-R37 shows an error instead of hanging when the aura cannot be drawn', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    createAuraRenderer.mockImplementationOnce(() => {
      throw new Error('no 2d either');
    });
    showResult(stage, photo(), { ...base, getSegmenter: async () => fakeSegmenter(() => true) });
    await flush();
    const status = stage.querySelector('.status')!;
    expect(status.textContent).not.toMatch(/Scanning/);
    expect(status.textContent).toMatch(/couldn't draw/);
    expect(status.classList.contains('warn')).toBe(true);
  });

  it('ES-R43 a lost WebGL context says to scan again instead of leaving a blank aura', async () => {
    const view = showResult(stage, photo(), { ...base, getSegmenter: async () => fakeSegmenter(() => true) });
    await flush();
    stage.querySelector('canvas.aura')!.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(stage.querySelector('.status')!.textContent).toMatch(/New photo/);
    expect(stage.querySelector<HTMLElement>('[data-action="save-image"]')!.hidden).toBe(true);
    view.destroy();
  });

  it('ES-R42 New photo during Save video cancels the recording quietly', async () => {
    const view = showResult(stage, photo(), { ...base, getSegmenter: async () => fakeSegmenter(() => true) });
    await flush();
    stage.querySelector<HTMLButtonElement>('[data-action="save-video"]')!.click();
    expect(videoSignal?.aborted).toBe(false);
    view.destroy();
    expect(videoSignal?.aborted).toBe(true);
    await flush();
    expect(stage.querySelector('.status')!.textContent).not.toMatch(/did not work/);
  });
});
