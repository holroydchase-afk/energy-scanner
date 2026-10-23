import { afterEach, describe, expect, it, vi } from 'vitest';
import { boxShortSide, createAuraRenderer, REVEAL_SECONDS, revealAt, type AuraScene } from './renderer';

/** Test-only 2D context: every drawing call is a no-op. */
function fake2d(): CanvasRenderingContext2D {
  return new Proxy({} as Record<string, unknown>, {
    get: (target, key) =>
      key in target
        ? target[key as string]
        : key === 'createImageData'
          ? (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })
          : () => undefined,
    set: (target, key, value) => {
      target[key as string] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function scene(): AuraScene {
  const photo = document.createElement('canvas');
  photo.width = 8;
  photo.height = 8;
  return {
    photo,
    mask: { width: 8, height: 8, data: new Float32Array(64).fill(1) },
    field: { width: 8, height: 8, sdf: new Float32Array(64), coverage: 1, box: { x: 0, y: 0, width: 1, height: 1 } },
  };
}

const GREY = { id: 'grey', name: 'Grey Energy', colors: [[1, 1, 1], [0.6, 0.6, 0.8], [0.3, 0.3, 0.5]] } as const;

describe('revealAt', () => {
  it('starts at 0 and settles at 1', () => {
    expect(revealAt(0)).toBe(0);
    expect(revealAt(REVEAL_SECONDS)).toBe(1);
    expect(revealAt(REVEAL_SECONDS * 3)).toBe(1);
    expect(revealAt(-1)).toBe(0);
  });
  it('rises monotonically', () => {
    let last = -1;
    for (let t = 0; t <= REVEAL_SECONDS; t += 0.1) {
      const v = revealAt(t);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });
});

describe('boxShortSide', () => {
  it('measures the person box against the image short side', () => {
    const field = { width: 4, height: 3, sdf: new Float32Array(12), coverage: 0.1, box: { x: 0, y: 0, width: 0.25, height: 0.5 } };
    // Box is 200 x 300 in an 800 x 600 image: short side 200 / 600.
    expect(boxShortSide(field, 800, 600)).toBeCloseTo(200 / 600);
    expect(boxShortSide({ ...field, box: null }, 800, 600)).toBe(1);
  });
});

describe('createAuraRenderer fallbacks', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ES-R37 falls back to Canvas 2D when WebGL setup throws', () => {
    // Once a canvas has a WebGL context, browsers refuse it a 2D one, so the fallback needs its own.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, kind: string) {
      if (kind === 'webgl2') return { createProgram: () => null } as unknown as WebGL2RenderingContext;
      return this.dataset.gl ? null : fake2d();
    } as never);
    const canvas = document.createElement('canvas');
    canvas.dataset.gl = 'taken';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const renderer = createAuraRenderer(scene(), canvas);
    expect(renderer.kind).toBe('canvas2d');
    expect(renderer.canvas).not.toBe(canvas);
    expect([renderer.canvas.width, renderer.canvas.height]).toEqual([8, 8]);
  });

  it('ES-R44 the Canvas 2D aura reuses its layers between frames', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) => (kind === '2d' ? fake2d() : null)) as never);
    const renderer = createAuraRenderer(scene());
    renderer.setEnergy(GREY);
    const create = vi.spyOn(document, 'createElement');
    for (let i = 0; i < 10; i++) renderer.render(i / 30);
    expect(create).not.toHaveBeenCalled();
  });
});
