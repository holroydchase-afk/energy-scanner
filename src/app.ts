import { captureFromCamera, cameraErrorMessage, cameraSupported } from './photo/camera';
import { fileToCanvas } from './photo/image';
import type { Segmenter } from './segment/types';
import { showResult, type ResultView } from './ui/result';

export interface AppOptions {
  /** Defaults to the on-device MediaPipe segmenter, loaded on first use. */
  getSegmenter?: () => Promise<Segmenter>;
  minScanMs?: number;
}

let defaultSegmenter: Promise<Segmenter> | null = null;
function loadDefaultSegmenter(): Promise<Segmenter> {
  defaultSegmenter ??= import('./segment/mediapipe').then((m) => m.createMediaPipeSegmenter());
  // Let a failed load be retried next time instead of caching the failure.
  defaultSegmenter.catch(() => {
    defaultSegmenter = null;
  });
  return defaultSegmenter;
}

export function mountApp(root: HTMLElement, options: AppOptions = {}): void {
  const getSegmenter = options.getSegmenter ?? loadDefaultSegmenter;
  let view: ResultView | null = null;
  root.innerHTML = `
    <header class="top">
      <h1 class="logo">Energy Scanner</h1>
      <p class="tag">See the energy coming off anyone in a photo.</p>
    </header>
    <main class="stage" data-testid="stage"></main>
    <p class="error" role="alert" hidden></p>
    <footer class="foot">
      <p>Runs entirely in your browser. Photos never leave your device.</p>
    </footer>
    <input type="file" accept="image/*" class="visually-hidden" data-input="upload" tabindex="-1" aria-hidden="true" />
    <input type="file" accept="image/*" capture="user" class="visually-hidden" data-input="capture" tabindex="-1" aria-hidden="true" />
  `;
  const stage = root.querySelector<HTMLElement>('.stage')!;
  const errorBox = root.querySelector<HTMLElement>('.error')!;
  const uploadInput = root.querySelector<HTMLInputElement>('[data-input="upload"]')!;
  const captureInput = root.querySelector<HTMLInputElement>('[data-input="capture"]')!;

  const showError = (message: string | null) => {
    errorBox.hidden = !message;
    errorBox.textContent = message ?? '';
  };

  const usePhoto = (photo: HTMLCanvasElement) => {
    showError(null);
    view?.destroy();
    view = showResult(stage, photo, { getSegmenter, onReset: showStart, minScanMs: options.minScanMs });
  };

  const useFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      usePhoto(await fileToCanvas(file));
    } catch (e) {
      showError(e instanceof Error ? e.message : 'This photo could not be opened.');
    }
  };

  const showStart = () => {
    view?.destroy();
    view = null;
    stage.innerHTML = `
      <div class="dropzone" data-testid="dropzone">
        <div class="orb" aria-hidden="true"></div>
        <p class="lead">Take a photo of someone, or upload one, to scan their energy.</p>
        <div class="actions">
          <button type="button" class="btn primary" data-action="camera">Take a photo</button>
          <button type="button" class="btn" data-action="upload">Upload a photo</button>
        </div>
        <p class="hint">or drop a photo anywhere on this page</p>
      </div>
    `;
  };

  stage.addEventListener('click', async (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    // Start loading the scanner while the person picks or takes a photo.
    if (action === 'upload' || action === 'camera') getSegmenter().catch(() => undefined);
    if (action === 'upload') uploadInput.click();
    if (action === 'camera') {
      if (!cameraSupported()) {
        captureInput.click();
        return;
      }
      try {
        const photo = await captureFromCamera();
        if (photo) usePhoto(photo);
      } catch (err) {
        showError(cameraErrorMessage(err));
      }
    }
  });

  for (const input of [uploadInput, captureInput]) {
    input.addEventListener('change', () => {
      void useFile(input.files?.[0]);
      input.value = '';
    });
  }

  root.addEventListener('dragover', (e) => {
    e.preventDefault();
    root.classList.add('dragging');
  });
  root.addEventListener('dragleave', (e) => {
    if (e.target === root || !root.contains(e.relatedTarget as Node)) root.classList.remove('dragging');
  });
  root.addEventListener('drop', (e) => {
    e.preventDefault();
    root.classList.remove('dragging');
    void useFile(e.dataTransfer?.files?.[0]);
  });

  showStart();
}
