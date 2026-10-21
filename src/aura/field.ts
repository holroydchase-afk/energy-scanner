import type { PersonMask } from '../segment/types';

/** Longest side of the grid the aura field is computed on. Small keeps it fast; the GPU smooths it. */
export const FIELD_SIDE = 256;

const INF = 1e20;

/**
 * Exact squared Euclidean distance transform (Felzenszwalb and Huttenlocher), 1D pass.
 * f holds 0 at feature cells and INF elsewhere; result is written to d.
 */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k--;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const dq = q - v[k]!;
    d[q] = dq * dq + f[v[k]!]!;
  }
}

/** Distance (in cells) from every cell to the nearest cell where `isFeature` is true. */
export function distanceTransform(isFeature: Uint8Array, width: number, height: number): Float32Array {
  const n = Math.max(width, height);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const grid = new Float64Array(width * height);
  for (let i = 0; i < grid.length; i++) grid[i] = isFeature[i] ? 0 : INF;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x]!;
    edt1d(f, height, d, v, z);
    for (let y = 0; y < height; y++) grid[y * width + x] = d[y]!;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = grid[y * width + x]!;
    edt1d(f, width, d, v, z);
    for (let x = 0; x < width; x++) grid[y * width + x] = d[x]!;
  }
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(grid[i]!);
  return out;
}

/** Box-filter resample of a mask to the given size. */
export function resampleMask(mask: PersonMask, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const sx = mask.width / width;
  const sy = mask.height / height;
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let sum = 0;
      let count = 0;
      for (let yy = y0; yy < y1 && yy < mask.height; yy++) {
        for (let xx = x0; xx < x1 && xx < mask.width; xx++) {
          sum += mask.data[yy * mask.width + xx]!;
          count++;
        }
      }
      out[y * width + x] = count ? sum / count : 0;
    }
  }
  return out;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AuraField {
  width: number;
  height: number;
  /**
   * Signed distance to the person's outline, in fractions of the image's shorter side:
   * positive outside the person, negative inside.
   */
  sdf: Float32Array;
  /** Share of the image covered by the person, 0..1. */
  coverage: number;
  /** Bounding box of the person in 0..1 image coordinates, or null when nobody was found. */
  box: Box | null;
}

/** Less than this share of the frame counts as "no person found". */
export const MIN_COVERAGE = 0.005;

export function buildAuraField(mask: PersonMask, aspect: number, side: number = FIELD_SIDE): AuraField {
  const width = aspect >= 1 ? side : Math.max(1, Math.round(side * aspect));
  const height = aspect >= 1 ? Math.max(1, Math.round(side / aspect)) : side;
  const small = resampleMask(mask, width, height);

  const inside = new Uint8Array(width * height);
  const outside = new Uint8Array(width * height);
  let count = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (small[i]! >= 0.5) {
        inside[i] = 1;
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      } else {
        outside[i] = 1;
      }
    }
  }

  const coverage = count / (width * height);
  const shortSide = Math.min(width, height);
  const sdf = new Float32Array(width * height);
  if (count === 0) {
    sdf.fill(1);
  } else if (count === width * height) {
    sdf.fill(-1);
  } else {
    const toPerson = distanceTransform(inside, width, height);
    const toBackground = distanceTransform(outside, width, height);
    for (let i = 0; i < sdf.length; i++) {
      // Half-cell offsets put the zero crossing on the boundary between cells.
      const d = inside[i] ? -(toBackground[i]! - 0.5) : toPerson[i]! - 0.5;
      sdf[i] = d / shortSide;
    }
  }

  const box =
    count > 0 && coverage >= MIN_COVERAGE
      ? { x: minX / width, y: minY / height, width: (maxX + 1 - minX) / width, height: (maxY + 1 - minY) / height }
      : null;
  return { width, height, sdf, coverage, box };
}
