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

## Done
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
- Nothing. Waiting on a publishable photo for M1.5 screenshots.

## Exact next step
- ES-M2.2: Chase turns on Pages (Settings → Pages → Source: GitHub Actions); the next push to the default branch then publishes chaseholroyd.com/energy-scanner/. CLAUDE.md still says never deploy; Chase should update that rule himself. Then ES-M2.3: update the portfolio's Energy Scanner page to link there.
- When Chase provides a photo: `npm run screenshots -- that-photo.jpg`, add result + aura grid images to the README, record the photo's consent in samples/SOURCES.md, mark PR #5 (M1.5) ready.
- Later ideas: live aura on the camera feed, Open Graph preview image, handle WebGL context loss, deploy to a static host (Chase's call).

## Testing note
- No photos of real people are committed, so the e2e happy path runs only with `SAMPLE_PHOTO=/path/to/person.jpg npm run test:e2e`. The no-person e2e always runs the real model and checks that every request stays on the app's origin.

## How to run
- `npm install`, then `npm run dev`. Checks: `npm run check`. Browser test: `npm run build && npm run test:e2e` (uses the preinstalled Chromium; Playwright pinned to 1.56.1 to match it).

## Decisions to review
- Web app (Vite + TS) with in-browser MediaPipe segmentation instead of a native app: fastest to demo and link from chaseholroyd.com.
- TypeScript pinned to 5.9 (not 7) because typescript-eslint does not support 7 yet.

- EXIF orientation is left to the browser (all current browsers apply it when decoding), instead of parsing EXIF, to avoid double rotation.
- Selfie camera photos are mirrored to match the preview, like most phone camera apps.

- Selfie segmenter (250 KB) over the multiclass model (16 MB): sharper edges, 4x faster; misses fine hair detail.
- Energy type is auto-picked from the person's average color (clothes/hair), as a fun "reading"; the person can change it. Background is dimmed up to ~70% so the aura reads on bright photos.

- Exports carry a small caption (energy type + app name) so shared images explain themselves.

- README "Why I built it" and CASE-STUDY.md are written in Chase's first-person voice as a draft; he should edit them to sound like him.
- Shared studio agents (`.claude/agents/`, six generic agents) were merged into the base branch (PR #7).

## Blockers
- Portfolio screenshots need a photo of a person that is OK to publish. The repo rule forbids real identifiable people, and image sites are blocked from this sandbox. Best option: Chase adds a photo of himself (his portfolio, his face).
