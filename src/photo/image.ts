/** Longest side, in pixels, that photos are scaled down to before processing. */
export const MAX_PHOTO_SIDE = 1280;
/** Tiny photos are scaled up to this longest side so the aura has room to show. */
export const MIN_PHOTO_SIDE = 480;

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif'];

export interface Size {
  width: number;
  height: number;
}

/**
 * Scale a size so its longest side is at most maxSide, and at least minSide for tiny images.
 * Aspect ratio is kept.
 */
export function fitWithin(size: Size, maxSide: number = MAX_PHOTO_SIDE, minSide: number = Math.min(MIN_PHOTO_SIDE, maxSide)): Size {
  const { width, height } = size;
  if (width <= 0 || height <= 0) throw new Error('Image has no pixels');
  const longest = Math.max(width, height);
  const scale = longest > maxSide ? maxSide / longest : longest < minSide ? minSide / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function isHeic(file: Pick<File, 'type' | 'name'>): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export function isAcceptedImage(file: Pick<File, 'type' | 'name'>): boolean {
  if (file.type) return file.type.startsWith('image/');
  return /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name);
}

export interface DrawableSource {
  width: number;
  height: number;
}

/**
 * Draw a decoded image (or video frame) onto a new canvas, scaled to fit MAX_PHOTO_SIDE.
 * `mirror` flips it horizontally, used for selfie camera frames so the photo matches the preview.
 */
export function sourceToCanvas(
  source: CanvasImageSource,
  size: Size,
  options: { maxSide?: number; mirror?: boolean } = {},
): HTMLCanvasElement {
  const target = fitWithin(size, options.maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  ctx.imageSmoothingQuality = 'high';
  if (options.mirror) {
    ctx.translate(target.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, target.width, target.height);
  return canvas;
}

/**
 * Decode an image file into a downscaled canvas. Browsers apply the EXIF orientation
 * themselves when decoding (`imageOrientation: 'from-image'`, the default for <img>),
 * so phone photos come out upright without parsing EXIF here.
 */
export async function fileToCanvas(file: File, maxSide: number = MAX_PHOTO_SIDE): Promise<HTMLCanvasElement> {
  if (!isAcceptedImage(file)) throw new Error('That file is not an image.');
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      try {
        return sourceToCanvas(bitmap, bitmap, { maxSide });
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall through to <img> decoding, which supports more formats on some browsers (e.g. HEIC on Safari).
    }
  }
  const img = await loadImageElement(file).catch((e: unknown) => {
    if (isHeic(file)) throw new Error('This browser cannot open HEIC photos. Try Safari, or export the photo as a JPEG.');
    throw e;
  });
  return sourceToCanvas(img, { width: img.naturalWidth, height: img.naturalHeight }, { maxSide });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This photo could not be opened. Try a JPEG or PNG.'));
    };
    img.src = url;
  });
}
