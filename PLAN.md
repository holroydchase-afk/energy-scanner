# Energy Scanner plan

Product: take or upload a photo of a person and see their energy (an aura) rendered coming off them, animated, then save or share the result. Built as a demoable v1 for Chase's portfolio.

Default stack (reversible): static web app, Vite + TypeScript, runs fully in the browser. Person segmentation with MediaPipe Tasks Vision (Image Segmenter, selfie/person model) behind a `Segmenter` interface. Aura drawn on a canvas (2D first, WebGL shader if time allows). No backend.

Note: Role-Radar was checked on 2026-10-21 and contains no energy scanner files (only README.md and CLAUDE.md on main), so this repo starts from scratch.

## Milestones

- [x] **M1 Scaffold** (branch `m1-scaffold`): Vite + TS app, lint, typecheck, unit tests (Vitest), `npm test` green, CLAUDE.md, README stub, HANDOFF.md. Done when `npm run build && npm test` pass and the page loads in headless Chromium.
- [x] **M2 Photo in** (`m2-photo-in`): upload a photo (file picker + drag/drop) and take one with the camera (getUserMedia, with a fallback to file input `capture="user"` on mobile). Image is downscaled and EXIF-orientation corrected. Done when both paths render the photo on a canvas, with tests for the image pipeline.
- [x] **M3 Aura render** (`m3-aura`): segment the person, build a soft mask/edge, and render an animated aura (glow + flowing noise/flame bands radiating outward from the silhouette) behind and around them. A few presets (colors/"energy types") and an intensity slider. Segmenter behind an interface with a fake for tests only. Done when a sample photo shows a clear animated aura hugging the person, at 30fps+ on a laptop, with tests for mask and color logic.
- [x] **M4 Save and share** (`m4-export`): export a still PNG and a short loop (WebM via MediaRecorder; GIF optional), plus Web Share API on mobile. Done when export works in headless Chromium tests.
- [ ] **M5 Portfolio pack** (`m5-portfolio`): recruiter-readable README (what, why, how it works, privacy: photos never leave the device), Playwright screenshots/GIF of the core flow using sample images only, short CASE-STUDY.md. Done when README shows screenshots and explains the product in under 60 seconds of reading.

After M5: harden (edge cases: no person found, multiple people, tiny/huge images, dark photos), accessibility, performance, mobile layout.
