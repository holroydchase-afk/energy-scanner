import { describe, expect, it } from 'vitest';
import { keepMainPerson } from './main-person';
import type { PersonMask } from './types';

function blobs(w: number, h: number, rects: [number, number, number, number][]): PersonMask {
  const data = new Float32Array(w * h);
  for (const [x0, y0, x1, y1] of rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[y * w + x] = 0.95;
  return { width: w, height: h, data };
}

describe('keepMainPerson', () => {
  it('drops a small shape away from the main person (a fan, a sliver of someone else)', () => {
    // Main person: 40x60 in the middle. Second shape: 10x10 in the corner (about 4% of the main one).
    const mask = blobs(200, 150, [[80, 40, 120, 100], [5, 5, 15, 15]]);
    const out = keepMainPerson(mask);
    expect(out.data[70 * 200 + 100]!).toBeGreaterThan(0.9);
    expect(out.data[10 * 200 + 10]!).toBeLessThan(0.05);
  });

  it('keeps two people of similar size', () => {
    const mask = blobs(200, 150, [[20, 40, 60, 110], [130, 40, 170, 100]]);
    const out = keepMainPerson(mask);
    expect(out.data[70 * 200 + 40]!).toBeGreaterThan(0.9);
    expect(out.data[70 * 200 + 150]!).toBeGreaterThan(0.9);
  });

  it('keeps the soft edge of the main person', () => {
    const mask = blobs(200, 150, [[80, 40, 120, 100]]);
    mask.data[70 * 200 + 121] = 0.4; // just outside, below the 0.5 line
    const out = keepMainPerson(mask);
    expect(out.data[70 * 200 + 121]!).toBeCloseTo(0.4, 1);
  });

  it('returns the mask unchanged when nobody is there', () => {
    const mask = blobs(50, 50, []);
    expect(keepMainPerson(mask).data.every((v) => v === 0)).toBe(true);
  });
});
