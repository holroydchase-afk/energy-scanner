# Handoff

## Done
- 2026-10-21: plan and hard rules written (PLAN.md, CLAUDE.md). Role-Radar checked: no energy scanner files exist there, so the app starts from scratch.
- M1 Scaffold (branch `m1-scaffold`): Vite 8 + TypeScript 5.9, ESLint 10 + typescript-eslint, Vitest (jsdom), Playwright smoke test against `vite preview`. `npm run check`, `npm run build`, `npm run test:e2e` all green.

- M2 Photo in (branch `m2-photo-in`): upload, drag/drop, in-page camera (getUserMedia, front/back flip, mirrored selfie), native `capture="user"` fallback, downscale to 1280px, friendly errors. Unit tests + Playwright tests (fake camera via Chromium flags).

- M3 Aura render (branch `m3-aura`): MediaPipe selfie segmenter on-device (wasm copied from node_modules to `public/mediapipe` by `scripts/copy-mediapipe-wasm.mjs`, model committed in `public/models`), signed distance field around the person (`src/aura/field.ts`), WebGL2 aura shader (rising flame tongues, halo, waves, sparks, rim light, dimmed background) with a Canvas 2D fallback, 6 energy types auto-picked from the person's average color, intensity slider, scan animation, "no person found" and "scanner could not start" states. ~30fps even on SwiftShader (software GL).

- M4 Save and share (branch `m4-export`): Save image (captioned PNG: "<Type> energy" + "Energy Scanner"), Save video (4s captioned loop via MediaRecorder; MP4 on Safari, WebM elsewhere), Share (native share sheet with the image when the browser can share files, else download).

- M5 Portfolio pack (branch `m5-portfolio`, draft): recruiter README (what, try it, why, how it works with a diagram, privacy), CASE-STUDY.md (constraints, decision table, what's next), `npm run screenshots -- photo.jpg` script, start-screen screenshots committed. Result screenshots wait on a publishable photo.

## In progress
- Hardening (branch `m6-harden`, stacked on `m5-portfolio`).

## Exact next step
- When Chase provides a photo: `npm run screenshots -- that-photo.jpg`, add result + aura grid images to the README, record the photo's consent in samples/SOURCES.md, mark PR M5 ready.
- Meanwhile harden: multiple people, tiny/huge/dark images, HEIC on non-Safari, model load failure retry, mobile layout, accessibility.

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

## Blockers
- Portfolio screenshots need a photo of a person that is OK to publish. The repo rule forbids real identifiable people, and image sites are blocked from this sandbox. Best option: Chase adds a photo of himself (his portfolio, his face).
