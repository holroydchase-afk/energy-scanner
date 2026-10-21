import { describe, expect, it } from 'vitest';
import { clamp, lerp, smoothstep } from './math';

describe('math', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
  it('lerps', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });
  it('smoothsteps', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });
});
