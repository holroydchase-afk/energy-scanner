import type { EnergyType } from '../aura/types';

export const VIDEO_SECONDS = 4;
export const VIDEO_FPS = 30;

const VIDEO_TYPES = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

/** First recording format this browser supports (Safari records MP4, Chrome and Firefox WebM). */
export function pickVideoType(isSupported: (type: string) => boolean): string | null {
  return VIDEO_TYPES.find((t) => isSupported(t)) ?? null;
}

export function extensionFor(mimeType: string): string {
  if (mimeType.startsWith('video/mp4')) return 'mp4';
  if (mimeType.startsWith('video/webm')) return 'webm';
  if (mimeType === 'image/jpeg') return 'jpg';
  return 'png';
}

export function exportFileName(energy: EnergyType, mimeType: string): string {
  return `energy-scanner-${energy.id}.${extensionFor(mimeType)}`;
}

export function canRecordVideo(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickVideoType((t) => MediaRecorder.isTypeSupported(t)) !== null
  );
}

/** "Mystic energy", or the name as is when it already says Energy ("Grey Energy"). */
export function captionFor(energy: EnergyType): string {
  return /energy$/i.test(energy.name) ? energy.name : `${energy.name} energy`;
}

/** Draws the aura frame with a small caption, the version people save and share. */
export function drawCaptioned(target: HTMLCanvasElement, source: HTMLCanvasElement, energy: EnergyType): void {
  target.width = source.width;
  target.height = source.height;
  const ctx = target.getContext('2d');
  if (!ctx) return;
  const { width, height } = target;
  ctx.drawImage(source, 0, 0);
  const unit = Math.max(12, Math.round(Math.min(width, height) / 32));
  const band = unit * 4;
  const g = ctx.createLinearGradient(0, height - band, 0, height);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, height - band, width, band);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(unit * 1.3)}px system-ui, sans-serif`;
  ctx.fillText(captionFor(energy), unit, height - unit * 1.1);
  ctx.font = `500 ${Math.round(unit * 0.7)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const brand = 'Energy Scanner';
  ctx.fillText(brand, width - unit - ctx.measureText(brand).width, height - unit * 1.1);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image'))), type, 0.92);
  });
}

export async function exportImage(source: HTMLCanvasElement, energy: EnergyType): Promise<File> {
  const out = document.createElement('canvas');
  drawCaptioned(out, source, energy);
  const blob = await canvasToBlob(out);
  return new File([blob], exportFileName(energy, blob.type), { type: blob.type });
}

/**
 * Records a short captioned loop of the live aura canvas. The caller keeps the aura animating;
 * this copies each frame onto a captioned canvas and records that.
 */
export async function exportVideo(
  source: HTMLCanvasElement,
  energy: () => EnergyType,
  seconds: number = VIDEO_SECONDS,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<File> {
  const type = pickVideoType((t) => MediaRecorder.isTypeSupported(t));
  if (!type) throw new Error('Video recording is not supported in this browser.');
  const out = document.createElement('canvas');
  drawCaptioned(out, source, energy());
  const stream = out.captureStream(VIDEO_FPS);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  const start = performance.now();
  const frame = (now: number) => {
    drawCaptioned(out, source, energy());
    const fraction = Math.min(1, (now - start) / (seconds * 1000));
    onProgress?.(fraction);
    if (fraction < 1) raf = requestAnimationFrame(frame);
    else recorder.stop();
  };
  // Cancelled (New photo, another mode): stop now and hand back no file.
  const cancel = () => {
    if (recorder.state !== 'inactive') recorder.stop();
  };
  signal?.addEventListener('abort', cancel, { once: true });
  recorder.start(250);
  if (signal?.aborted) cancel();
  let raf = requestAnimationFrame(frame);
  try {
    await stopped;
  } finally {
    cancelAnimationFrame(raf);
    signal?.removeEventListener('abort', cancel);
    stream.getTracks().forEach((t) => t.stop());
  }
  if (signal?.aborted) throw new DOMException('Recording cancelled', 'AbortError');
  const blob = new Blob(chunks, { type: type.split(';')[0] });
  return new File([blob], exportFileName(energy(), type), { type: blob.type });
}

export function canShareFiles(file: File, nav: Navigator = navigator): boolean {
  return typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] });
}

/** Opens the native share sheet when it takes files; otherwise downloads the file. */
export async function shareOrDownload(file: File, energy: EnergyType): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title: 'My energy', text: `My energy reads ${energy.name}. Scan yours with Energy Scanner.` });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(file);
  return 'downloaded';
}

export function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
