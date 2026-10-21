import { captureFromCamera, cameraErrorMessage, cameraSupported } from './photo/camera';
import { fileToCanvas } from './photo/image';

export function mountApp(root: HTMLElement): void {
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
    showPhoto(stage, photo, showStart);
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

function showPhoto(stage: HTMLElement, photo: HTMLCanvasElement, onReset: () => void): void {
  stage.innerHTML = `
    <div class="viewer">
      <div class="frame" data-testid="photo"></div>
      <div class="actions">
        <button type="button" class="btn" data-action="reset">New photo</button>
      </div>
    </div>
  `;
  photo.classList.add('photo');
  stage.querySelector('.frame')!.append(photo);
  stage.querySelector('[data-action="reset"]')!.addEventListener('click', onReset);
}
