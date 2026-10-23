export type Rgb = readonly [number, number, number];

/** An aura palette: the bedtime levels each have one (see `src/bedtime/energy.ts`). */
export interface EnergyType {
  id: string;
  name: string;
  /** Colors from the body outward: core, middle, outer edge. 0..1 linear-ish sRGB. */
  colors: readonly [Rgb, Rgb, Rgb];
  /** Cycle hues over time and space instead of using fixed colors. */
  spectrum?: boolean;
}
