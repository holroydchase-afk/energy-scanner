import { buildAuraField } from '../aura/field';
import { createAuraRenderer, type AuraRenderer } from '../aura/renderer';
import type { EnergyType } from '../aura/types';
import type { PersonMask, Segmenter } from '../segment/types';
import { keepMainPerson } from '../segment/main-person';
import { luminance, refineMask } from '../segment/refine';
import { canRecordVideo, download, exportImage, exportVideo, shareOrDownload } from '../export/export';

export interface ResultOptions {
  getSegmenter: () => Promise<Segmenter>;
  onReset: () => void;
  /** Shortest time the scan animation shows, so the reveal lands. */
  minScanMs?: number;
  /** The aura palette, from tonight's reading. */
  energy: EnergyType;
  intensity?: number;
  /** Animation speed multiplier; sleepy energy moves slower. */
  speed?: number;
  resetLabel?: string;
  /** Called once the aura is showing. */
  onReady?: () => void;
  /** Called when the photo has nobody in it. */
  onNoPerson?: () => void;
  /** A line under the photo, e.g. to label an illustrated sample. */
  caption?: string;
}

export interface ResultView {
  destroy(): void;
  /** The live renderer once the scan is done (for export). */
  renderer(): AuraRenderer | null;
  energy(): EnergyType | null;
}

const DEFAULT_INTENSITY = 0.7;

export function showResult(stage: HTMLElement, photo: HTMLCanvasElement, options: ResultOptions): ResultView {
  stage.innerHTML = `
    <div class="viewer">
      <div class="frame scanning" data-testid="photo">
        <div class="scan" aria-hidden="true"><div class="scanline"></div></div>
      </div>
      <p class="caption" hidden></p>
      <p class="status" role="status" aria-live="polite">Scanning energy…</p>
      <div class="actions" data-slot="actions">
        <button type="button" class="btn primary" data-action="share" hidden>Share</button>
        <button type="button" class="btn" data-action="save-image" hidden>Save image</button>
        <button type="button" class="btn" data-action="save-video" hidden>Save video</button>
        <button type="button" class="btn" data-action="reset">${options.resetLabel ?? 'New photo'}</button>
      </div>
    </div>
  `;
  const frame = stage.querySelector<HTMLElement>('.frame')!;
  const status = stage.querySelector<HTMLElement>('.status')!;
  const caption = stage.querySelector<HTMLElement>('.caption')!;
  caption.hidden = !options.caption;
  caption.textContent = options.caption ?? '';
  photo.classList.add('photo');
  frame.prepend(photo);
  stage.querySelector('[data-action="reset"]')!.addEventListener('click', options.onReset);

  let destroyed = false;
  let raf = 0;
  let renderer: AuraRenderer | null = null;
  let energy: EnergyType | null = null;

  const run = async () => {
    const started = performance.now();
    let mask: PersonMask;
    try {
      const segmenter = await options.getSegmenter();
      mask = await segmenter.segment(photo);
    } catch (e) {
      console.error(e);
      if (destroyed) return;
      frame.classList.remove('scanning');
      status.textContent = 'The energy scanner could not start. Check your connection and try again, or try another browser. ';
      status.classList.add('warn');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn';
      retry.textContent = 'Try again';
      retry.addEventListener('click', () => {
        status.textContent = 'Scanning energy…';
        status.classList.remove('warn');
        frame.classList.add('scanning');
        void run();
      });
      status.append(retry);
      return;
    }
    const wait = (options.minScanMs ?? 1200) - (performance.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (destroyed) return;

    const ctx = photo.getContext('2d');
    const pixels = ctx ? ctx.getImageData(0, 0, photo.width, photo.height).data : null;
    // Snap the outline to edges in the photo; some phones return blocky, misaligned masks.
    if (pixels) mask = refineMask(mask, luminance(pixels), photo.width, photo.height);
    // Only the main person (and anyone about as big) glows; drop stray shapes like a fan.
    mask = keepMainPerson(mask);
    const field = buildAuraField(mask, photo.width / photo.height);
    frame.classList.remove('scanning');
    if (!field.box) {
      frame.classList.add('noperson');
      status.textContent = 'No person found in this photo. Try one where someone is clearly visible.';
      status.classList.add('warn');
      options.onNoPerson?.();
      return;
    }

    try {
      renderer = createAuraRenderer({ photo, mask, field });
    } catch (e) {
      console.error(e);
      status.textContent = "This browser couldn't draw the aura. Try another browser, like Safari or Chrome.";
      status.classList.add('warn');
      return;
    }
    // The phone can drop the GPU picture (e.g. while the app is in the background).
    renderer.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      for (const a of ['share', 'save-image', 'save-video']) button(a).hidden = true;
      status.textContent = 'The aura stopped drawing while the phone was busy. Tap New photo to scan again.';
      status.classList.add('warn');
    });
    renderer.canvas.classList.add('photo', 'aura');
    renderer.canvas.setAttribute('role', 'img');
    renderer.canvas.dataset.renderer = renderer.kind;
    photo.replaceWith(renderer.canvas);

    energy = options.energy;
    renderer.setEnergy(energy);
    renderer.setIntensity(options.intensity ?? DEFAULT_INTENSITY);
    renderer.canvas.setAttribute('aria-label', `Photo with a glowing ${energy.name} aura around the person`);
    status.textContent = '';
    showExportButtons();
    options.onReady?.();

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const speed = (options.speed ?? 1) * (reduceMotion ? 0.25 : 1);
    const t0 = performance.now();
    const tick = (now: number) => {
      if (destroyed || !renderer) return;
      renderer.render(((now - t0) / 1000) * speed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  const button = (action: string) => stage.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
  const showExportButtons = () => {
    button('save-image').hidden = false;
    button('save-video').hidden = !canRecordVideo();
    // The share sheet is a phone thing; desktops get the save buttons.
    button('share').hidden = typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function';
    // One main button: Share where there's a share sheet, otherwise Save image.
    button('save-image').classList.toggle('primary', button('share').hidden);
  };
  // Cancels a recording in progress when this view goes away (New photo, another mode).
  const saving = new AbortController();
  const busy = async (action: string, label: string, work: () => Promise<void>) => {
    const b = button(action);
    const original = b.textContent;
    b.disabled = true;
    b.textContent = label;
    try {
      await work();
    } catch (e) {
      if (saving.signal.aborted) return;
      console.error(e);
      status.textContent = 'Saving did not work in this browser. Try a screenshot instead.';
      status.classList.add('warn');
    } finally {
      b.disabled = false;
      b.textContent = original;
    }
  };
  stage.querySelector('[data-slot="actions"]')!.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (!renderer || !energy) return;
    const canvas = renderer.canvas;
    const current = energy;
    if (action === 'save-image') void busy('save-image', 'Saving…', async () => download(await exportImage(canvas, current)));
    if (action === 'share')
      void busy('share', 'Opening…', async () => {
        await shareOrDownload(await exportImage(canvas, current), current);
      });
    if (action === 'save-video')
      void busy('save-video', 'Recording…', async () => {
        const b = button('save-video');
        const file = await exportVideo(canvas, () => energy ?? current, undefined, (f) => {
          b.textContent = `Recording… ${Math.round(f * 100)}%`;
        }, saving.signal);
        download(file);
      });
  });

  void run();

  return {
    destroy() {
      destroyed = true;
      saving.abort();
      cancelAnimationFrame(raf);
      renderer?.destroy();
    },
    renderer: () => renderer,
    energy: () => energy,
  };
}

