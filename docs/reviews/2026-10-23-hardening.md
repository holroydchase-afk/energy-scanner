# Energy Scanner: staff-pm ranking + qa-tdd gap hunt (2026-10-23)

Branch `m2.14-ui-review` (top of the unmerged stack), read-only. ES-R1 to R35 are fixed and not re-reported.

**What I ran**
- `npx vitest run`: 12 files, 93 tests, all green.
- Coverage: skipped (`@vitest/coverage-v8` is not installed).
- Scratch probes that import the real `src/` modules, run outside the repo with their own vitest config.
- `TZ=America/Los_Angeles node` on a copy of the night and bedtime date logic.
- Nothing in the repo was changed. `git status` is clean.

---

## 1. staff-pm: features ranked by who touches them

1. **Bedtime steps → reading (Rainbow→Grey).** This is the parent's nightly loop. If the steps or the reading are wrong, the product is wrong.
2. **Try the sample → photo aura.** The recruiter's money shot: no photo needed, and 90 seconds is all they give it.
3. **Photo scan with your own photo** (camera, upload, drop). The parent's "wow", and the hiring manager's test of "does the on-device ML actually work".
4. **Palm scan (press and hold).** The default mode, the first thing a kid touches, and it runs every night.
5. **Always Grey + See every color.** The parent's lever, and the recruiter's one-tap way out of grey.
6. **Save image / Share / Save video.** The parent keeps or shares the moment. It's secondary for recruiters.
7. **Grown-ups panel** (bedtime, try a different time, clear steps). Set once, rarely touched.
8. **Privacy guarantee** (on-device, CSP, no network). Recruiters read the claim. The e2e already proves the network part.
9. **Resilience** (renderer fallback, context loss, scanner retry). Nobody sees it until it breaks, and then it looks like the app hung.

**Decision for Chase (not a bug):** in photo mode, "Scan again" drops the photo and goes back to Take a photo. The reading says "Still to do: Teeth. Then scan again.", so a kid who ticks Teeth has to take a new photo. Recommendation: in photo mode, Scan again re-scans `lastPhoto` (the same path See every color already uses).

---

## 2. Findings (qa-tdd), ranked

### ES-R36 · P0 · Steps never reset if the page stays open overnight
- **Where:**
  - `src/app.ts:42`: `done` is loaded once at mount.
  - `src/app.ts:118-121`: `tick` runs every 15s but never reloads `done`.
  - `src/app.ts:320` and `:411`: writes go to `nightKey(now())` for the *current* night, with the old set.
- **Scenario:** Tuesday 7pm, the kid ticks all 5 steps. The tab stays open or is restored from memory or bfcache (iPhone Safari and Android Chrome both do this for a nightly app). Wednesday 7pm, the screen still shows 5 of 5 done. The reading caps at Green or lower ("All steps done. Lights out"). Unticking one writes Tuesday's other 4 into Wednesday's key, so the stale state becomes permanent. Moving the "Try a different time" slider across 5am has the same root cause.
- **Evidence (probe, real `app.ts`):** mount at 2026-10-22 19:00 and tick all 5. Set the clock to 2026-10-23 19:00 and untick Bath. The output: `count 4 of 5`, and `localStorage['steps-2026-10-23'] = ["pjs","teeth","potty","book"]`. Expected `0 of 5` with an empty new night.
- **Failing test first:**
  - File: `src/app.test.ts`
  - Name: `ES-R36 starts a fresh night when the page stays open past 5am`
  - Setup: `vi.useFakeTimers()`, a mutable `let t = new Date(2026, 9, 22, 19, 0)`, mount with `now: () => t`, and click all 5 steps. Then `t = new Date(2026, 9, 23, 19, 0)`, `vi.advanceTimersByTime(15_000)`.
  - Assertions: `[data-count]` is `'0 of 5'`, and every `.step` has `aria-pressed="false"`. Then click Bath and expect `JSON.parse(localStorage.getItem('steps-2026-10-23')!)` to equal `['bath']`.
- **Fix hint:** keep `let key = nightKey(now())`. In `tick` (and on the slider input and `pageshow`), when `nightKey(now())` changes, reload `done` from the store and call `renderSteps()`.

### ES-R37 · P1 · The Canvas 2D fallback can't run when WebGL2 setup fails; the scan hangs on "Scanning energy…"
- **Where:**
  - `src/aura/renderer.ts:34-42`: `getContext('webgl2')` is called on `canvas`. If `new WebGLAuraRenderer` throws (shader compile or link, texture, `getError`), the fallback calls `canvas.getContext('2d')` on the **same** canvas.
  - `src/ui/result.ts:281-308`: no try around refine, field and renderer.
