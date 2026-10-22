import { auraFeel, bedtimeFor, computeEnergy, levelFor, nightKey, STEPS, todoLine, type Level } from './bedtime/energy';
import { store } from './bedtime/store';
import { fileToCanvas } from './photo/image';
import { drawSamplePerson, SAMPLE_CAPTION } from './photo/sample';
import type { Segmenter } from './segment/types';
import { showResult, type ResultView } from './ui/result';

export interface AppOptions {
  /** Defaults to the on-device MediaPipe segmenter, loaded on first use. */
  getSegmenter?: () => Promise<Segmenter>;
  minScanMs?: number;
  /** Press-and-hold time for the palm scan. */
  holdMs?: number;
  random?: () => number;
  now?: () => Date;
}

type Mode = 'palm' | 'photo';

let defaultSegmenter: Promise<Segmenter> | null = null;
function loadDefaultSegmenter(): Promise<Segmenter> {
  defaultSegmenter ??= import('./segment/mediapipe').then((m) => m.createMediaPipeSegmenter());
  // Let a failed load be retried next time instead of caching the failure.
  defaultSegmenter.catch(() => {
    defaultSegmenter = null;
  });
  return defaultSegmenter;
}

const HOLD_MS = 2600;
const RING = 295.3;

/**
 * The bedtime Energy Scanner: kids work through their routine, then scan. The scan is either the
 * palm pad (press and hold) or a photo, where their energy glows off them as an animated aura.
 */
