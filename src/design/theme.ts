// The studio's Paper theme as color math (ES-M2.4). Written for this repo from the recipe in the studio
// design core (STUDIO-CORE.md section 3, "Color: how to make a theme"); the 7 base colors per mode come
// from tokens.json (see README.md). Contrast is the public WCAG 2 formula.
//
// scripts/gen-themes.mjs turns paletteFor() into the CSS color vars in src/style.css, so the stylesheet
// never drifts from this file (DS-4). Run `npm run themes` after changing anything here.
import tokens from './tokens.json' with { type: 'json' };

export interface Colors {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  fill: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  safe: string;
  safeSoft: string;
  danger: string;
  dangerText: string;
  onDanger: string;
  tabLine: string;
  scrim: string;
  photo: string;
}

type Base = Pick<Colors, 'bg' | 'surface' | 'ink' | 'muted' | 'line' | 'fill' | 'accent'>;

const BASE_KEYS = ['bg', 'surface', 'ink', 'muted', 'line', 'fill', 'accent'] as const;

/** The 7 picked colors of a mode; everything else is derived below. */
function base(dark: boolean): Base {
  const picked = tokens.themes.paper[dark ? 'dark' : 'light'] as Record<string, string>;
  return Object.fromEntries(BASE_KEYS.map((k) => [k, picked[k]!])) as Base;
}

// Shared across every studio theme (STUDIO-CORE section 3).
const SHARED = {
  light: { safe: '#1C6E31', danger: '#B3261E', dangerText: '#B3261E', onDanger: '#FFFFFF', accentInk: '#FFFFFF', scrim: 'rgba(0,0,0,0.4)' },
  dark: { safe: '#7DD394', danger: '#F2B8B5', dangerText: '#FF453A', onDanger: '#601410', accentInk: '#000000', scrim: 'rgba(0,0,0,0.6)' },
};

/** How much of a color goes into the page for its soft tint: 7% light (93% page), 18% dark (82% page). */
const softShare = (dark: boolean) => (dark ? 0.18 : 0.07);

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex(rgb: number[]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** `from` moved `share` (0..1) of the way to `to`, per channel. */
export function mix(from: string, to: string, share: number): string {
  const a = channels(from);
  const b = channels(to);
  return toHex(a.map((v, i) => v + (b[i]! - v) * share));
}

/** WCAG 2 relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Moves `color` toward `to` in 1% steps, from `start`, until `ok` says it's enough. */
export function nudge(color: string, to: string, ok: (c: string) => boolean, start = 0): string {
  for (let pct = Math.round(start * 100); pct <= 100; pct++) {
    const c = mix(color, to, pct / 100);
    if (ok(c)) return c;
  }
  return to;
}

const reaches = (min: number, ...against: string[]) => (c: string) => against.every((x) => contrast(c, x) >= min);

/** Light or dark Paper: the 7 base colors plus the derived ones. */
function derive(b: Base, dark: boolean): Colors {
  const shared = SHARED[dark ? 'dark' : 'light'];
  return {
    ...b,
    ...shared,
    accentSoft: mix(b.bg, b.accent, softShare(dark)),
    safeSoft: mix(b.bg, shared.safe, softShare(dark)),
    tabLine: nudge(b.line, b.ink, reaches(3, b.bg, b.surface)),
    photo: b.fill,
  };
}

/** The set used when the phone asks for more contrast. */
function highContrast(c: Colors, dark: boolean): Colors {
  const muted = nudge(c.muted, c.ink, reaches(7, c.bg, c.fill));
  const line = nudge(c.line, c.ink, reaches(4.5, c.bg, c.surface));
  const accent = nudge(c.accent, c.ink, reaches(7, c.accentInk), 0.3);
  return {
    ...c,
    muted,
    line,
    accent,
    accentSoft: mix(c.bg, accent, softShare(dark)),
    tabLine: nudge(line, c.ink, reaches(3, c.bg, c.surface)),
  };
}

/** Paper in light or dark, optionally the high-contrast set. */
export function paletteFor(dark: boolean, high = false): Colors {
  const c = derive(base(dark), dark);
  return high ? highContrast(c, dark) : c;
}