- **Scenario:** a phone or GPU whose driver rejects the fragment shader, or returns a GL error during setup. This is the exact case the fallback exists for. Per the HTML spec, `getContext('2d')` returns `null` once a canvas has a `webgl2` context. So `Canvas2DAuraRenderer` throws "Canvas 2D is not available", and `run()` rejects unhandled (`void run()`). By then `frame.classList.remove('scanning')` has already run (line 288), so the photo sits there with "Scanning energy…" forever, with no retry and no error. A WebGL context is also leaked.
- **Evidence:** traced. Spec rule: a canvas's context mode is fixed by the first successful `getContext`. jsdom can't run WebGL, so this was not reproduced live. Confirmed by code and spec, not on a device.
- **Failing tests first:**
  - `src/aura/renderer.test.ts`, `ES-R37 falls back to Canvas 2D when WebGL setup throws`
    - Setup: pass a canvas stub whose `getContext('webgl2')` returns a fake gl with `createProgram: () => null`, and whose `getContext('2d')` returns `null` after webgl2 was taken. Spy `document.createElement('canvas')` to return canvases with a stub 2d context.
    - Assertions: `expect(() => createAuraRenderer(scene, stub)).not.toThrow()`, and `renderer.kind === 'canvas2d'`.
  - `src/ui/result.test.ts`, `ES-R37 shows an error instead of hanging when the aura can't be drawn`
    - Setup: `vi.mock('../aura/renderer')` so `createAuraRenderer` throws, with a segmenter that returns a full mask.
    - Assertions: `status.textContent` does not match `/Scanning energy/`, `status.classList.contains('warn')`, and a "Try again" button exists.
- **Fix hint:** create a fresh canvas for the fallback (return its canvas), and wrap lines 281-308 in try/catch that shows the existing warn state.

### ES-R38 · P1 · A slow photo decode lands in the wrong mode, or out of order
- **Where:** `src/app.ts:281-289`. `useFile` awaits `fileToCanvas` with no check that the request is still current.
- **Scenario 1:** pick or drop a photo (an iPhone camera JPEG takes hundreds of ms to decode), then tap Palm scan. The decode finishes and `usePhoto` renders the photo viewer into the stage while the Palm radio is checked and the pad is gone. Scan again then flips to the palm pad.
- **Scenario 2:** pick photo A (big), then photo B (small). B shows first, then A replaces it.
- **Evidence (probe):** `fileToCanvas` mocked with a deferred promise. Upload, then click Palm scan, then resolve. The output: `palm checked true pad? false photo view? true`.
- **Failing test first:**
  - File: `src/app.test.ts` with `vi.mock('./photo/image', …)` returning a deferred `fileToCanvas`.
  - Name: `ES-R38 a photo that finishes decoding after switching to Palm scan is dropped`
  - Assertions: after resolving, `root.querySelector('.pad')` is not null, and `root.querySelector('[data-testid="photo"]')` is null.
  - Second case: `ES-R38 the last photo picked wins`. Resolve B, then A, and expect the frame's canvas to be B's.
- **Fix hint:** add a `let request = 0` counter. Bump it in `useFile`, `showMode` and `usePhoto`. After the await, return if the counter changed or `mode !== 'photo'`.

### ES-R39 · P2 · Palm scan cancels when any one finger lifts
- **Where:** `src/app.ts:184-203`, `:219-220`. A second `pointerdown` is ignored, and the first `pointerup` or `pointercancel` from *any* pointer calls `stop()`.
- **Scenario:** the hint says "Put your hand on the scanner". A kid's flat palm is several touch points. They land and lift at different moments, and one finger adjusting gives "Too fast! Hold until the circle fills". iOS may also send `pointercancel` for a palm-sized contact (unconfirmed, needs a device).
- **Evidence (probe):** pointerdown id 1, pointerdown id 2, then pointerup id 1. The hint shows `Too fast! Hold until the circle fills`.
- **Failing test first:**
  - File: `src/app.test.ts`
  - Name: `ES-R39 palm scan keeps going while any finger is still on the pad`
  - Assertions: after down 1, down 2, up 1, `[data-hint]` is `'Scanning… keep holding'`. After up 2, it matches `/Too fast/`.
- **Fix hint:** track active pointer ids in a `Set`, and stop only when it is empty. Keep `pointerleave` for mouse only.

