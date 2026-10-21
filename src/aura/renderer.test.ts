import { describe, expect, it } from 'vitest';
import { REVEAL_SECONDS, revealAt } from './renderer';

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
