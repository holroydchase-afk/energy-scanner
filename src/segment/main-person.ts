import type { PersonMask } from './types';

/** Longest side of the grid shapes are found on. */
const GRID_SIDE = 192;
/** A shape this share of the biggest one or more counts as another person and keeps its glow. */
const KEEP_SHARE = 0.25;
/** Grid cells kept around each shape so its soft edge isn't cut off. */
const MARGIN = 2;

/**
 * Keep the main person (and anyone about as big) and drop small shapes the segmenter also
 * picked up, like a ceiling fan or a sliver of someone at the edge, so only they get an aura.
 */
export function keepMainPerson(mask: PersonMask): PersonMask {
  const { width, height } = mask;
  const scale = Math.min(1, GRID_SIDE / Math.max(width, height));
  const gw = Math.max(1, Math.round(width * scale));
  const gh = Math.max(1, Math.round(height * scale));

  // Grid cell is "person" if the mask at its center is 0.5 or more.
  const on = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    const my = Math.min(height - 1, Math.floor(((y + 0.5) / gh) * height));
    for (let x = 0; x < gw; x++) {
      const mx = Math.min(width - 1, Math.floor(((x + 0.5) / gw) * width));
      on[y * gw + x] = mask.data[my * width + mx]! >= 0.5 ? 1 : 0;
    }
  }

  // Label 4-connected shapes with a flood fill.
  const label = new Int32Array(gw * gh);
  const sizes = [0];
  const stack: number[] = [];
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || label[start]) continue;
    const id = sizes.length;
    let size = 0;
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % gw;
      const y = (i - x) / gw;
      for (const j of [x > 0 ? i - 1 : -1, x < gw - 1 ? i + 1 : -1, y > 0 ? i - gw : -1, y < gh - 1 ? i + gw : -1]) {
        if (j >= 0 && on[j] && !label[j]) {
          label[j] = id;
          stack.push(j);
        }
      }
    }
    sizes.push(size);
  }
  if (sizes.length <= 2) return mask; // nobody, or one shape

  const biggest = Math.max(...sizes);
  const keepId = sizes.map((s) => s >= biggest * KEEP_SHARE);

  // Cells near a kept shape stay; everything else is cleared.
  const keep = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!keepId[label[y * gw + x]!] || !label[y * gw + x]) continue;
      for (let dy = -MARGIN; dy <= MARGIN; dy++) {
        for (let dx = -MARGIN; dx <= MARGIN; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) keep[yy * gw + xx] = 1;
        }
      }
    }
  }
  // Fade the mask by the keep grid, sampled smoothly so no blocky edge is left behind.
  const data = new Float32Array(mask.data.length);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(gh - 1, Math.max(0, ((y + 0.5) / height) * gh - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(gh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(gw - 1, Math.max(0, ((x + 0.5) / width) * gw - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(gw - 1, x0 + 1);
      const tx = fx - x0;
      const k =
        (keep[y0 * gw + x0]! * (1 - tx) + keep[y0 * gw + x1]! * tx) * (1 - ty) +
        (keep[y1 * gw + x0]! * (1 - tx) + keep[y1 * gw + x1]! * tx) * ty;
      const i = y * width + x;
      data[i] = mask.data[i]! * k;
    }
  }
  return { width, height, data };
}
