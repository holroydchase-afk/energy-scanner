# Handoff

## Done
- 2026-10-21: plan and hard rules written (PLAN.md, CLAUDE.md). Role-Radar checked: no energy scanner files exist there, so the app starts from scratch.
- M1 Scaffold (branch `m1-scaffold`): Vite 8 + TypeScript 5.9, ESLint 10 + typescript-eslint, Vitest (jsdom), Playwright smoke test against `vite preview`. `npm run check`, `npm run build`, `npm run test:e2e` all green.

## In progress
- M2 Photo in (branch `m2-photo-in`, stacked on `m1-scaffold`).

## Exact next step
- Build photo input: file picker + drag/drop + camera capture, downscale and orientation, render to canvas.

## How to run
- `npm install`, then `npm run dev`. Checks: `npm run check`. Browser test: `npm run build && npm run test:e2e` (uses the preinstalled Chromium; Playwright pinned to 1.56.1 to match it).

## Decisions to review
- Web app (Vite + TS) with in-browser MediaPipe segmentation instead of a native app: fastest to demo and link from chaseholroyd.com.
- TypeScript pinned to 5.9 (not 7) because typescript-eslint does not support 7 yet.

## Blockers
- None.
