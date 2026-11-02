# Accounts: Energy Scanner

Every outside account or service the product relies on, where its name is baked in, and what a rename would cost.

> **Before anything that locks the name** (a domain, a store build, telling users), **stop and warn Chase.** The name "Energy Scanner" and the paths below are already public on chaseholroyd.com, GitHub and in shared link previews.

| Account or service | What it does for us | Where the name is baked in | Rename cost |
|---|---|---|---|
| GitHub account `holroydchase-afk` | Owns this repo, the portfolio repo, studio-agents and pm-tools | `src/app.ts` footer link, `src/app.test.ts`, PR and branch history, `HANDOFF.md` links | High: every repo URL and link changes; GitHub redirects old repo URLs but not Pages paths |
| GitHub repo `energy-scanner` (public) | Code, PRs, CI | Footer "Code on GitHub" (`src/app.ts`), `src/app.test.ts`, `README.md`; the repo name is also the Pages path `/energy-scanner/` | Medium: renaming the repo moves the live app's URL (see Pages) |
| GitHub Pages (project site under the `holroydchase-afk.github.io` user site) | Hosts the live app; deploys on every push to `claude/project-thread-xq47vx` or `main` | `.github/workflows/pages.yml` (branch names, `github-pages` environment); `vite.config.ts` `base: './'` keeps the build path-independent | Low for the build; the URL follows the repo name. Moving hosts means a new workflow and new links everywhere below |
| Custom domain chaseholroyd.com | Public URL of the app and the portfolio page | `index.html` (`og:url`, `og:image`), `src/app.ts` (byline, case study link), `src/app.test.ts`, `README.md`, `HANDOFF.md`, link previews already shared | High: shared links and previews break. Saved settings live in `localStorage` on this shared origin with unprefixed keys (`bed`, `mode`, `alwaysGrey`, `steps-…`), so a new domain resets every family's settings |
| Domain registrar and DNS for chaseholroyd.com | Points the domain at GitHub Pages | Not recorded in this repo | Unknown here; see pm-tools `STUDIO-STATUS.md` |
| Portfolio repo `holroydchase-afk.github.io` | The Energy Scanner page at chaseholroyd.com/energy-scanner.html, whose "Try it" button opens the app (portfolio PR #8) | `tools/build.py` in that repo; links from this app's byline and footer | Medium: a rename needs a PR there too (the portfolio thread owns it). The old /demo/energy-scanner/ snapshot is unlinked and due for removal |
| MediaPipe Selfie Segmenter model (Google, Apache 2.0) | On-device person segmentation | Committed at `public/models/selfie_segmenter.tflite`; `src/segment/mediapipe.ts`; `THIRD_PARTY_NOTICES.md` | None for a rename. Swapping models changes edges and speed |
| MediaPipe Tasks Vision runtime, npm `@mediapipe/tasks-vision` (Google, Apache 2.0) | JS and wasm runtime for the model | `package.json`; copied to `public/mediapipe/` by `scripts/copy-mediapipe-wasm.mjs`; served from the app's own origin, no CDN at runtime | None for a rename. Loading it from a CDN would break the privacy claim and the CSP |
| npm registry | Installs the runtime and dev tools (Vite, TypeScript, ESLint, Vitest, Playwright, jsdom) | `package.json`, `package-lock.json`; package name `energy-scanner` (private, not published) | Low: the package name is local only |
| GitHub Actions (runners and actions) | `ci`, `pages`, `handoff-check`, `agents-check` workflows | `.github/workflows/*.yml`; `ci.yml` pinned to `ubuntu-24.04` | Low for a rename. Pages deploy is tied to the branch names in `pages.yml` |
| Playwright Chromium download | e2e tests in CI (`npx playwright install --with-deps chromium`) | `ci.yml`; Playwright pinned to 1.56.1 | None for a rename; runner image upgrades can break it (see NOTES.md lessons) |
| Studio repos `holroydchase-afk/studio-agents` and `holroydchase-afk/pm-tools` | Shared agents, checks and session rules; studio-wide status | `.claude/agents/`, `scripts/check-*.sh`, `CLAUDE.md`, `HANDOFF.md` | Low: re-sync with studio-agents `scripts/sync.sh` |

## The product name "Energy Scanner" appears in

- `index.html` `<title>` and `og:title` (the link preview title).
- `src/export/export.ts`: the caption on every saved image and video, and the share text ("Scan yours with Energy Scanner").
- `src/app.ts`, `README.md`, `CASE-STUDY.md`, the portfolio page.
- Images and videos people have already saved or shared carry the old caption; a rename cannot reach them.

## Not used

No analytics, error tracking, backend, database, auth provider, email service or paid API. Adding any of them needs `architect` and `privacy-security` first (`CLAUDE.md`), and a row here.
