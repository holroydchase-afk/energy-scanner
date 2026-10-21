import { describe, expect, it } from 'vitest';
import { buildAuraField, distanceTransform, MIN_COVERAGE, resampleMask } from './field';
import type { PersonMask } from '../segment/types';

function maskFrom(width: number, height: number, inside: (x: number, y: number) => boolean): PersonMask {
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = inside(x, y) ? 1 : 0;
  return { width, height, data };
}

describe('distanceTransform', () => {
  it('measures Euclidean distance to the nearest feature', () => {
    const w = 7;
    const h = 7;
    const f = new Uint8Array(w * h);
    f[3 * w + 3] = 1;
    const d = distanceTransform(f, w, h);
    expect(d[3 * w + 3]).toBe(0);
    expect(d[3 * w + 6]).toBeCloseTo(3);
    expect(d[0]).toBeCloseTo(Math.hypot(3, 3));
  });

  it('handles several features', () => {
    const f = new Uint8Array(10);
    f[0] = 1;
    f[9] = 1;
    const d = distanceTransform(f, 10, 1);
    expect(Array.from(d)).toEqual([0, 1, 2, 3, 4, 4, 3, 2, 1, 0]);
  });
});

describe('resampleMask', () => {
  it('averages blocks when shrinking', () => {
    const mask = maskFrom(4, 4, (x) => x < 2);
    const small = resampleMask(mask, 2, 2);
    expect(Array.from(small)).toEqual([1, 0, 1, 0]);
  });
  it('repeats cells when growing', () => {
    const mask = maskFrom(2, 1, (x) => x === 0);
    expect(Array.from(resampleMask(mask, 4, 1))).toEqual([1, 1, 0, 0]);
  });
});

describe('buildAuraField', () => {
  const circle = maskFrom(200, 200, (x, y) => Math.hypot(x - 100, y - 100) < 40);

  it('is negative inside the person and positive outside', () => {
    const field = buildAuraField(circle, 1, 100);
    const at = (x: number, y: number) => field.sdf[y * field.width + x]!;
    expect(at(50, 50)).toBeLessThan(0);
    expect(at(5, 5)).toBeGreaterThan(0);
    // Center is about one radius (20 cells of 100) from the outline.
    expect(at(50, 50)).toBeCloseTo(-0.2, 1);
    // Distance grows moving away from the person.
    expect(at(90, 50)).toBeGreaterThan(at(80, 50));
  });

  it('reports coverage and a bounding box', () => {
    const field = buildAuraField(circle, 1, 100);
    expect(field.coverage).toBeCloseTo(Math.PI * 0.2 * 0.2, 1);
    expect(field.box!.x).toBeCloseTo(0.3, 1);
    expect(field.box!.width).toBeCloseTo(0.4, 1);
  });

  it('keeps the photo aspect ratio', () => {
    expect(buildAuraField(circle, 2, 100)).toMatchObject({ width: 100, height: 50 });
    expect(buildAuraField(circle, 0.5, 100)).toMatchObject({ width: 50, height: 100 });
  });

  it('finds nobody in an empty mask', () => {
    const field = buildAuraField(maskFrom(50, 50, () => false), 1, 50);
    expect(field.coverage).toBe(0);
    expect(field.box).toBeNull();
    expect(field.sdf.every((v) => v > 0)).toBe(true);
  });

  it('treats a speck as nobody', () => {
    const field = buildAuraField(maskFrom(100, 100, (x, y) => x === 10 && y === 10), 1, 100);
    expect(field.coverage).toBeLessThan(MIN_COVERAGE);
    expect(field.box).toBeNull();
  });

  it('handles a person filling the whole frame', () => {
    const field = buildAuraField(maskFrom(20, 20, () => true), 1, 20);
    expect(field.coverage).toBe(1);
    expect(field.sdf.every((v) => v < 0)).toBe(true);
  });
});
