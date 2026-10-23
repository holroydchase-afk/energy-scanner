import { describe, expect, it } from 'vitest';
import { luminance, refineMask } from './refine';
import type { PersonMask } from './types';

const W = 96;
const H = 64;

/** A photo with a sharp vertical edge at x = 40: bright person on the left, dark wall on the right. */
function edgePhoto(): Float32Array {
  const lum = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) lum[y * W + x] = x < 40 ? 0.85 : 0.15;
  return lum;
}

/**
 * A coarse mask like the blocky one seen on iPhone: values step in 8x8 tiles, and the outline is a
 * wide soft ramp (x = 32 to 52) instead of following the edge in the photo.
 */
function blockyMask(): PersonMask {
  const data = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tx = Math.floor(x / 8);
      const ty = Math.floor(y / 8);
      const ramp = Math.min(1, Math.max(0, (52 - tx * 8 - 4) / 20));
      data[y * W + x] = Math.min(1, Math.max(0, 0.1 + 0.8 * ramp + ((tx * 7 + ty * 13) % 5) * 0.03 - 0.06));
    }
  }
  return { width: W, height: H, data };
}

describe('refineMask', () => {
  it('keeps the size and the 0..1 range', () => {
    const out = refineMask(blockyMask(), edgePhoto(), W, H);
    expect(out.width).toBe(W);
    expect(out.height).toBe(H);
    for (const v of out.data) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('snaps the outline to the edge in the photo', () => {
    const out = refineMask(blockyMask(), edgePhoto(), W, H);
    const row = 30 * W;
    // The biggest step along a row is where the photo's edge is (39 to 40), and it's a real step.
    let at = 0;
    let step = 0;
    for (let x = 1; x < W; x++) {
      const d = out.data[row + x - 1]! - out.data[row + x]!;
      if (d > step) [at, step] = [x, d];
    }
    expect(at).toBe(40);
    expect(step).toBeGreaterThan(0.25);
    expect(out.data[row + 36]!).toBeGreaterThan(out.data[row + 44]! + 0.3);
  });

  it('smooths the 8x8 tile steps away inside the person', () => {
    const before = blockyMask();
    const out = refineMask(before, edgePhoto(), W, H);
    const spread = (d: Float32Array) => {
      let lo = 1;
      let hi = 0;
      for (let y = 8; y < H - 8; y++) for (let x = 4; x < 24; x++) {
        lo = Math.min(lo, d[y * W + x]!);
        hi = Math.max(hi, d[y * W + x]!);
      }
      return hi - lo;
    };
    expect(spread(out.data)).toBeLessThan(spread(before.data) / 2);
  });

  it('works when the photo and the mask differ in size', () => {
    const small: PersonMask = { width: 48, height: 32, data: new Float32Array(48 * 32).fill(1) };
    const out = refineMask(small, edgePhoto(), W, H);
    expect(out.width).toBe(W);
    expect(out.data[10 * W + 10]!).toBeGreaterThan(0.9);
  });
});

describe('luminance', () => {
  it('turns RGBA bytes into 0..1 brightness', () => {
    const lum = luminance(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]));
    expect(lum[0]).toBeCloseTo(1);
    expect(lum[1]).toBeCloseTo(0);
  });
});
