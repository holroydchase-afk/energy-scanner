import type { PersonMask, Segmenter } from './types';

// MediaPipe's selfie segmenter (float16, about 250 KB): sharp edges and fast enough for phones.
// The 16 MB multiclass model was tried and rejected: softer edges, 4x slower, too heavy to ship.
const MODEL_FILE = 'models/selfie_segmenter.tflite';

/**
 * Person segmentation with MediaPipe Tasks Vision, fully on-device. The wasm runtime and the
 * model are served from this app's own origin, so no photo or request leaves the browser.
 */
export async function createMediaPipeSegmenter(): Promise<Segmenter> {
  const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  const fileset = await FilesetResolver.forVisionTasks(new URL('mediapipe', base).href);
  const modelAssetPath = new URL(MODEL_FILE, base).href;

  const create = (delegate: 'GPU' | 'CPU') =>
    ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath, delegate },
      runningMode: 'IMAGE',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });

  // Real iPhone photos came back with blocky masks, so Safari skips WebKit's GPU path and uses
  // the CPU, which is fast enough for this small model.
  let segmenter;
  try {
    segmenter = await create(isSafari(navigator.userAgent) ? 'CPU' : 'GPU');
  } catch {
    segmenter = await create('CPU');
  }

  return {
    async segment(image: HTMLCanvasElement): Promise<PersonMask> {
      const result = segmenter.segment(image);
      try {
        const mask = result.confidenceMasks?.[0];
        if (!mask) throw new Error('Segmentation returned no mask');
        // Copy: the mask's memory belongs to MediaPipe and is freed by result.close().
        const data = new Float32Array(mask.getAsFloat32Array());
        return { width: mask.width, height: mask.height, data };
      } finally {
        result.close();
      }
    },
  };
}

/** Safari, including every iPhone browser (they all run WebKit). */
export function isSafari(userAgent: string): boolean {
  return /AppleWebKit/.test(userAgent) && (!/Chrome|Chromium|Edg|OPR/.test(userAgent) || /iPhone|iPad|iPod/.test(userAgent));
}
