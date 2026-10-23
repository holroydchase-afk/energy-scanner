import { describe, expect, it } from 'vitest';
import { boxShortSide, REVEAL_SECONDS, revealAt } from './renderer';

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
