import { auraFeel, bedtimeFor, computeEnergy, levelFor, nightKey, STEPS, type Level } from './bedtime/energy';
import { store } from './bedtime/store';
import { fileToCanvas } from './photo/image';
import { drawSamplePerson, SAMPLE_CAPTION } from './photo/sample';
import type { Segmenter } from './segment/types';
import { icon } from './ui/icons';
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

export interface AppHandle {
  /** Remove the app's page-wide listeners and clock (used by tests). */
  destroy(): void;
}

const BED_PATTERN = /^\d{2}:\d{2}$/;

type Mode = 'palm' | 'photo';
type Look = 'light' | 'dark' | 'auto';

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

/** "3 h earlier", "1 h 35 min earlier", "45 min later", or "real time". */
function offsetLabel(min: number): string {
  if (min === 0) return 'real time';
  const a = Math.abs(min);
  const h = Math.floor(a / 60);
  const m = a % 60;
  const parts = [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
  return `${parts} ${min < 0 ? 'earlier' : 'later'}`;
}

/**
 * The bedtime Energy Scanner: kids work through their routine, then scan. The scan is either the
 * palm pad (press and hold) or a photo, where their energy glows off them as an animated aura.
 */
export function mountApp(root: HTMLElement, options: AppOptions = {}): AppHandle {
  const getSegmenter = options.getSegmenter ?? loadDefaultSegmenter;
  const random = options.random ?? Math.random;
  let offsetMin = 0;
  const now = () => new Date((options.now?.() ?? new Date()).getTime() + offsetMin * 60e3);
  // Saved values are checked, so a bad one falls back to the default instead of breaking the app.
  const loadSteps = (key: string) => {
    const saved = store.get<unknown>(key, []);
    return new Set(Array.isArray(saved) ? STEPS.map((s) => s.id).filter((id) => saved.includes(id)) : []);
  };
  let night = nightKey(now());
  let done = loadSteps(night);
  const savedBed = store.get<unknown>('bed', '20:00');
  let bed = typeof savedBed === 'string' && BED_PATTERN.test(savedBed) ? savedBed : '20:00';
  // Off for a first visit, so the demo shows the colors; a grown-up who turned it on keeps it.
  let alwaysGrey = store.get('alwaysGrey', false);
  let mode: Mode = store.get<Mode>('mode', 'palm') === 'photo' ? 'photo' : 'palm';
  let view: ResultView | null = null;

  root.innerHTML = `
    <header class="bt-head">
      <h1 class="logo">Energy Scanner</h1>
      <div class="clock"><b><span data-clock>--:--</span> <span class="pretend" data-pretend hidden>pretend</span></b>bedtime <span data-bed></span></div>
    </header>
    <p class="byline">By <a href="https://chaseholroyd.com/">Chase Holroyd</a> · <a href="https://chaseholroyd.com/energy-scanner.html">Case study</a></p>
    <p class="pitch"><span class="tagline">A bedtime routine for kids, with an AI aura that runs on your device.</span> <button type="button" class="btn tinted" data-action="demo">See the aura demo</button></p>
    <main class="main">
    <section class="steps-wrap" aria-label="Bedtime steps">
      <div class="steps"></div>
    </section>
    <div class="mode" role="radiogroup" aria-label="Scan with">
      <button type="button" role="radio" data-mode="palm">${icon('hand', 20)}<span>Palm</span></button>
      <button type="button" role="radio" data-mode="photo">${icon('camera', 20)}<span>Photo</span></button>
    </div>
    <div class="scan-area">
    <div class="stage" data-testid="stage"></div>
    <p class="error" role="alert" hidden></p>
    <section class="reading-card" data-testid="energy-reading" hidden aria-live="polite">
      <div class="rc-top">
        <div class="rc-title"><span class="rc-dot" aria-hidden="true"></span><h2 class="rc-name"></h2></div>
        <div class="batt"><div class="cell"><div class="fill"></div></div><span class="pct"></span></div>
      </div>
      <p class="rc-text"></p>
      <p class="rc-note" hidden>Always Grey is on.</p>
      <div class="rc-actions">
        <button type="button" class="btn tinted" data-action="see-colors" hidden>See every color</button>
        <button type="button" class="btn" data-action="again">Scan again</button>
      </div>
    </section>
    </div>
    </main>
    <details class="grownups">
      <summary>Grown-ups</summary>
      <div class="parent">
        <fieldset class="look" role="radiogroup" aria-labelledby="look-label">
          <legend id="look-label">Look</legend>
          <label><input type="radio" name="look" value="light" data-look /> Light</label>
          <label><input type="radio" name="look" value="dark" data-look /> Dark</label>
          <label><input type="radio" name="look" value="auto" data-look /> Automatic</label>
        </fieldset>
        <label>Bedtime <input type="time" data-input="bed" /></label>
        <label for="fake-time" class="above">Pretend time</label>
        <div class="row"><input type="range" id="fake-time" min="-180" max="60" step="5" value="0" data-input="fake" aria-valuetext="real time" /><span data-fake aria-hidden="true">real time</span></div>
        <div class="row"><button type="button" class="btn" data-action="real-time" hidden>Back to real time</button></div>
        <label class="switch"><span>Always Grey</span> <input type="checkbox" data-input="always" aria-describedby="always-help" /> <span data-onoff>Off</span></label>
        <p class="help" id="always-help">Every scan reads Grey.</p>
        <div class="row"><button type="button" class="btn" data-action="clear">Clear steps</button></div>
      </div>
    </details>
    <footer class="foot">
      <p>Photos never leave your device.</p>
      <p class="credit"><a href="https://github.com/holroydchase-afk/energy-scanner">Code on GitHub</a></p>
    </footer>
    <input type="file" accept="image/*" class="visually-hidden" data-input="upload" tabindex="-1" aria-hidden="true" aria-label="Choose a photo" />
    <input type="file" accept="image/*" capture="environment" class="visually-hidden" data-input="capture" tabindex="-1" aria-hidden="true" aria-label="Take a photo" />
  `;
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const stage = $('.stage');
  const errorBox = $('.error');
  const card = $('.reading-card');
  const uploadInput = $<HTMLInputElement>('[data-input="upload"]');
  const captureInput = $<HTMLInputElement>('[data-input="capture"]');
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  // A mouse or trackpad means a laptop or desktop: no camera to open, and you click rather than touch.
  const finePointer = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  /** Bring the reading into view once it's ready (only the page scrolls, up or down). */
  const revealCard = () => card.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });

  const showError = (message: string | null) => {
    errorBox.hidden = !message;
    errorBox.textContent = message ?? '';
    if (!message) return;
    // Right under the photo buttons, where the person is looking.
    const actions = stage.querySelector('.dropzone .actions');
    if (actions) actions.after(errorBox);
    else stage.after(errorBox);
    errorBox.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion() ? 'auto' : 'smooth' });
  };

  // A page left open overnight starts the new night with no steps ticked.
  const syncNight = () => {
    if (nightKey(now()) === night) return;
    night = nightKey(now());
    done = loadSteps(night);
    renderSteps();
  };

  const tick = () => {
    syncNight();
    $('[data-clock]').textContent = fmt(now());
    $('[data-bed]').textContent = fmt(bedtimeFor(now(), bed));
  };

  const renderSteps = () => {
    // A hollow check circle reads as "tap to tick"; ticked, it fills with a check (TXT-R2).
    $('.steps').innerHTML = STEPS.map(
      (s) =>
        `<button type="button" class="step" data-step="${s.id}" aria-pressed="${done.has(s.id)}">${icon(s.icon, 28)}<span>${s.label}</span><span class="check" aria-hidden="true">${done.has(s.id) ? icon('check', 14, 3) : ''}</span></button>`,
    ).join('');
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

  /** One tinted button per screen: See the aura demo leads unless the screen has its own main action. */
  const syncMain = () => {
    const demo = $('[data-action="demo"]');
    // In photo mode Try the sample is the same action, so the sample has one name (TXT-R8).
    demo.hidden = mode === 'photo';
    const other = mode === 'photo' || (!card.hidden && !$('[data-action="see-colors"]').hidden);
    demo.classList.toggle('tinted', !other);
    demo.classList.toggle('quiet', other);
  };

  const showReading = (energy: number, level: Level) => {
    setEnergyColor(level.color);
    card.style.setProperty('--swatch', level.swatch ?? level.color);
    $('.rc-name').textContent = level.name;
    $('.pct').textContent = `${energy}%`;
    $('.fill').style.width = `${energy}%`;
    $('.rc-text').textContent = level.texts[Math.floor(random() * level.texts.length)] ?? level.texts[0]!;
    $('.rc-note').hidden = !alwaysGrey;
    $('[data-action="see-colors"]').hidden = !alwaysGrey;
    $('[data-action="again"]').textContent = lastPhoto ? 'Scan this photo again' : 'Scan again';
    card.hidden = false;
    syncMain();
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
          <div class="hand" aria-hidden="true">${icon('hand', 96, 1.5)}</div>
        </button>
        <p class="hint visually-hidden" data-hint aria-live="polite">${finePointer() ? 'Click and hold the scanner until the circle fills' : 'Put your hand on the scanner and hold'}</p>
        <button type="button" class="btn" data-action="scan">Scan</button>
      </div>
    `;
    const pad = $('.pad');
    const scanBtn = $('[data-action="scan"]');
    const prog = root.querySelector<SVGCircleElement>('.prog')!;
    const hint = $('[data-hint]');
    const hold = options.holdMs ?? HOLD_MS;
    let t0 = 0;
    let raf = 0;
    let holding = false;
    // Every finger (or the key) on the pad; the scan stops only when the last one lifts.
    const touching = new Set<number | string>();
    const loop = () => {
      const p = Math.min(1, (performance.now() - t0) / hold);
      prog.style.strokeDashoffset = String(RING * (1 - p));
      if (p >= 1) return finish();
      raf = requestAnimationFrame(loop);
    };
    // Scan button: the same fill, without holding (STUDIO-CORE principle 4, no hidden gestures).
    let auto = false;
    const start = (e?: Event, hands = true) => {
      e?.preventDefault();
      if (holding) return;
      holding = true;
      auto = !hands;
      syncMain();
      t0 = performance.now();
      card.hidden = true;
      scanBtn.hidden = false;
      setEnergyColor(null);
      pad.classList.remove('done');
      pad.classList.add('scanning');
      // The ring and beam show the state; the words are for screen readers (TXT-R3).
      hint.classList.add('visually-hidden');
      hint.textContent = 'Scanning';
      loop();
    };
    const stop = () => {
      if (!holding || auto) return;
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
      hint.textContent = 'Done';
      // One "Scan" on screen: the reading's Scan again takes over (DS-R20).
      scanBtn.hidden = true;
      showReading(energy, level);
      revealCard();
    };
    const press = (id: number | string, e?: Event) => {
      touching.add(id);
      if (holding && auto) auto = false; // a hand on the pad during a button scan takes over the hold
      start(e);
    };
    scanBtn.addEventListener('click', () => start(undefined, false));
    const lift = (id: number | string) => {
      // Only a finger (or key) that pressed the pad can end the hold.
      if (!touching.delete(id)) return;
      if (!touching.size) stop();
    };
    const pointerId = (e: Event) => (e as PointerEvent).pointerId ?? 0;
    pad.addEventListener('pointerdown', (e) => press(pointerId(e), e));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) pad.addEventListener(ev, (e) => lift(pointerId(e)));
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
    pad.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) press('key', e);
    });
    pad.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') lift('key');
    });
    pad.addEventListener('blur', () => lift('key'));
    // Called when the stage changes, so a hold in progress can't finish on another screen.
    return () => {
      holding = false;
      touching.clear();
      cancelAnimationFrame(raf);
    };
  };

  // ---- Photo scan ----
  const showPhotoStart = () => {
    const actions = finePointer()
      ? `<button type="button" class="btn tinted" data-action="sample">Try the sample</button>
          <button type="button" class="btn" data-action="upload">Choose a photo</button>`
      : `<button type="button" class="btn tinted" data-action="camera">Take a photo</button>
          <button type="button" class="btn" data-action="upload">Choose a photo</button>`;
    stage.innerHTML = `
      <div class="dropzone" data-testid="dropzone">
        <div class="orb" aria-hidden="true"></div>
        <div class="actions">
          ${actions}
        </div>
        <p class="hint">or drop a photo anywhere on this page</p>
        ${finePointer() ? '' : '<p class="sample">No photo handy? <button type="button" class="btn" data-action="sample">Try the sample</button></p>'}
      </div>
    `;
  };

  /** The photo screen's first button (Take a photo, or Try the sample on a laptop). */
  const focusPhotoStart = () => root.querySelector<HTMLElement>('.dropzone .actions .btn')?.focus();

  let lastPhoto: { photo: HTMLCanvasElement; caption?: string } | null = null;

  const usePhoto = (photo: HTMLCanvasElement, caption?: string) => {
    lastPhoto = { photo, caption };
    showError(null);
    card.hidden = true;
    setEnergyColor(null);
    view?.destroy();
    const energy = scanEnergy();
    const level = levelFor(energy);
    view = showResult(stage, photo, {
      getSegmenter,
      minScanMs: options.minScanMs,
      energy: { ...level.aura, name: level.name },
      ...auraFeel(energy),
      resetLabel: 'New photo',
      caption,
      onReset: () => {
        showMode();
        focusPhotoStart();
      },
      onReady: () => showReading(energy, level),
      onNoPerson: () => {
        const sample = document.createElement('button');
        sample.type = 'button';
        sample.className = 'btn tinted';
        sample.dataset.action = 'sample';
        sample.textContent = 'Try the sample';
        stage.querySelector('.actions')?.prepend(sample);
      },
    });
    // Bring the photo to the top so the scan, and then the reading, are in view. On a wide screen
    // the photo and reading fit beside each other, so keep the scan switch in view too.
    const wide = window.matchMedia?.('(min-width: 900px)').matches ?? false;
    (wide ? $('.mode') : stage).scrollIntoView?.({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  // Bumped whenever the stage changes, so a photo that finishes decoding late is dropped.
  let request = 0;
  const useFile = async (file: File | undefined) => {
    if (!file) return;
    if (mode !== 'photo') setMode('photo');
    const mine = ++request;
    try {
      const photo = await fileToCanvas(file);
      if (mine === request && mode === 'photo') usePhoto(photo);
    } catch (e) {
      if (mine === request && mode === 'photo') showError(e instanceof Error ? e.message : 'This photo could not be opened.');
    }
  };

  // ---- Mode switching ----
  let stopPalm: (() => void) | null = null;
  const showMode = () => {
    request++;
    stopPalm?.();
    stopPalm = null;
    view?.destroy();
    view = null;
    lastPhoto = null;
    card.hidden = true;
    showError(null);
    setEnergyColor(null);
    if (mode === 'palm') stopPalm = showPalm();
    else showPhotoStart();
    syncMain();
  };

  const setMode = (next: Mode) => {
    mode = next;
    store.set('mode', mode);
    for (const b of root.querySelectorAll<HTMLElement>('[data-mode]')) {
      b.setAttribute('aria-checked', String(b.dataset.mode === mode));
      // One tab stop for the group; arrow keys move between the choices.
      b.tabIndex = b.dataset.mode === mode ? 0 : -1;
    }
    showMode();
  };

  // ---- Events ----
  $('.steps').addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-step]')?.dataset.step;
    if (!id) return;
    syncNight();
    if (done.has(id)) done.delete(id);
    else done.add(id);
    store.set(night, [...done]);
    renderSteps();
  });

  $('[data-action="demo"]').addEventListener('click', () => {
    if (mode !== 'photo') setMode('photo');
    usePhoto(drawSamplePerson(), SAMPLE_CAPTION);
  });

  $('.mode').addEventListener('click', (e) => {
    const m = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]')?.dataset.mode as Mode | undefined;
    if (m && m !== mode) setMode(m);
  });
  $('.mode').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    setMode(mode === 'palm' ? 'photo' : 'palm');
    root.querySelector<HTMLElement>(`[data-mode="${mode}"]`)?.focus();
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
    // In photo mode, scan the same photo again (after ticking a step, say).
    if (lastPhoto) {
      usePhoto(lastPhoto.photo, lastPhoto.caption);
      return;
    }
    showMode();
    if (mode === 'palm') root.querySelector<HTMLElement>('.pad')?.focus();
    else focusPhotoStart();
  });

  for (const input of [uploadInput, captureInput]) {
    input.addEventListener('change', () => {
      void useFile(input.files?.[0]);
      input.value = '';
    });
  }

  // Anywhere on the page, not just the app column, so a missed drop doesn't open the file instead.
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    root.classList.add('dragging');
  };
  const onDragLeave = (e: DragEvent) => {
    if (!e.relatedTarget) root.classList.remove('dragging');
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    root.classList.remove('dragging');
    void useFile(e.dataTransfer?.files?.[0]);
  };
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('dragleave', onDragLeave);
  document.addEventListener('drop', onDrop);

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
  // A pretend time is for grown-ups trying the colors; the header says so, and one tap undoes it.
  const fakeRange = $<HTMLInputElement>('[data-input="fake"]');
  const realTimeBtn = $<HTMLButtonElement>('[data-action="real-time"]');
  const setOffset = (min: number) => {
    offsetMin = min;
    fakeRange.value = String(min);
    const shown = offsetLabel(min);
    $('[data-fake]').textContent = shown;
    fakeRange.setAttribute('aria-valuetext', shown);
    $('[data-pretend]').hidden = min === 0;
    realTimeBtn.hidden = min === 0;
    tick();
  };
  fakeRange.addEventListener('input', () => setOffset(Number(fakeRange.value)));
  realTimeBtn.addEventListener('click', () => {
    setOffset(0);
    fakeRange.focus();
  });
  const onOff = () => {
    $('[data-onoff]').textContent = always.checked ? 'On' : 'Off';
  };
  onOff();
  always.addEventListener('change', () => {
    alwaysGrey = always.checked;
    store.set('alwaysGrey', alwaysGrey);
    onOff();
  });
  // Look: Light, Dark, or Automatic (no data-theme, so the CSS follows the phone).
  const savedLook = store.get<unknown>('look', 'auto');
  const setLook = (look: Look) => {
    if (look === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = look;
    for (const r of root.querySelectorAll<HTMLInputElement>('[data-look]')) r.checked = r.value === look;
  };
  setLook(savedLook === 'light' || savedLook === 'dark' ? savedLook : 'auto');
  root.querySelector('.look')!.addEventListener('change', (e) => {
    const look = (e.target as HTMLInputElement).value as Look;
    store.set('look', look);
    setLook(look);
  });
  // One tap from the Always Grey note to a reading in color: same scan, new reading.
  $('[data-action="see-colors"]').addEventListener('click', () => {
    always.checked = false;
    always.dispatchEvent(new Event('change'));
    if (lastPhoto) {
      usePhoto(lastPhoto.photo, lastPhoto.caption);
    } else {
      const energy = scanEnergy();
      const level = levelFor(energy);
      const hint = root.querySelector('[data-hint]');
      if (hint) hint.textContent = 'Done';
      showReading(energy, level);
      revealCard();
      $('[data-action="again"]').focus();
    }
  });
  $('[data-action="clear"]').addEventListener('click', () => {
    syncNight();
    done = new Set();
    store.set(night, []);
    renderSteps();
  });

  renderSteps();
  tick();
  const clock = setInterval(tick, 15_000);
  setMode(mode);

  return {
    destroy() {
      clearInterval(clock);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('dragleave', onDragLeave);
      document.removeEventListener('drop', onDrop);
      stopPalm?.();
      view?.destroy();
    },
  };
}