export function mountApp(root: HTMLElement, options: AppOptions = {}): void {
  const getSegmenter = options.getSegmenter ?? loadDefaultSegmenter;
  const random = options.random ?? Math.random;
  let offsetMin = 0;
  const now = () => new Date((options.now?.() ?? new Date()).getTime() + offsetMin * 60e3);
  let done = new Set<string>(store.get<string[]>(nightKey(now()), []));
  let bed = store.get('bed', '20:00');
  let alwaysGrey = store.get('alwaysGrey', true);
  let mode: Mode = store.get<Mode>('mode', 'palm') === 'photo' ? 'photo' : 'palm';
  let view: ResultView | null = null;

  root.innerHTML = `
    <header class="bt-head">
      <h1 class="logo">Energy Scanner</h1>
      <div class="clock"><b data-clock>--:--</b>bedtime <span data-bed></span></div>
    </header>
    <section class="steps-wrap" aria-label="Bedtime steps">
      <div class="steplbl"><span>Bedtime steps</span><span data-count></span></div>
      <div class="steps"></div>
    </section>
    <div class="mode" role="radiogroup" aria-label="Scan with">
      <button type="button" role="radio" data-mode="palm">✋ Palm scan</button>
      <button type="button" role="radio" data-mode="photo">📷 Photo scan</button>
    </div>
    <main class="stage" data-testid="stage"></main>
    <p class="error" role="alert" hidden></p>
    <section class="reading-card" data-testid="energy-reading" hidden aria-live="polite">
      <div class="rc-top">
        <h2 class="rc-name"></h2>
        <div class="batt"><div class="cell"><div class="fill"></div></div><span class="pct"></span></div>
      </div>
      <p class="rc-text"></p>
      <p class="rc-todo"></p>
      <button type="button" class="btn" data-action="again">Scan again</button>
    </section>
    <details class="grownups">
      <summary>Grown-ups</summary>
      <div class="parent">
        <label>Bedtime <input type="time" data-input="bed" /></label>
        <div>Pretend it's a different time (for testing)</div>
        <div class="row"><input type="range" min="-180" max="60" step="5" value="0" data-input="fake" aria-label="Time offset in minutes" /><span data-fake>real time</span></div>
        <label>Always read Grey Energy <input type="checkbox" data-input="always" /></label>
        <div class="row"><button type="button" class="btn small" data-action="clear">Clear tonight's steps</button></div>
        <p>With Always Grey on, every scan comes back Grey. Turn it off and it reads by the clock: the closer to bedtime and the more steps done, the sleepier the color. A little randomness keeps it from feeling canned, but it never says Rainbow once all five steps are done.</p>
        <p>Photo scans run entirely on this device. Photos are never uploaded or saved unless you tap Save.</p>
      </div>
    </details>
    <footer class="foot"><p>Runs entirely in your browser. Photos never leave your device.</p></footer>
    <input type="file" accept="image/*" class="visually-hidden" data-input="upload" tabindex="-1" aria-hidden="true" />
    <input type="file" accept="image/*" capture="environment" class="visually-hidden" data-input="capture" tabindex="-1" aria-hidden="true" />
  `;
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const stage = $('.stage');
  const errorBox = $('.error');
  const card = $('.reading-card');
  const uploadInput = $<HTMLInputElement>('[data-input="upload"]');
  const captureInput = $<HTMLInputElement>('[data-input="capture"]');
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const showError = (message: string | null) => {
    errorBox.hidden = !message;
    errorBox.textContent = message ?? '';
  };

  const tick = () => {
    $('[data-clock]').textContent = fmt(now());
    $('[data-bed]').textContent = fmt(bedtimeFor(now(), bed));
  };

  const renderSteps = () => {
    $('.steps').innerHTML = STEPS.map(
      (s) => `<button type="button" class="step" data-step="${s.id}" aria-pressed="${done.has(s.id)}"><span class="ic" aria-hidden="true">${s.icon}</span>${s.label}</button>`,
    ).join('');
    $('[data-count]').textContent = `${done.size} of ${STEPS.length}`;
  };

  const scanEnergy = (): number =>
    computeEnergy({
      alwaysGrey,
      minutesToBed: (bedtimeFor(now(), bed).getTime() - now().getTime()) / 60e3,
      stepsDone: done.size,
      stepsTotal: STEPS.length,
      random,
    });

  const setEnergyColor = (color: string | null) => {
    if (color) root.style.setProperty('--energy', color);
    else root.style.removeProperty('--energy');
  };

  const showReading = (energy: number, level: Level) => {
    setEnergyColor(level.color);
    card.style.setProperty('--swatch', level.swatch ?? level.color);
    $('.rc-name').textContent = level.name;
    $('.pct').textContent = `${energy}%`;
    $('.fill').style.width = `${energy}%`;
    $('.rc-text').textContent = level.texts[Math.floor(random() * level.texts.length)] ?? level.texts[0]!;
    $('.rc-todo').textContent = todoLine(STEPS.filter((s) => !done.has(s.id)));
    card.hidden = false;
  };

  // ---- Palm scan ----
  const showPalm = () => {
    stage.innerHTML = `
      <div class="pad-zone">
        <button type="button" class="pad" aria-label="Press and hold to scan your energy">
          <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="47" fill="none" stroke="var(--line)" stroke-width="3"/>
            <circle class="prog" cx="50" cy="50" r="47" fill="none" stroke="var(--energy)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/>
          </svg>
          <div class="beam"></div>
          <div class="hand" aria-hidden="true">✋</div>
        </button>
        <p class="hint" data-hint>Put your hand on the scanner and hold</p>
      </div>
    `;
    const pad = $('.pad');
    const prog = root.querySelector<SVGCircleElement>('.prog')!;
    const hint = $('[data-hint]');
    const hold = options.holdMs ?? HOLD_MS;
    let t0 = 0;
    let raf = 0;
    let holding = false;
    const loop = () => {
      const p = Math.min(1, (performance.now() - t0) / hold);
      prog.style.strokeDashoffset = String(RING * (1 - p));
      if (p >= 1) return finish();
      raf = requestAnimationFrame(loop);
    };
    const start = (e?: Event) => {
      e?.preventDefault();
      if (holding) return;
      holding = true;
      t0 = performance.now();
      card.hidden = true;
      setEnergyColor(null);
      pad.classList.remove('done');
      pad.classList.add('scanning');
      hint.textContent = 'Scanning… keep holding';
      loop();
    };
    const stop = () => {
      if (!holding) return;
      holding = false;
      cancelAnimationFrame(raf);
      pad.classList.remove('scanning');
      prog.style.strokeDashoffset = String(RING);
      hint.textContent = 'Too fast! Hold until the circle fills';
    };
    const finish = () => {
      holding = false;
      pad.classList.remove('scanning');
      pad.classList.add('done');
      prog.style.strokeDashoffset = '0';
      try {
        navigator.vibrate?.([40, 40, 80]);
      } catch {
        // No vibration support.
      }
      const energy = scanEnergy();
      const level = levelFor(energy);
      hint.textContent = `${level.name} detected`;
      showReading(energy, level);
    };
    pad.addEventListener('pointerdown', start);
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) pad.addEventListener(ev, stop);
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
    pad.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e);
    });
    pad.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') stop();
    });
  };

  // ---- Photo scan ----
  const showPhotoStart = () => {
    stage.innerHTML = `
      <div class="dropzone" data-testid="dropzone">
        <div class="orb" aria-hidden="true"></div>
        <p class="lead">Take a photo and the scanner shows the energy glowing off you.</p>
        <div class="actions">
          <button type="button" class="btn primary" data-action="camera">Take a photo</button>
          <button type="button" class="btn" data-action="upload">Upload a photo</button>
        </div>
        <p class="hint">or drop a photo anywhere on this page</p>
        <p class="sample">No photo handy? <button type="button" class="btn" data-action="sample">Try the sample</button></p>
      </div>
    `;
  };

  const usePhoto = (photo: HTMLCanvasElement, caption?: string) => {
    showError(null);
    card.hidden = true;
    setEnergyColor(null);
    view?.destroy();
    const energy = scanEnergy();
    const level = levelFor(energy);
    view = showResult(stage, photo, {
      getSegmenter,
      minScanMs: options.minScanMs,
      energy: { ...level.aura, name: level.name, reading: '' },
      ...auraFeel(energy),
      resetLabel: 'New photo',
      caption,
      onReset: showMode,
      onReady: () => showReading(energy, level),
    });
  };

  const useFile = async (file: File | undefined) => {
    if (!file) return;
    if (mode !== 'photo') setMode('photo');
    try {
      usePhoto(await fileToCanvas(file));
    } catch (e) {
      showError(e instanceof Error ? e.message : 'This photo could not be opened.');
    }
  };

  // ---- Mode switching ----
  const showMode = () => {
    view?.destroy();
    view = null;
    card.hidden = true;
    showError(null);
    setEnergyColor(null);
    if (mode === 'palm') showPalm();
    else showPhotoStart();
  };

  const setMode = (next: Mode) => {
    mode = next;
    store.set('mode', mode);
    for (const b of root.querySelectorAll<HTMLElement>('[data-mode]')) b.setAttribute('aria-checked', String(b.dataset.mode === mode));
    showMode();
  };

  // ---- Events ----
  $('.steps').addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-step]')?.dataset.step;
    if (!id) return;
    if (done.has(id)) done.delete(id);
    else done.add(id);
    store.set(nightKey(now()), [...done]);
    renderSteps();
  });

  $('.mode').addEventListener('click', (e) => {
    const m = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]')?.dataset.mode as Mode | undefined;
    if (m && m !== mode) setMode(m);
  });

  stage.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
    // Start loading the scanner while the photo is picked or taken.
    if (action === 'upload' || action === 'camera') getSegmenter().catch(() => undefined);
    if (action === 'sample') usePhoto(drawSamplePerson(), SAMPLE_CAPTION);
    if (action === 'upload') uploadInput.click();
    // The phone's own camera app, not an in-page camera: it handles focus, flash,
    // switching cameras and permissions itself.
    if (action === 'camera') captureInput.click();
  });

  $('[data-action="again"]').addEventListener('click', () => {
    showMode();
    root.querySelector<HTMLElement>(mode === 'palm' ? '.pad' : '[data-action="camera"]')?.focus();
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

  // Grown-ups
  const bedInput = $<HTMLInputElement>('[data-input="bed"]');
  const always = $<HTMLInputElement>('[data-input="always"]');
  bedInput.value = bed;
  always.checked = alwaysGrey;
  bedInput.addEventListener('change', () => {
    bed = bedInput.value || '20:00';
    store.set('bed', bed);
    tick();
  });
  $<HTMLInputElement>('[data-input="fake"]').addEventListener('input', (e) => {
    offsetMin = Number((e.target as HTMLInputElement).value);
    $('[data-fake]').textContent = offsetMin === 0 ? 'real time' : `${offsetMin > 0 ? '+' : ''}${offsetMin} min`;
    tick();
  });
  always.addEventListener('change', () => {
    alwaysGrey = always.checked;
    store.set('alwaysGrey', alwaysGrey);
  });
  $('[data-action="clear"]').addEventListener('click', () => {
    done = new Set();
    store.set(nightKey(now()), []);
    renderSteps();
  });

  renderSteps();
  tick();
  setInterval(tick, 15_000);
  setMode(mode);
}