### ES-R40 · P2 · A palm hold keeps running after switching to Photo scan, and its reading shows in photo mode
- **Where:**
  - `src/app.ts:157-228`: `raf` and `holding` live in the `showPalm` closure.
  - `src/app.ts:292-301`: `showMode` replaces the stage but never cancels that loop.
- **Scenario:** hold the pad with one finger and tap Photo scan with another. Or hold Space on the pad, Tab away (keyup goes to another element), and switch mode. 2.6s later `finish()` runs: the palm reading card appears under the Take a photo screen, and `--energy` is recolored.
- **Evidence (probe):** holdMs 30, pointerdown, click Photo scan, wait 120ms. The output: `photo mode card hidden? false`.
- **Failing test first:**
  - File: `src/app.test.ts`
  - Name: `ES-R40 switching to Photo scan mid-hold cancels the palm scan`
  - Assertion: `[data-testid="energy-reading"]` stays `hidden === true` after 120ms.
- **Fix hint:** have `showPalm` return a cleanup (`cancelAnimationFrame`, `holding = false`) that `showMode` calls. Also call `stop()` on pad `blur`.

### ES-R41 · P2 · Saved settings aren't validated: a bad value blanks the scan area
- **Where:**
  - `src/app.ts:42-44`, `:416`
  - `src/bedtime/energy.ts:162`
  - `store.get` returns any valid JSON as `T`.
- **Scenario:** any non-string `bed` (`2000`, `null`) makes `bedtimeFor` throw inside `tick()` during mount. Because `renderSteps()` already ran, the user sees the steps but **no palm pad or photo buttons**: `setMode` never runs, and the 15s clock never starts. Other bad values:
  - A non-array steps value (`{}`) throws in `new Set`.
  - A string becomes characters ("6 of 5").
  - `bed = "abc"` shows "Invalid Date" and "NaN%".
- **How it could happen:** the keys are unprefixed (`bed`, `mode`, `alwaysGrey`, `steps-…`) on `chaseholroyd.com`, an origin shared with the portfolio and other demos. Whether another page on that origin uses the same keys is **unconfirmed**: GitHub code search returned nothing indexed.
- **Evidence (probe):**
  - `bed='2000'` → `mount threw TypeError: bed.split is not a function`
  - `bed='null'` → `Cannot read properties of null (reading 'split')`
  - steps `{"a":1}` → `object is not iterable`
  - steps `"bathbook"` → `count from string 6 of 5`
- **What's fine:** `localStorage` throwing on access (Safari private mode, blocked storage) and corrupt JSON are already caught by `store.ts`.
- **Failing test first:**
  - File: `src/app.test.ts`
  - Name: `ES-R41 mounts with defaults when saved settings are corrupt`
  - Setup: `localStorage.setItem('bed','2000')` and `localStorage.setItem(nightKey(now),'{"a":1}')`.
  - Assertions: `expect(() => mount({now})).not.toThrow()`, `.pad` exists, `[data-bed]` is `'8:00 PM'`, and `[data-count]` is `'0 of 5'`.
- **Fix hint:**
  - Validate `bed` with `/^\d{2}:\d{2}$/`.
  - Filter steps to an array of known `STEPS` ids.
  - Prefix the keys `energy-scanner:` and read the old keys once to migrate.

### ES-R42 · P2 · New photo or a mode switch during Save video still downloads a broken video
- **Where:**
  - `src/ui/result.ts:354-361`, `:366-371`: `destroy()` calls `renderer.destroy()`, which runs `loseContext()`, but doesn't stop the recording.
  - `src/export/export.ts:180-216`: no cancel path.
- **Scenario:** tap Save video, then New photo within 4s. The recorder keeps copying a lost-context canvas (cleared or black frames). A 4s video still downloads after the user has moved on, with the leftover frames black.
- **Evidence:** traced. The `exportVideo` loop only ends on time. Whether the frames are black or keep the last image depends on the browser (unconfirmed).
- **Failing test first:**
  - File: `src/ui/result.test.ts`
  - Name: `ES-R42 New photo during Save video stops the recording and downloads nothing`
  - Setup: stub `MediaRecorder` and `HTMLCanvasElement.prototype.captureStream`, spy `URL.createObjectURL`. Click save-video, call `view.destroy()`, flush timers and rAF.
  - Assertion: `createObjectURL` was not called.
- **Fix hint:** pass an `AbortSignal` to `exportVideo`. On abort, call `recorder.stop()` and reject with AbortError, and have `busy` ignore AbortError.

