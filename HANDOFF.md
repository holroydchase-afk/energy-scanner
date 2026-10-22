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
- **Live app:** https://chaseholroyd.com/energy-scanner/. Pages is on; the first deploy from the default branch succeeded Oct 21 23:32 UTC (Actions run "pages" #1), so ES-M2.2 is done.
- **Portfolio page:** https://chaseholroyd.com/energy-scanner.html (source: `tools/build.py` in `holroydchase-afk.github.io`). ES-M2.3 (portfolio PR #8, merged Oct 21): its "Try it" button opens the live app at /energy-scanner/, and the copy covers the palm scan and the on-device photo aura. The old /demo/energy-scanner/ snapshot stays one release, unlinked, then is removed.
- **Who does what:** the portfolio thread changes the portfolio repo; this project sends it an intake for anything the page should say, and logs the result here.
- **Demo data:** no photos stored or uploaded; everything runs in the visitor's browser.
- **Studio-wide status** (portfolio, domain, every demo, what's waiting on Chase): https://github.com/holroydchase-afk/pm-tools/blob/main/STUDIO-STATUS.md

## Done
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
- Recruiter-Ready Sprint v2 fix loop (Chase approved 2026-10-22): stacked draft PRs from `m2.5-agents-sync`. Each round: fix top open items in the review doc, re-screenshot, re-run suites, update the doc and this file.

## Exact next step
- Fix loop: take the top `open` row in `docs/reviews/2026-10-22-recruiter-ready.md` (P0 first), failing test first, one stacked draft PR per fix or tight batch. Never merge or deploy.
- ES-M2.4: Chase tests "Take a photo" on his iPhone after this merges (Pages redeploys). CLAUDE.md still says never deploy although Pages now deploys on every push to the default branch; that rule is Chase's to update.
- Later ideas: Open Graph preview image, handle WebGL context loss, deploy to a static host (Chase's call).

## Testing note
- No photos of real people are committed. The e2e happy path runs on the illustrated sample; `SAMPLE_PHOTO=/path/to/person.jpg npm run test:e2e` adds a check on a real local photo. The no-person e2e always runs the real model and checks that every request stays on the app's origin.

## How to run
- `npm install`, then `npm run dev`. Checks: `npm run check`. Browser test: `npm run build && npm run test:e2e` (uses the preinstalled Chromium; Playwright pinned to 1.56.1 to match it).

## Decisions to review
- Web app (Vite + TS) with in-browser MediaPipe segmentation instead of a native app: fastest to demo and link from chaseholroyd.com.
- TypeScript pinned to 5.9 (not 7) because typescript-eslint does not support 7 yet.

- EXIF orientation is left to the browser (all current browsers apply it when decoding), instead of parsing EXIF, to avoid double rotation.
- Native camera opens on the back camera (`capture="environment"`), since a grown-up usually takes the photo; the iPhone camera's flip button switches to selfie. Selfies are saved the way the Camera app saves them.

- Selfie segmenter (250 KB) over the multiclass model (16 MB): sharper edges, 4x faster; misses fine hair detail.
- Energy type is auto-picked from the person's average color (clothes/hair), as a fun "reading"; the person can change it. Background is dimmed up to ~70% so the aura reads on bright photos.

- Exports carry a small caption (energy type + app name) so shared images explain themselves.

- README "Why I built it" and CASE-STUDY.md (rewritten Oct 22 for the bedtime story) are in Chase's first-person voice as a draft; he should edit them to sound like him.
- Shared studio agents (`.claude/agents/`, six generic agents) were merged into the base branch (PR #7).

## Blockers
- None. (README screenshots no longer need a real photo: they use the illustrated sample.)
