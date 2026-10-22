import type { EnergyType, Rgb } from '../aura/presets';

// Ported from the original bedtime Energy Scanner prototype (a Claude artifact on chaseholroyd.com).

export interface Step {
  id: string;
  icon: string;
  label: string;
}

export const STEPS: readonly Step[] = [
  { id: 'bath', icon: '🛁', label: 'Bath' },
  { id: 'pjs', icon: '👕', label: 'PJs' },
  { id: 'teeth', icon: '🪥', label: 'Teeth' },
  { id: 'potty', icon: '🚽', label: 'Potty' },
  { id: 'book', icon: '📖', label: 'Book' },
];

export interface Level {
  id: string;
  /** Lowest energy (0..100) that reads as this level. */
  min: number;
  name: string;
  /** Main color for the reading card. */
  color: string;
  /** Optional CSS gradient for the level name. */
  swatch?: string;
  texts: readonly string[];
  /** Aura palette for the photo scan. */
  aura: EnergyType;
}

const hex = (h: string): Rgb => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const aura = (id: string, name: string, c0: string, c1: string, c2: string, spectrum = false): EnergyType => ({
  id,
  name,
  reading: '',
  colors: [hex(c0), hex(c1), hex(c2)],
  spectrum,
});

export const LEVELS: readonly Level[] = [
  {
    id: 'rainbow',
    min: 85,
    name: 'Rainbow Energy',
    color: '#FF6B9A',
    swatch: 'linear-gradient(90deg,#FF6B6B,#FFB84D,#FFE66B,#6BE38C,#5BC8FF,#B98BFF)',
    texts: [
      'Whoa! Every color at once. Your body is a fireworks show right now.',
      "Rainbow! The scanner can barely keep up. That's way too much sparkle for sleeping.",
    ],
    aura: aura('rainbow', 'Rainbow', '#ffffff', '#ff6ec7', '#4fe3ff', true),
  },
  {
    id: 'red',
    min: 65,
    name: 'Red Rocket Energy',
    color: '#FF7A5C',
    texts: ['Red rocket! You\'re zooming. Rockets need a cooldown before they land.', 'Hot red energy. The engines are still running.'],
    aura: aura('red', 'Red Rocket', '#ffe0d6', '#ff7a5c', '#d1301a'),
  },
  {
    id: 'yellow',
    min: 45,
    name: 'Yellow Energy',
    color: '#FFD95C',
    texts: ['Yellow, like an afternoon sun. Still bright, starting to set.', 'Sunny yellow. Your battery is about half full and dropping.'],
    aura: aura('yellow', 'Yellow', '#fff6cc', '#ffd95c', '#ff9a1a'),
  },
  {
    id: 'green',
    min: 28,
    name: 'Green Glow Energy',
    color: '#6BE38C',
    texts: ["A soft green glow, like a firefly. You're slowing down nicely.", 'Green glow. The scanner sees calm coming.'],
    aura: aura('green', 'Green Glow', '#e6ffe9', '#6be38c', '#0f9e6e'),
  },
  {
    id: 'blue',
    min: 12,
    name: 'Blue Moon Energy',
    color: '#6FB4FF',
    texts: ['Blue moon. The scanner picked up a yawn hiding in there.', 'Deep blue, like the sky right outside. Sleep is on its way.'],
    aura: aura('blue', 'Blue Moon', '#e0f0ff', '#6fb4ff', '#2a4dd6'),
  },
  {
    id: 'grey',
    min: 0,
    name: 'Grey Energy',
    color: '#B8BCD6',
    texts: [
      'Battery almost empty. Time to plug in to your pillow and recharge.',
      'The scanner says your body is ready to power down for the night.',
    ],
    aura: aura('grey', 'Grey', '#f2f3fa', '#b8bcd6', '#6b6f8f'),
  },
];

export function levelFor(energy: number): Level {
  return LEVELS.find((l) => energy >= l.min) ?? LEVELS[LEVELS.length - 1]!;
}

export interface EnergyInputs {
  /** Grown-up switch: every scan reads Grey. */
  alwaysGrey: boolean;
  /** Minutes until bedtime; negative once it's past. */
  minutesToBed: number;
  stepsDone: number;
  stepsTotal: number;
  /** 0..1, injectable for tests. */
  random?: () => number;
}

/**
 * The scan result, 3..99. Closer to bedtime and more steps done reads sleepier, with a little
 * randomness so it doesn't feel canned, and never above Green once every step is done.
 */
export function computeEnergy({ alwaysGrey, minutesToBed, stepsDone, stepsTotal, random = Math.random }: EnergyInputs): number {
  if (alwaysGrey) return Math.round(3 + random() * 8);
  const timePart = Math.max(0, Math.min(1, (minutesToBed + 30) / 150)); // 2h before -> 1, 30m past -> 0
  const stepPart = 1 - stepsDone / stepsTotal;
  let e = 100 * (0.55 * timePart + 0.45 * stepPart) + (random() * 16 - 8);
  if (stepsDone === stepsTotal) e = Math.min(e, 40);
  return Math.round(Math.max(3, Math.min(99, e)));
}

/** Bedtime ("20:00") as a date: today's, or tomorrow's once it's more than 8 hours past. */
export function bedtimeFor(now: Date, bed: string): Date {
  const [h, m] = bed.split(':').map(Number);
  const b = new Date(now);
  b.setHours(h ?? 20, m ?? 0, 0, 0);
  if (now.getTime() - b.getTime() > 8 * 3600e3) b.setDate(b.getDate() + 1);
  return b;
}

export function todoLine(remaining: readonly Step[]): string {
  return remaining.length
    ? `Still to do: ${remaining.map((s) => s.label).join(', ')}. Then scan again.`
    : 'All steps done. Lights out, recharge all night. ⭐';
}

/** Aura strength and speed follow the energy: Grey glows softly and slowly, Rainbow blazes. */
export function auraFeel(energy: number): { intensity: number; speed: number } {
  const e = Math.max(0, Math.min(100, energy)) / 100;
  return { intensity: 0.5 + 0.45 * e, speed: 0.35 + 1.1 * e };
}

/** Tonight's key: the day rolls over at 5am so a late bedtime still counts as tonight. */
export function nightKey(now: Date): string {
  return 'steps-' + new Date(now.getTime() - 5 * 3600e3).toISOString().slice(0, 10);
}