### ES-R43 · P2 · No WebGL context-loss handling (unconfirmed on device; already a "later idea" in HANDOFF)
- **Where:** `src/aura/renderer.ts:45-141`. There is no `webglcontextlost` or `webglcontextrestored` listener.
- **Scenario:** on iOS, backgrounding Safari or memory pressure while the aura shows can lose the context. The aura goes blank, and Save image exports a black frame with the caption.
- **Evidence:** traced only.
- **Failing test first:**
  - File: `src/ui/result.test.ts`
  - Name: `ES-R43 a lost WebGL context offers Scan again instead of a blank aura`
  - Setup: with the mocked renderer, dispatch `new Event('webglcontextlost')` on `renderer.canvas`.
  - Assertions: status matches `/scan again/i`, and the save buttons are hidden.
  - Add a manual device case too.

### ES-R44 · P2 · The Canvas 2D fallback allocates 3 full-size canvases every frame
- **Where:** `src/aura/renderer.ts:223-231` (`layer()` inside `render`, once per color, per frame).
- **Scenario:** on a browser without WebGL2 (old iOS), a 1280x960 photo means about 90 canvas allocations a second (about 4.9 MB each). WebKit caps total canvas memory. Past the cap, `getContext` returns null and `layer` silently draws nothing, so the glow vanishes and frames stutter. The memory-cap effect is unconfirmed on a device.
- **Evidence:** traced.
- **Failing test first:**
  - File: `src/aura/renderer.test.ts`
  - Name: `ES-R44 Canvas 2D aura reuses its layers between frames`
  - Setup: stub `getContext('webgl2')` to return null and `'2d'` to return a recording stub. Spy `document.createElement`, render 10 frames.
  - Assertion: the canvas creation count after the constructor is `0`.

### ES-R45 · P2 · `mountApp` can't be torn down, so the unit tests accumulate live apps
- **Where:** `src/app.ts:359-370` (document `dragover`, `dragleave`, `drop` listeners) and `:417` (`setInterval`, never cleared). `mountApp` returns `void`.
- **Scenario:** production mounts once, so users aren't hit. In `app.test.ts`, every test mounts a new app and none is removed. The "drop anywhere" test runs `useFile` in **all** previously mounted apps, and about 20 intervals keep ticking on detached roots. That is a flakiness source and hides cross-app bugs. It also blocks testing ES-R36 cleanly with fake timers.
- **Evidence:** traced. `beforeEach` only clears `document.body.innerHTML`.
- **Failing test first:**
  - File: `src/app.test.ts`
  - Name: `ES-R45 unmount removes page-wide listeners and the clock`
  - Setup: `vi.useFakeTimers()`, `const app = mountApp(root)`, `app.destroy()`.
  - Assertions: `vi.getTimerCount()` is `0`. A dispatched `drop` leaves `root.querySelector('.error').hidden === true`.

---

## Checked and fine (no finding)
- **store.ts:** `localStorage` throwing on get or set (including the SecurityError when the global is accessed) and corrupt JSON both fall back to defaults.
- **Bedtime input cleared:** falls back to `'20:00'` (`app.ts:378`).
- **DST** (America/Los_Angeles, Mar 8 and Nov 1 2026): `nightKey` and `bedtimeFor` are correct around 1:30, 3:30, 4:59 and 5:00. `nightOf` pins to noon.
- **0-byte file:** the "could not be opened" message. **HEIC on Chrome:** the HEIC message. **Two files dropped:** the first is used. **Extreme aspect** (1280x1, 1x1280) and **1x1:** no crash, and the field keeps at least 1 cell.
- **Degenerate masks** (all 0, all 1, NaN, 1x1) through refine → keepMainPerson → field: no throw and no NaN in the SDF. NaN is treated as background (probe `b.probe.ts`).
- **Late scan result after New photo or a mode switch:** `destroyed` is checked after every await in `run()`.
- **Segmenter load failure:** the cache is cleared on rejection, and Try again re-runs it. Whether a failed dynamic-import chunk is retried by the browser is unconfirmed, and was not logged.
- **Palm keyboard auto-repeat:** guarded by `!e.repeat`. **Save video tapped twice:** the button is disabled. **Share cancel:** AbortError returns `'cancelled'` with no error.
- **CSP:** `connect-src 'self' blob: data:`, `form-action 'none'`, `object-src 'none'`. No analytics or third-party origins in `src/`.

## Couldn't test here
- **Not run here:** e2e and Playwright (not allowed in this read-only pass), real WebGL (jsdom), and coverage (package not installed).
- **Device-only (ES-R37, R39, R43, R44):** real GPU shader failures, the iOS palm pointercancel, context loss and canvas memory caps. Each needs Chase's iPhone or an old-iOS device.
