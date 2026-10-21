import { describe, expect, it } from 'vitest';
import { averagePersonColor, ENERGY_TYPES, energyTypeById, pickEnergyType, rgbToHsl } from './presets';

describe('energy types', () => {
  it('has unique ids and complete palettes', () => {
    const ids = new Set(ENERGY_TYPES.map((t) => t.id));
    expect(ids.size).toBe(ENERGY_TYPES.length);
    for (const t of ENERGY_TYPES) {
      expect(t.colors).toHaveLength(3);
      for (const c of t.colors) for (const v of c) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
  it('falls back to the first type for unknown ids', () => {
    expect(energyTypeById('nope').id).toBe(ENERGY_TYPES[0]!.id);
  });
});

describe('rgbToHsl', () => {
  it('converts primaries', () => {
    expect(rgbToHsl([1, 0, 0])[0]).toBeCloseTo(0);
    expect(rgbToHsl([0, 1, 0])[0]).toBeCloseTo(120);
    expect(rgbToHsl([0, 0, 1])[0]).toBeCloseTo(240);
    expect(rgbToHsl([0.5, 0.5, 0.5])[1]).toBe(0);
  });
});

describe('pickEnergyType', () => {
  it.each([
    [[0.8, 0.1, 0.15], 'passion'],
    [[0.9, 0.7, 0.2], 'radiant'],
    [[0.2, 0.7, 0.3], 'vital'],
    [[0.1, 0.4, 0.8], 'calm'],
    [[0.5, 0.2, 0.8], 'mystic'],
    [[0.5, 0.5, 0.52], 'spectrum'],
    [[0.02, 0.02, 0.03], 'spectrum'],
  ] as const)('reads %j as %s', (rgb, id) => {
    expect(pickEnergyType(rgb).id).toBe(id);
  });
});

describe('averagePersonColor', () => {
  it('averages only person pixels', () => {
    // Left half red (person), right half blue (background).
    const w = 10;
    const h = 2;
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        px[i] = x < 5 ? 255 : 0;
        px[i + 2] = x < 5 ? 0 : 255;
      }
    const avg = averagePersonColor(px, w, h, (u) => (u < 0.5 ? 1 : 0));
    expect(avg).toEqual([1, 0, 0]);
  });
  it('returns grey when nobody is there', () => {
    expect(averagePersonColor(new Uint8ClampedArray(16), 2, 2, () => 0)).toEqual([0.5, 0.5, 0.5]);
  });
});
