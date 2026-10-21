import { sourceToCanvas } from './image';

export function cameraSupported(nav: Navigator = navigator): boolean {
  return Boolean(nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function');
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow the camera in your browser settings, or upload a photo instead.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found. Upload a photo instead.';
    case 'NotReadableError':
      return 'The camera is busy in another app. Close it and try again, or upload a photo.';
    default:
      return 'The camera could not start. Upload a photo instead.';
  }
}

/**
 * Full-screen camera view. Resolves with a captured frame (mirrored for the front camera,
 * to match the preview), or null if the person cancels.
 */
export async function captureFromCamera(): Promise<HTMLCanvasElement | null> {
  let facingMode: 'user' | 'environment' = 'user';
  let stream = await openStream(facingMode);

  const overlay = document.createElement('div');
  overlay.className = 'camera';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Camera');
  overlay.innerHTML = `
    <video class="camera-video" playsinline muted autoplay></video>
    <div class="camera-bar">
      <button type="button" class="btn ghost" data-action="cancel">Cancel</button>
      <button type="button" class="shutter" data-action="shoot" aria-label="Take photo"></button>
      <button type="button" class="btn ghost" data-action="flip">Flip</button>
    </div>
  `;
  document.body.append(overlay);
  const video = overlay.querySelector('video') as HTMLVideoElement;

  const attach = async () => {
    video.srcObject = stream;
    video.classList.toggle('mirrored', facingMode === 'user');
    await video.play().catch(() => undefined);
  };
  await attach();

  return new Promise((resolve) => {
    const finish = (result: HTMLCanvasElement | null) => {
      stream.getTracks().forEach((t) => t.stop());
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(null);
    };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', async (e) => {
      const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'cancel') finish(null);
      if (action === 'shoot' && video.videoWidth > 0) {
        const frame = sourceToCanvas(video, { width: video.videoWidth, height: video.videoHeight }, { mirror: facingMode === 'user' });
        finish(frame);
      }
      if (action === 'flip') {
        stream.getTracks().forEach((t) => t.stop());
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        try {
          stream = await openStream(facingMode);
        } catch {
          facingMode = facingMode === 'user' ? 'environment' : 'user';
          stream = await openStream(facingMode);
        }
        await attach();
      }
    });
    (overlay.querySelector('[data-action="shoot"]') as HTMLButtonElement).focus();
  });
}

function openStream(facingMode: 'user' | 'environment'): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
    audio: false,
  });
}
