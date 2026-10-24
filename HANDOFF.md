# Handoff

## Planning IDs (Oct 21, 2026)
The repo now uses the studio planning IDs (milestone `M1`, task `M1.1`, step `M1.1.1`; product code `ES` across products). Old labels stay in git history and branch names. New work uses the new IDs, starting at M2.

| Old | New | What | PR |
|---|---|---|---|
| M1 | ES-M1.1 | Scaffold | #1 |
| M2 | ES-M1.2 | Photo in | #2 |
| M3 | ES-M1.3 | Aura render | #3 |
| M4 | ES-M1.4 | Save and share | #4 |
| M5 | ES-M1.5 | Portfolio pack | #5 |
| M6 / Hardening | ES-M1.6 | Harden | #6 |
| (milestone) | ES-M1 | Demoable v1 | |

## Portfolio / public presence
_Updated 2026-10-22._
- **Recruiter-ready sprint v2 (Oct 22):** first screen now says what it is, the footer links back to chaseholroyd.com/energy-scanner.html and GitHub, Try the sample shows the aura without a photo, README screenshots and CASE-STUDY.md match the app, and shared links get a preview image. Merged as PR #16 and live since Oct 23.
- **Live app:** https://chaseholroyd.com/energy-scanner/. Pages is on; the first deploy from the default branch succeeded Oct 21 23:32 UTC (Actions run "pages" #1), so ES-M2.2 is done.
- **Portfolio page:** https://chaseholroyd.com/energy-scanner.html (source: `tools/build.py` in `holroydchase-afk.github.io`). ES-M2.3 (portfolio PR #8, merged Oct 21): its "Try it" button opens the live app at /energy-scanner/, and the copy covers the palm scan and the on-device photo aura. The old /demo/energy-scanner/ snapshot stays one release, unlinked, then is removed.
- **Who does what:** the portfolio thread changes the portfolio repo; this project sends it an intake for anything the page should say, and logs the result here.
- **Demo data:** no photos stored or uploaded; everything runs in the visitor's browser.
- **Studio-wide status** (portfolio, domain, every demo, what's waiting on Chase): https://github.com/holroydchase-afk/pm-tools/blob/main/STUDIO-STATUS.md

## Done
- 2026-10-24 night shift, UI polish (branch `m2.21-ui-polish`, stacked on `m2.20-photo-polish`), failing tests first:
  - R53: with Always Grey on, See every color is the main button beside Scan again; the note says it's a grown-up setting.
  - R55: "By Chase Holroyd · Case study" under the title; the footer link reads "Read the case study".
  - R56: steps look tappable (less grey) and the label says "Tap each step when done".
  - R57: no repeated privacy line above the footer; the grown-up rules are two short sentences.
  - R58: the clock is smaller and plain so the title leads.
  - R60: the palm hint says "Scan complete" instead of repeating the card title.
- 2026-10-24 night shift, photo screen polish (branch `m2.20-photo-polish`, stacked on `m2.19-recruiter-first`), failing tests first:
  - R49: on a laptop (mouse or trackpad) the photo screen leads with Try the sample and drops Take a photo, which only opened the same file picker there. Phones are unchanged.
  - R51: on phones the photo is capped at 58% of the screen so the caption and buttons fit under it (confirm on an iPhone).
  - R52: one main button on the result (Save image when there's no share sheet); the card says "Scan this photo again" in photo mode.
  - R54: on wide screens the scan keeps the switch in view instead of scrolling the header away; the reading card sits at the top of a 400px column.
  - R59: a photo with nobody in it is dimmed and Try the sample is the main button.
- 2026-10-24 night shift, recruiter-first (branch `m2.19-recruiter-first`, stacked on #29): staff-pm and ux-reviewer round 6 in `docs/reviews/2026-10-24-recruiter-ui.md` (ES-R47 to R61, no P0). Fixed here, failing tests first:
  - R61: Always Grey is off for a first visit, so the demo reads in color; anyone who turned it on keeps it (decision below).
  - R48: the first screen pitches the on-device AI aura ("Nothing is uploaded") with a See the aura demo button that scans the illustrated sample.
  - R47: on wide screens the palm reading is centred under the pad again (regression from R46).
  - R50: the to-do line is a quiet "Steps left tonight: …", moon yellow only when all steps are done.
- 2026-10-23 Power Hour 2: stack #25 to #28 collapsed into PR #16; Chase merged #16 ("ok 1") and the Pages deploy succeeded at 20:03 UTC (Actions "pages" #4). Live since then: recruiter-ready sprint, round 4 UI fixes, night-shift hardening (ES-R1 to R46). The live site was not checked from the sandbox (chaseholroyd.com is blocked here).
- 2026-10-23 night shift, ux-reviewer round 5 (`docs/reviews/2026-10-23-ux-round5.md`, branch `m2.17-palm-layout`): all 15 round-4 fixes verified (R21 to R23 and R28 still need Chase's iPhone). One new P2, ES-R46, fixed: on screens 900px and wider the two-column layout now applies only to the photo result, so the palm pad no longer jumps sideways under a hand when the reading appears (e2e test). Nothing left at P2 or above, so the review loop stops here.
- 2026-10-23 night shift, rendering hardening (branch `m2.16-harden-render`, stacked on `m2.15-harden-app`), from `docs/reviews/2026-10-23-hardening.md`:
  - R37 (P1): when WebGL2 setup fails, the Canvas 2D fallback now gets its own canvas (a canvas that gave out a WebGL context can't give a 2D one), and a drawing failure shows a message instead of hanging on "Scanning energy…".
  - R42: New photo or a mode switch during Save video cancels the recording; nothing downloads.
  - R43: a lost WebGL context hides the save buttons and says to tap New photo, instead of a blank aura (needs a real phone to confirm).
  - R44: the Canvas 2D fallback builds its tinted layers once per energy, not three new canvases every frame.
- 2026-10-23 night shift, hardening (branch `m2.15-harden-app`, stacked on `m2.14-ui-review`): staff-pm ranked the features people touch; qa-tdd found 10 gaps, ES-R36 to R45, in `docs/reviews/2026-10-23-hardening.md`. Fixed here, each with a failing test first:
  - R36 (P0): a page left open overnight now starts the new night with no steps ticked (it kept last night's ticks and saved them into tonight).
  - R38: a photo that finishes decoding after switching to Palm scan, or after a newer photo, is dropped.
  - R39: the palm scan keeps going while any finger is on the pad; R40: switching mode mid-hold cancels it.
  - R41: corrupt saved settings (bedtime, steps, mode) fall back to defaults instead of breaking the app.
  - R45: `mountApp` returns `destroy()`; unit tests tear their apps down.
  - Scan again in photo mode re-scans the same photo (decision below).
- 2026-10-23, round 4 UI review + ES-R21 to R35 (branch `m2.14-ui-review`, stacked on PR #16): Chase asked for a full UI review (screens and code) with his iPhone shots of real photos. Review in `docs/reviews/2026-10-23-ui-review.md`: 15 findings (1 P0, 5 P1, 9 P2), all fixed:
  - Real photos: the mask is snapped to edges in the photo (`src/segment/refine.ts`, fast guided filter), Safari uses MediaPipe's CPU path, the edge band is tighter and the glow starts just inside the outline (R21). The glow is sized to the person and toned down; Grey is moonlit blue-grey (R22). Small stray shapes (a fan, a sliver of someone) are dropped (`src/segment/main-person.ts`, R23).
  - Bedtime logic: tonight's steps are keyed on the local date, not UTC (they reset at 10pm Pacific before, R31); after midnight it's still last night's bedtime until 5am, so a 3am scan reads sleepy (R30).
  - Screens: "See every color" button in the Always Grey note (R24); the not-an-image error shows under the photo buttons (R25); reading card beside the photo at 900px+ (R26); no empty status gap (R27); safe-area insets, `viewport-fit=cover`, dvh/svh (R28); primary button gradient `#7c3aed → #be185d` passes AA (R29); drop works anywhere on the page (R32).
  - Code: removed the v1 energy-type chips, intensity slider, horoscope copy and unused CSS; `src/aura/presets.ts` is now `src/aura/types.ts` (R33). Accessibility: focus after New photo, live palm hint, emoji hidden from screen readers, labeled time range, `<main>` covers the scan (R34). Reduced motion respected for scrolling; page gradient is a fixed layer (R35).
  - README screenshots and `public/og.png` regenerated; the screenshot script now shifts the page clock to noon instead of moving bedtime.
- 2026-10-22 overnight, round 3 + ES-R19, R20 (branch `m2.13-a11y`): accessibility pass (320px reflow, contrast, tab order, focus, reduced motion); the Palm/Photo switch now works with arrow keys as one tab stop, and its labels stay on one line at 320px.
- 2026-10-22, round 2 re-review + ES-R17, R18 (branch `m2.12-fit`): picking a photo or the sample scrolls it into view; "No person found" offers Try the sample.
- 2026-10-22, ES-R9 (branch `m2.11-ci`): `.github/workflows/ci.yml` runs check, build and the Playwright e2e on every pull request.
- 2026-10-22, ES-R2, R3, R16 (branch `m2.10-story`): README screenshots regenerated from the current app with the illustrated sample (`npm run screenshots`, no photo needed); CASE-STUDY.md rewritten around the bedtime story (draft in Chase's voice); Open Graph tags plus a 1200x630 `public/og.png` preview.
- 2026-10-22, ES-R6, R10, R14, R15 (branch `m2.9-copy`): reading card notes when Always Grey is on; "Still to do: …" replaces "To drain the battery: …"; the not-an-image error says what to choose; Grey texts no longer repeat the heading.
- 2026-10-22, ES-R4, R5, R11, R12, R13 (branch `m2.8-ui-polish`): tagline under the title; footer links back to the portfolio page and the GitHub repo; Grown-ups controls are 44px targets; no text under 14px; bedtime line no longer wraps; Clear button uses the app font. Measured with Playwright at 390 and 1280.
- 2026-10-22, ES-R1 + ES-R8 (branch `m2.7-sample-photo`): **Try the sample** on the photo screen scans an illustrated child drawn in code (`src/photo/sample.ts`), captioned "Illustrated sample, not a real person", through the real on-device model. The e2e happy path (aura, Save image, Save video) now runs on it every time.
- 2026-10-22, Recruiter-Ready Sprint v2 review (branch `m2.6-recruiter-review`): UX, QA and triage in `docs/reviews/2026-10-22-recruiter-ready.md`: 16 findings (4 P0, 5 P1, 7 P2). Suites run 3x, no flakes. ES-R7 (stale portfolio status here) fixed.
- 2026-10-22, ES-M2.5 agents sync (branch `m2.5-agents-sync`): synced the six existing `.claude/agents` from studio-agents branch `claude/project-thread-wvkxmq` (its PR #6, not yet merged) to get the upgraded ux-reviewer (visual pass, heuristic sweep, showcase review mode, iterate loop). focus-coach and orchestrator left out, matching the existing set.
- 2026-10-22, ES-M2.4 (branch `m2.4-native-camera`): "Take a photo" now opens the phone's own camera app through `<input type="file" accept="image/*" capture="environment">` instead of the in-page getUserMedia camera, which Chase hit bugs with on iPhone. Removed `src/photo/camera.ts` and its tests, the camera overlay CSS, and the mirror option. The returned photo goes through the same path as an upload.
- 2026-10-21 late: Pages turned on and the app deployed to chaseholroyd.com/energy-scanner/ (ES-M2.2).
- 2026-10-21 evening, ES-M2.1 (branch `m2.1-bedtime`): Chase chose to combine this build with the original bedtime Energy Scanner (Claude artifact live on chaseholroyd.com) and keep the palm scan as an option. The app is now the bedtime flow (`src/app.ts`, logic in `src/bedtime/energy.ts` ported from the artifact) with a Palm scan / Photo scan switch; the photo scan's aura takes the level's colors and feel (`auraFeel`). Added `.github/workflows/pages.yml` for GitHub Pages; it only runs once Chase turns Pages on.
- 2026-10-21 evening: Chase asked to merge everything. PRs #2-#6 merged down the stack, then #1 into the default branch; all v1 work is now on `claude/project-thread-xq47vx` and `main`.
- 2026-10-21: studio session rules installed: `.claude/settings.json` SessionStart hook prints this file into every Claude Code session, `.github/workflows/handoff-check.yml` fails a PR that changes files without updating this file, and CLAUDE.md has a "Session rules" section.
- 2026-10-21: plan and hard rules written (PLAN.md, CLAUDE.md). Role-Radar checked: no energy scanner files exist there, so the app starts from scratch.
- M1.1 Scaffold (was M1) (branch `m1-scaffold`): Vite 8 + TypeScript 5.9, ESLint 10 + typescript-eslint, Vitest (jsdom), Playwright smoke test against `vite preview`. `npm run check`, `npm run build`, `npm run test:e2e` all green.

- M1.2 Photo in (was M2) (branch `m2-photo-in`): upload, drag/drop, in-page camera (getUserMedia, front/back flip, mirrored selfie), native `capture="user"` fallback, downscale to 1280px, friendly errors. Unit tests + Playwright tests (fake camera via Chromium flags).

- M1.3 Aura render (was M3) (branch `m3-aura`): MediaPipe selfie segmenter on-device (wasm copied from node_modules to `public/mediapipe` by `scripts/copy-mediapipe-wasm.mjs`, model committed in `public/models`), signed distance field around the person (`src/aura/field.ts`), WebGL2 aura shader (rising flame tongues, halo, waves, sparks, rim light, dimmed background) with a Canvas 2D fallback, 6 energy types auto-picked from the person's average color, intensity slider, scan animation, "no person found" and "scanner could not start" states. ~30fps even on SwiftShader (software GL).

- M1.4 Save and share (was M4) (branch `m4-export`): Save image (captioned PNG: "<Type> energy" + "Energy Scanner"), Save video (4s captioned loop via MediaRecorder; MP4 on Safari, WebM elsewhere), Share (native share sheet with the image when the browser can share files, else download).

- M1.5 Portfolio pack (was M5) (branch `m5-portfolio`, draft): recruiter README (what, try it, why, how it works with a diagram, privacy), CASE-STUDY.md (constraints, decision table, what's next), `npm run screenshots -- photo.jpg` script, start-screen screenshots committed. Result screenshots wait on a publishable photo.

- M1.6 Harden (was M6/Hardening) (branch `m6-harden`): Content Security Policy in the production build (page can only talk to its own origin; e2e proves a cross-origin POST is blocked and the model still runs), tiny photos scaled up to 480px, clear HEIC message on browsers that can't decode it, "Try again" when the scanner fails to load, arrow-key navigation for energy types, multi-person field test. Checked visually on a grayscale, side-on, full-height photo (Spectrum).

- License audit (2026-10-21, branch `claude/project-thread-flqnac`): added `LICENSE` (MIT, matching package.json), `THIRD_PARTY_NOTICES.md` and `licenses/Apache-2.0.txt` for the bundled MediaPipe model and wasm runtime (Apache 2.0, Google).

## In progress
- 2026-10-24 night shift: recruiter-share readiness with a UI focus (Chase's steer: "Prioritize sharing with a recruiter readiness. Move past blockers. Improve the ui"). Stacked draft PRs on the default branch, starting with this HANDOFF sync (`m2.18-handoff-sync`).

## Exact next step
- Night shift: re-review the top of the stack (round 7) and regenerate README screenshots and og.png. Done so far: all of R47 to R61. Originally: staff-pm ranks what a recruiter sees in 90 seconds on a phone and 5 minutes on a laptop; ux-reviewer sweeps every screen (showcase mode, 390x844, 1280x800, 320x640); fix P0 to P2 as stacked draft PRs on `m2.18-handoff-sync`, log findings as ES-R47+.
- Chase (when convenient): rescan his three real photos on his iPhone on the live site (AC-R21a/R22b/R23b/R28 in `docs/reviews/2026-10-23-ui-review.md`); paste `/mnt/project-files/power-hour/intake-product-studio.md` into Product Studio.
- CLAUDE.md still says never deploy although Pages deploys on every push to the default branch; that rule is Chase's to update.
- Later ideas: live aura on the camera feed.

## Testing note
- No photos of real people are committed. The e2e happy path runs on the illustrated sample; `SAMPLE_PHOTO=/path/to/person.jpg npm run test:e2e` adds a check on a real local photo. The no-person e2e always runs the real model and checks that every request stays on the app's origin.

## How to run
- `npm install`, then `npm run dev`. Checks: `npm run check`. Browser test: `npm run build && npm run test:e2e` (uses the preinstalled Chromium; Playwright pinned to 1.56.1 to match it).

## Decisions to review
- Web app (Vite + TS) with in-browser MediaPipe segmentation instead of a native app: fastest to demo and link from chaseholroyd.com.
- TypeScript pinned to 5.9 (not 7) because typescript-eslint does not support 7 yet.

- EXIF orientation is left to the browser (all current browsers apply it when decoding), instead of parsing EXIF, to avoid double rotation.
- Always Grey is off for first visits (Oct 24 night shift, ES-R61, Chase asked to move past blockers): a recruiter's first scan reads in color. A saved choice is kept, so families who turned it on still get Grey. To revert: `store.get('alwaysGrey', true)` in `src/app.ts`.
- The app is dark-only on purpose (night theme); light mode renders the same.
- Try the sample uses an illustrated child drawn in code, labeled "Illustrated sample, not a real person", so no real person is ever shown.
- Native camera opens on the back camera (`capture="environment"`), since a grown-up usually takes the photo; the iPhone camera's flip button switches to selfie. Selfies are saved the way the Camera app saves them.

- Selfie segmenter (250 KB) over the multiclass model (16 MB): sharper edges, 4x faster; misses fine hair detail.
- The aura color comes from tonight's reading (the v1 auto-picked energy types were removed Oct 23). Background is dimmed up to 65% so the aura reads on bright photos.
- "See every color" (Chase chose "Add the button", Oct 23): one tap from the Always Grey note turns it off and re-scans; the default stays on.
- Scan again in photo mode re-scans the same photo instead of going back to Take a photo, so ticking a step and scanning again just works (qa-tdd's recommendation; New photo still picks a new one).
- Saved-settings keys stay unprefixed (`bed`, `mode`, `alwaysGrey`, `steps-…`) on the shared chaseholroyd.com origin; values are validated instead. Prefixing would reset everyone's settings unless migrated; no collision is known.
- Dark-only (no light theme): it's a night-time app; the ux-reviewer recommends keeping it.
- Safari uses MediaPipe's CPU path: Chase's iPhone exports showed blocky masks, and the GPU path on WebKit is the likely cause (inferred, not confirmed on a device).

- Exports carry a small caption (energy type + app name) so shared images explain themselves.

- README "Why I built it" and CASE-STUDY.md (rewritten Oct 22 for the bedtime story) are in Chase's first-person voice as a draft; he should edit them to sound like him.
- Shared studio agents (`.claude/agents/`, six generic agents) were merged into the base branch (PR #7).

## Blockers
- None. (README screenshots no longer need a real photo: they use the illustrated sample.)
