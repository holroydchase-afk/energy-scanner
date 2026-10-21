export type Rgb = readonly [number, number, number];

export interface EnergyType {
  id: string;
  name: string;
  /** One-line, playful reading shown with the result. */
  reading: string;
  /** Colors from the body outward: core, middle, outer edge. 0..1 linear-ish sRGB. */
  colors: readonly [Rgb, Rgb, Rgb];
  /** Cycle hues over time and space instead of using fixed colors. */
  spectrum?: boolean;
}

const hex = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const ENERGY_TYPES: readonly EnergyType[] = [
  {
    id: 'radiant',
    name: 'Radiant',
    reading: 'Warm, confident, magnetic. People feel lighter around you.',
    colors: [hex('#fff4c2'), hex('#ffc23d'), hex('#ff6a1a')],
  },
  {
    id: 'passion',
    name: 'Passion',
    reading: 'Bold, driven, intense. You walk in and the room notices.',
    colors: [hex('#ffd1dc'), hex('#ff3d7f'), hex('#b0122e')],
  },
  {
    id: 'mystic',
    name: 'Mystic',
    reading: 'Intuitive, creative, deep. You see what others miss.',
    colors: [hex('#f0dcff'), hex('#a35cff'), hex('#3b1cb3')],
  },
  {
    id: 'calm',
    name: 'Calm',
    reading: 'Steady, clear, grounded. The calm in every storm.',
    colors: [hex('#dcfbff'), hex('#3dd6ff'), hex('#1a4dff')],
  },
  {
    id: 'vital',
    name: 'Vital',
    reading: 'Growing, healing, balanced. You make things flourish.',
    colors: [hex('#eaffd6'), hex('#5dff7a'), hex('#0f9e6e')],
  },
  {
    id: 'spectrum',
    name: 'Spectrum',
    reading: 'All of it at once. Rare, restless, impossible to pin down.',
    colors: [hex('#ffffff'), hex('#ff6ec7'), hex('#4fe3ff')],
    spectrum: true,
  },
];

export function energyTypeById(id: string): EnergyType {
  return ENERGY_TYPES.find((t) => t.id === id) ?? ENERGY_TYPES[0]!;
}

/** RGB (0..1) to hue in degrees (0..360), saturation and lightness (0..1). */
export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

/**
 * The "scan": pick an energy type from the average color of the person (clothes, hair, skin).
 * Muted, grey or very dark subjects read as Spectrum. It's for fun, and the person can change it.
 */
export function pickEnergyType(averageColor: Rgb): EnergyType {
  const [h, s, l] = rgbToHsl(averageColor);
  if (s < 0.12 || l < 0.08 || l > 0.95) return energyTypeById('spectrum');
  if (h < 15 || h >= 330) return energyTypeById('passion');
  if (h < 70) return energyTypeById('radiant');
  if (h < 165) return energyTypeById('vital');
  if (h < 250) return energyTypeById('calm');
  return energyTypeById('mystic');
}

/** Average color of the photo where the mask says "person" (weights by confidence). */
export function averagePersonColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  personAt: (x: number, y: number) => number,
): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  let w = 0;
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 20000)));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const p = personAt(x / width, y / height);
      if (p < 0.5) continue;
      const i = (y * width + x) * 4;
      r += pixels[i]! * p;
      g += pixels[i + 1]! * p;
      b += pixels[i + 2]! * p;
      w += p;
    }
  }
  if (w === 0) return [0.5, 0.5, 0.5];
  return [r / w / 255, g / w / 255, b / w / 255];
}
