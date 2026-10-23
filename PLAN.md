# Energy Scanner plan

Product: take or upload a photo of a person and see their energy (an aura) rendered coming off them, animated, then save or share the result. Built as a demoable v1 for Chase's portfolio.

Default stack (reversible): static web app, Vite + TypeScript, runs fully in the browser. Person segmentation with MediaPipe Tasks Vision (Image Segmenter, selfie/person model) behind a `Segmenter` interface. Aura drawn on a canvas (2D first, WebGL shader if time allows). No backend.

Note: Role-Radar was checked on 2026-10-21 and contains no energy scanner files (only README.md and CLAUDE.md on main), so this repo starts from scratch.

## Plan

IDs follow the studio standard (`docs/planning-ids.md` in holroydchase-afk/studio-agents): milestone `M1`, task `M1.1`, step `M1.1.1`. Across products this repo's code is `ES` (for example `ES-M1.5`). Status is todo, doing, blocked, done or dropped. The old M1–M6 labels map to these IDs in `HANDOFF.md`. New branches are named `m2.1-short-name`.

### M1: Demoable v1

- [x] **M1.1 Scaffold** (done) (branch `m1-scaffold`): Vite + TS app, lint, typecheck, unit tests (Vitest), `npm test` green, CLAUDE.md, README stub, HANDOFF.md. Done when `npm run build && npm test` pass and the page loads in headless Chromium.
- [x] **M1.2 Photo in** (done) (`m2-photo-in`): upload a photo (file picker + drag/drop) and take one with the camera (getUserMedia, with a fallback to file input `capture="user"` on mobile). Image is downscaled and EXIF-orientation corrected. Done when both paths render the photo on a canvas, with tests for the image pipeline.
- [x] **M1.3 Aura render** (done) (`m3-aura`): segment the person, build a soft mask/edge, and render an animated aura (glow + flowing noise/flame bands radiating outward from the silhouette) behind and around them. A few presets (colors/"energy types") and an intensity slider. Segmenter behind an interface with a fake for tests only. Done when a sample photo shows a clear animated aura hugging the person, at 30fps+ on a laptop, with tests for mask and color logic.
- [x] **M1.4 Save and share** (done) (`m4-export`): export a still PNG and a short loop (WebM via MediaRecorder; GIF optional), plus Web Share API on mobile. Done when export works in headless Chromium tests.
- [ ] **M1.5 Portfolio pack** (blocked: needs a publishable photo) (`m5-portfolio`): recruiter-readable README (what, why, how it works, privacy: photos never leave the device), Playwright screenshots/GIF of the core flow using sample images only, short CASE-STUDY.md. Done when README shows screenshots and explains the product in under 60 seconds of reading.

- [x] **M1.6 Harden** (done) (`m6-harden`): edge cases (no person found, multiple people, tiny/huge images, dark photos), accessibility, performance, mobile layout.

### M2: Bedtime Energy Scanner with a photo scan

Chase's call (Oct 21): combine the photo aura with the original bedtime Energy Scanner (live on chaseholroyd.com) and keep the palm scan as an option.

- [x] **M2.1 Bedtime flow + scan choice** (done) (`m2.1-bedtime`): routine steps, palm scan (press and hold), Grey to Rainbow levels, grown-ups panel (bedtime, pretend time, Always Grey, clear steps), ported from the original prototype. Photo scan renders the aura in the level's colors, softer and slower when sleepy. Done when both scans give a reading, with tests for the energy logic and both flows.
- [x] **M2.2 Publish the demo** (done) (`.github/workflows/pages.yml`): GitHub Pages build at chaseholroyd.com/energy-scanner/. Done when the link loads on a phone.
- [x] **M2.3 Point the portfolio at it** (done, portfolio PR #8): update the portfolio's Energy Scanner page and demo link (in the portfolio repo, not this one).
- [x] **M2.4 Native camera** (done, PR #15) (`m2.4-native-camera`): "Take a photo" opens the phone's own camera app (native capture input) instead of an in-page camera. Done when it works on Chase's iPhone.
- [ ] **M2.6 Recruiter-ready** (in progress): fix the findings in `docs/reviews/2026-10-22-recruiter-ready.md` until nothing at P2 or above is left.
- [ ] **M2.14 UI review, round 4** (in review, `m2.14-ui-review`): fix ES-R21 to R35 from `docs/reviews/2026-10-23-ui-review.md`, including real-photo edge quality. Done when the suites pass and Chase's iPhone rescans show clean edges.
