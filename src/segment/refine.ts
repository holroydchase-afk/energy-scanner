import type { PersonMask } from './types';

/** Longest side of the grid the filter works on. The result is applied back at full size. */
const GRID_SIDE = 320;
/** Window radius in grid cells (about 4% of the long side). */
const RADIUS = 6;
/** How strongly edges in the photo win over the mask. Smaller follows the photo more closely. */
const EPS = 0.004;

/** Brightness 0..1 of each pixel in RGBA bytes. */
export function luminance(rgba: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(rgba.length / 4);
  for (let i = 0; i < out.length; i++) {
    out[i] = (0.299 * rgba[i * 4]! + 0.587 * rgba[i * 4 + 1]! + 0.114 * rgba[i * 4 + 2]!) / 255;
  }
  return out;
}

/** Bilinear sample of a w x h grid at fractional cell coordinates. */
function sample(src: Float32Array, w: number, h: number, x: number, y: number): number {
  const x0 = Math.min(w - 1, Math.max(0, Math.floor(x)));
  const y0 = Math.min(h - 1, Math.max(0, Math.floor(y)));
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = Math.min(1, Math.max(0, x - x0));
  const fy = Math.min(1, Math.max(0, y - y0));
  const top = src[y0 * w + x0]! * (1 - fx) + src[y0 * w + x1]! * fx;
  const bottom = src[y1 * w + x0]! * (1 - fx) + src[y1 * w + x1]! * fx;
  return top * (1 - fy) + bottom * fy;
}

/** Resample a grid to a new size, sampling at cell centers. */
function resize(src: Float32Array, w: number, h: number, outW: number, outH: number): Float32Array {
  if (w === outW && h === outH) return src;
  const out = new Float32Array(outW * outH);
  const sx = w / outW;
  const sy = h / outH;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) out[y * outW + x] = sample(src, w, h, (x + 0.5) * sx - 0.5, (y + 0.5) * sy - 0.5);
  }
  return out;
}

/** Mean over a (2r+1) square window around each cell, clamped at the borders (summed-area table). */
function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const sat = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += src[y * w + x]!;
      sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1]! + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      const sum = sat[y1 * (w + 1) + x1]! - sat[y0 * (w + 1) + x1]! - sat[y1 * (w + 1) + x0]! + sat[y0 * (w + 1) + x0]!;
      out[y * w + x] = sum / ((x1 - x0) * (y1 - y0));
    }
  }
  return out;
}

/**
 * Clean up the segmenter's mask using the photo itself (a fast guided filter, He and Sun 2015).
 * Where the photo has an edge near the outline, the outline moves onto it; elsewhere the mask is
 * smoothed. This removes the blocky tiles and dark jagged fringe some phones' masks produce.
 * `lum` is the photo's brightness, `width` x `height`; the result has the photo's size.
 */
export function refineMask(mask: PersonMask, lum: Float32Array, width: number, height: number): PersonMask {
  const scale = Math.min(1, GRID_SIDE / Math.max(width, height));
  const gw = Math.max(1, Math.round(width * scale));
  const gh = Math.max(1, Math.round(height * scale));
  const I = resize(lum, width, height, gw, gh);
  const p = resize(mask.data, mask.width, mask.height, gw, gh);

  const n = gw * gh;
  const II = new Float32Array(n);
  const Ip = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    II[i] = I[i]! * I[i]!;
    Ip[i] = I[i]! * p[i]!;
  }
  const meanI = boxMean(I, gw, gh, RADIUS);
  const meanP = boxMean(p, gw, gh, RADIUS);
  const corrII = boxMean(II, gw, gh, RADIUS);
  const corrIp = boxMean(Ip, gw, gh, RADIUS);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = corrII[i]! - meanI[i]! * meanI[i]!;
    const covIp = corrIp[i]! - meanI[i]! * meanP[i]!;
    a[i] = covIp / (varI + EPS);
    b[i] = meanP[i]! - a[i]! * meanI[i]!;
  }
  const meanA = boxMean(a, gw, gh, RADIUS);
  const meanB = boxMean(b, gw, gh, RADIUS);

  const data = new Float32Array(width * height);
  const sx = gw / width;
  const sy = gh / height;
  for (let y = 0; y < height; y++) {
    const gy = (y + 0.5) * sy - 0.5;
    for (let x = 0; x < width; x++) {
      const gx = (x + 0.5) * sx - 0.5;
      const q = sample(meanA, gw, gh, gx, gy) * lum[y * width + x]! + sample(meanB, gw, gh, gx, gy);
      data[y * width + x] = Math.min(1, Math.max(0, q));
    }
  }
  return { width, height, data };
}
