import { buildAuraField } from '../aura/field';
import { averagePersonColor, ENERGY_TYPES, energyTypeById, pickEnergyType, type EnergyType } from '../aura/presets';
import { createAuraRenderer, type AuraRenderer } from '../aura/renderer';
import type { PersonMask, Segmenter } from '../segment/types';

export interface ResultOptions {
  getSegmenter: () => Promise<Segmenter>;
  onReset: () => void;
  /** Shortest time the scan animation shows, so the reveal lands. */
  minScanMs?: number;
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
      <p class="status" role="status" aria-live="polite">Scanning energy…</p>
      <div class="panel" hidden>
        <div class="reading" data-testid="reading">
          <span class="label">Energy type</span>
          <h2 class="energy-name"></h2>
          <p class="energy-reading"></p>
        </div>
        <div class="chips" role="radiogroup" aria-label="Energy type">
          ${ENERGY_TYPES.map(
            (t) =>
              `<button type="button" role="radio" class="chip" data-energy="${t.id}" aria-checked="false" style="--c1: ${css(t.colors[1])}; --c2: ${css(t.colors[2])}">${t.name}</button>`,
          ).join('')}
        </div>
        <label class="slider">
          <span>Intensity</span>
          <input type="range" min="0" max="100" value="${DEFAULT_INTENSITY * 100}" data-input="intensity" />
        </label>
      </div>
      <div class="actions" data-slot="actions">
        <button type="button" class="btn" data-action="reset">New photo</button>
      </div>
    </div>
  `;
  const frame = stage.querySelector<HTMLElement>('.frame')!;
  const status = stage.querySelector<HTMLElement>('.status')!;
  const panel = stage.querySelector<HTMLElement>('.panel')!;
  photo.classList.add('photo');
  frame.prepend(photo);
  stage.querySelector('[data-action="reset"]')!.addEventListener('click', options.onReset);

  let destroyed = false;
  let raf = 0;
  let renderer: AuraRenderer | null = null;
  let energy: EnergyType | null = null;

  const setEnergy = (type: EnergyType) => {
    energy = type;
    renderer?.setEnergy(type);
    stage.querySelector('.energy-name')!.textContent = type.name;
    stage.querySelector('.energy-reading')!.textContent = type.reading;
    for (const chip of stage.querySelectorAll<HTMLElement>('.chip')) {
      chip.setAttribute('aria-checked', String(chip.dataset.energy === type.id));
    }
  };

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
      status.textContent = 'The energy scanner could not start on this device. Try another browser.';
      status.classList.add('warn');
      return;
    }
    const wait = (options.minScanMs ?? 1200) - (performance.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (destroyed) return;

    const field = buildAuraField(mask, photo.width / photo.height);
    frame.classList.remove('scanning');
    if (!field.box) {
      status.textContent = 'No person found in this photo. Try one where someone is clearly visible.';
      status.classList.add('warn');
      return;
    }

    renderer = createAuraRenderer({ photo, mask, field });
    renderer.canvas.classList.add('photo', 'aura');
    renderer.canvas.setAttribute('role', 'img');
    renderer.canvas.dataset.renderer = renderer.kind;
    photo.replaceWith(renderer.canvas);

    const ctx = photo.getContext('2d');
    const pixels = ctx ? ctx.getImageData(0, 0, photo.width, photo.height).data : new Uint8ClampedArray(4);
    const personAt = (u: number, v: number) =>
      mask.data[Math.min(mask.height - 1, Math.floor(v * mask.height)) * mask.width + Math.min(mask.width - 1, Math.floor(u * mask.width))] ?? 0;
    const picked = pickEnergyType(averagePersonColor(pixels, photo.width, photo.height, personAt));
    setEnergy(picked);
    renderer.setIntensity(DEFAULT_INTENSITY);
    renderer.canvas.setAttribute('aria-label', `Photo with a glowing ${picked.name} energy aura around the person`);
    status.textContent = '';
    panel.hidden = false;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const speed = reduceMotion ? 0.25 : 1;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (destroyed || !renderer) return;
      renderer.render(((now - t0) / 1000) * speed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  stage.querySelector('.chips')!.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-energy]')?.dataset.energy;
    if (id) {
      setEnergy(energyTypeById(id));
      renderer?.canvas.setAttribute('aria-label', `Photo with a glowing ${energyTypeById(id).name} energy aura around the person`);
    }
  });
  stage.querySelector<HTMLInputElement>('[data-input="intensity"]')!.addEventListener('input', (e) => {
    renderer?.setIntensity(Number((e.target as HTMLInputElement).value) / 100);
  });

  void run();

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      renderer?.destroy();
    },
    renderer: () => renderer,
    energy: () => energy,
  };
}

function css(rgb: readonly number[]): string {
  return `rgb(${rgb.map((v) => Math.round(v * 255)).join(' ')})`;
}
