# Handoff

<!-- status
stage: live
goal: portfolio
milestone: ES-M2 (Polish Freeze: harden and UI polish only)
now: Nov 22, ES-M2.5 less text built and rescored (4 to 7.5/10 at 390, 7/10 at 1280), fix round TXT-R19, R20, R22 done; merged as PR #49 on Chase's go (Nov 22 04:40 UTC), Pages run #14 deployed
next: next UI gap is layout (pad in empty canvas at 1280, reading below the fold after See the aura demo at 390)
waiting_on_chase:
  - 60-second phone check and iPhone rescan of three real photos
blockers: []
-->

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
_Updated 2026-11-22._
- **Nov 22:** live since PR #49 merged (Pages run #14): the demo shows far less text: one tagline line, no how-to sentences on the pad or photo screen, short Grown-ups labels, a one-line footer, and Lucide line icons instead of emoji, and a quick tap on the hand finishes the scan.
- **Nov 21:** once the restyle PR merges (on Chase's go), the live demo is restyled to the studio Paper design system: Atkinson Hyperlegible Next, light and dark looks, one accent.
- **Nov 10:** live app header now reads "7:00 PM pretend" with a real space when a pretend time is set (QA-R1, from #45); on very narrow phones the pretend tag sits under the time (QA-R3).
- **Recruiter-ready sprint v2 (Oct 22):** first screen now says what it is, the footer links back to chaseholroyd.com/energy-scanner.html and GitHub, Try the sample shows the aura without a photo, README screenshots and CASE-STUDY.md match the app, and shared links get a preview image. Merged as PR #16 and live since Oct 23.
- **Live app:** https://chaseholroyd.com/energy-scanner/. Pages is on; the first deploy from the default branch succeeded Oct 21 23:32 UTC (Actions run "pages" #1), so ES-M2.2 is done.
- **Portfolio page:** https://chaseholroyd.com/energy-scanner.html (source: `tools/build.py` in `holroydchase-afk.github.io`). ES-M2.3 (portfolio PR #8, merged Oct 21): its "Try it" button opens the live app at /energy-scanner/, and the copy covers the palm scan and the on-device photo aura. The old /demo/energy-scanner/ snapshot stays one release, unlinked, then is removed.
- **Who does what:** the portfolio thread changes the portfolio repo; this project sends it an intake for anything the page should say, and logs the result here.
- **Demo data:** no photos stored or uploaded; everything runs in the visitor's browser.
- **Studio-wide status** (portfolio, domain, every demo, what's waiting on Chase): https://github.com/holroydchase-afk/pm-tools/blob/main/STUDIO-STATUS.md

## Done
- Nov 25, intake #53 (ask-less self-check): CLAUDE.md now has the self-check paragraph under the Studio standard line (Chase never updates settings, environments or repos by hand; do it yourself, a tool, a card, then one copy box). Docs only.
- Nov 22, intake #50 wired to studio-agents (branch `claude/project-thread-40mnsv`, spec `docs/product/SPEC-STUDIO-WIRING.md`), failing tests first (`src/studio-wiring.test.ts`, AC-SW1 to SW8): re-ran studio-agents `sync.sh` and `install-rules.sh` (adds `release-captain`, updates `ux-reviewer`, installs `scripts/agent-prompt.sh`); hand-merged `log-agent-run.sh --as`, `check-agent-runs.sh` accepting `via-general-purpose` lines, and agents-check's "qa-tdd cannot be skipped" step (kept `setup-node@v4`). CLAUDE.md's Studio agents section now matches `templates/CLAUDE-agents.md` (opening rule, agents come from studio-agents, release-captain row). Cloud threads run agents as general-purpose with `bash scripts/agent-prompt.sh <agent> "<task>"`; they log themselves to `.claude/agent-runs/`. Built app unchanged. Still to prove (AC-SW11): the next code PR shows qa-tdd red then green with its log.
- Nov 22, ES-M2.5 fix round after the ux-reviewer rescore (4/10 to 7.5/10 at 390, 7/10 at 1280), failing tests first (777fcdf): the empty check circle's border is `--muted`, 3:1 or better in light and dark (TXT-R19, P1; AC-TXT2's e2e now expects `--muted`, as AC-TXT19 says); the tagline uses `text-wrap: balance`, so "AI aura." no longer sits alone at 390 or 320 (R20); the Grown-ups help reads "On: every scan reads Grey." so it doesn't look like the current state under Off (R22). No token changes.
- Nov 22, ES-M2.5 less text (branch `claude/project-thread-2xwlcu`, review `docs/reviews/2026-11-22-less-text.md`), failing tests first (8b7e308), built in staff-pm's order, one commit per step:
  - Step 1 strings: one tagline "A kids' bedtime routine with an on-device AI aura." (TXT-R1); no steps-left line on the reading (R5); "Choose a photo", not "Upload" (R6); See the aura demo hidden in photo mode (R8); Grown-ups help is "Every scan reads Grey.", the algorithm paragraph moved to CASE-STUDY.md (R10); short labels Pretend time, Always Grey, Clear steps, Automatic (R11); "Always Grey is on." (R12); footer is the privacy line and Code on GitHub (R13); "Scanning energy…" is screen-reader only while scanning (R17).
  - Step 2 icons: Lucide 1.77.0 line icons copied into `src/ui/icons.ts` (ISC, `licenses/ISC-lucide.txt`, no dependency, no CDN) for steps, mode switch (Palm / Photo) and pad; check circles replace "Tap each step when done" and "0 of 5" (R9, R14, R2).
  - Step 3 silent pad: the pad hint is screen-reader only ("Scanning", "Done"); the idle ring breathes, still with reduced motion (R3).
  - Step 4 drag state: the photo screen is just its buttons; "Drop to scan" with a dashed accent outline shows only while a file is dragged (R7).
  - Step 5: an early release says "Keep holding" (4a, always ships); then a short press finishes as a button scan (4b, TXT-R4, Chase chose it Nov 22).
- Nov 10, retest and merge (Chase): the only open PR was #45; it was brought up to date with the default branch (HANDOFF conflict only), all suites rerun 3x, and merged as one PR. #45 closed as superseded. Goes live: the header reads "7:00 PM pretend" with a real space (QA-R1). CI then caught the extra space pushing the 320px header 4px past the screen (QA-R3, P2, CI's monospace font is wider than the sandbox's); fixed by letting the pretend tag wrap under the time when space runs out, with a stricter header-overflow test that failed first. The rest is tests.
- Nov 2, qa-tdd pass on #42 (after it merged): suites green 3x; QA-R1 (P2) the header read "7:00 PMpretend" with no space for screen readers or copied text, fixed with a real space; QA-R2 (P2) gap tests for slider edges, focus return, hidden reset row, 320px header and desktop footer added (`src/qa-pretend.test.ts`, `e2e/qa-pretend.spec.ts`). qa-tdd ran as a general-purpose agent with the qa-tdd brief, since cloud sessions can't load repo agent types.
- Nov 2, intake #43 (studio standard), merged as PR #44: studio agents, tools and rules re-synced from studio-agents main (story-keeper added; `log-agent-run.sh` now works in cloud sessions). Seeded `docs/product/NOTES.md` (decisions ES-DEC-1 to 11, lessons, marketing claims register) and `docs/product/ACCOUNTS.md` from the repo's history. No product-specific agent knowledge exists yet, so there's no `docs/eng/AGENT-NOTES.md`. CLAUDE.md now has the standard line, the current agents section (with story-keeper), and the shipping rule. Never merge became merge on green, with a live-demo gate (Chase's go, Nov 2).
- Nov 1, phone screenshot polish (merged as PR #42 on Nov 2) (branch `claude/project-thread-g6bi4s`, from Chase's iPhone shots of the live app), failing tests first:
  - ES-R69 (P1): a pretend time from the Grown-ups slider looked like the real clock (header said 5:14 AM at 8:14). The header now shows a "pretend" tag and a "Back to real time" button appears under the slider.
  - ES-R70 (P2): the slider reads "3 h earlier" / "45 min later" instead of "-180 min".
  - ES-R71 (P2): on touch phones the footer gets 80px extra bottom room so Safari's floating bottom bar no longer covers the privacy line (confirm on an iPhone).
  - Checked, not a bug: Rainbow at 5 AM with 0 of 5 steps is by design (15 h before an 8 PM bedtime reads wide awake).
- Nov 1: CI `test` job pinned to `ubuntu-24.04` (Chase's call): `ubuntu-latest` moved to 26.04, where Playwright 1.56.1 can't install Chromium. Unpin once a Playwright upgrade supports 26.04.
- Oct 31 Intake check: #39 done: qa-tdd synced from studio-agents main (qa report contract), `scripts/check-qa-report.mjs` added, CLAUDE.md gets the "Relay qa-tdd's verdict as-is" rule; qa-tdd ran once on this branch (its qa block is in PR #41).
- Oct 31 Intake check: #40 done: status header added at the top of this file (Studio Console reads it), `scripts/check-handoff-status.sh` installed from studio-agents, and a warn-only step added to handoff-check.
- Oct 31 Intake check: #38 (studio Demo bar) closed as not planned. The app shows no sample data, and the illustrated sample already has its "not a real person" caption. #39 was blocked on studio-agents #33 until it merged that evening.
- 2026-10-29, studio re-sync (branch `claude/project-thread-qfo5la`): ran studio-agents `main` (b6a9a8b) `scripts/sync.sh`, `scripts/sync-tools.sh` and `scripts/install-rules.sh` on this repo. New: the upgraded `ux-reviewer` (visual critic, two critics per screen, 0-10 score, Layer 1 G rules, preloads `review-rounds`), `.claude/design-rules.md`, `scripts/ux-shots.mjs` and `scripts/ux-rules.mjs` (Playwright visual and rule checks), the Supabase line in `privacy-security`, and the agent run log (`scripts/log-agent-run.sh` hook in `.claude/settings.json`, `scripts/check-agent-runs.sh` step in `agents-check.yml`). Hand-merged the files install-rules kept: `.claude/settings.json` and `agents-check.yml` now match the templates, `studio-checks.json` keeps `roots: ["src"]` and adds `agents.verify` (`npm run check`, 3 runs on CI), CLAUDE.md gets the "every agent must really have run" paragraph. `review-rounds` is now upstream and identical, so the next sync keeps it. ESLint allows empty `catch {}` in the two synced tools only (a re-sync would undo edits to them). No project-only agents existed; all 7 agents are studio ones. Lint, typecheck and unit tests (115) green 3x; e2e 18 passed, 1 skipped.
- 2026-10-29, review-rounds skill (branch `claude/project-thread-jtg48o`): `.claude/skills/review-rounds/SKILL.md` writes down the review loop used for ES-R1 to R68 (rounds, P0 to P2, review file format, stop rule), and `ux-reviewer` preloads it with a `skills:` line, since its tool list has no Skill tool. Chase asked for it in the "Find reusable agents and libraries" thread and approved the merge.
- 2026-10-28 studio refresh merged as PR #35: agents re-synced from studio-agents (adds `architect`), `agents-check` workflow, `scripts/check-agents.sh`, Studio agents table in CLAUDE.md.
- 2026-10-24 night shift, round 7 (branch `m2.23-round7`, stacked on `m2.22-screenshots`): ux-reviewer verified all 15 round-6 fixes and found 7 more, all fixed here with tests first: R62 (P1) the palm reading scrolls into view when it's ready; R63 laptops say "Click and hold"; R64 laptop photo lead matches its buttons; R65 link preview text and og.png pitch the on-device aura; R66 README points to See the aura demo; R67 Try the sample first when nobody's in the photo; R68 README aura shots have square, clean corners, and the palm README shot no longer shows a background seam. Nothing at P2 or above is left.
- 2026-10-24 night shift, screenshots (branch `m2.22-screenshots`, stacked on `m2.21-ui-polish`): README screenshots and `public/og.png` regenerated from the new UI with `npm run screenshots`; the start and palm shots now show a first visit (Always Grey off, 7pm). 
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
  - R54: on wide screens the scan keeps the Palm/Photo switch in view (the title scrolls off; title plus photo can't both fit in 800px); the reading card sits at the top of a 400px column.
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
- ES-M2.4 Studio design system (Paper): the restyle PR is committed on branch `claude/project-thread-e25yzo` (293ec69 plus the DS-R18 to DS-R22 follow-up) and merges as PR #48 on Chase's go (Nov 22). The agents check is red only because the run-log hook didn't fire in the cloud session; Chase accepted that. Built: `src/design/theme.ts` (Paper color math written from STUDIO-CORE §3, not ported), `scripts/gen-themes.mjs` (`npm run themes`), token-only `style.css`, bundled Atkinson Hyperlegible Next 5.3.0 (OFL, `licenses/OFL-1.1.txt`), tinted/quiet buttons, Scan button on the pad, Look (Light/Dark/Match phone) in Grown-ups, Always Grey On/Off words, step check marks, reading name in ink with an energy dot, solid caption band on saved images. ux-reviewer after-review scored 7/10 (was 5/10), no P0/P1. Nov 21 follow-up, failing tests first: Look options are three stacked 48px rows on the Grown-ups edge (DS-R18); the pad's Scan button hides once the reading shows and returns on Scan again (DS-R20); Grown-ups panel max 560px, Always Grey help text right under its switch, "Try a different time" label tight above the slider (DS-R21); `text-wrap: pretty` on tagline, pitch and reading text (DS-R22). Unit and e2e green (79 passed, 1 skipped).

## Parked (Polish Freeze)
- TXT-R15 (P2): flavor lines to 9 words or fewer (list in AC-TXT15); needs positioning to confirm the voice. Next copy pass.
- TXT-R16 (P2): shorter error messages (new words in the review's Errors table). Rarely seen, not the text Chase flagged.
- TXT-R18 (P2): New photo after the sample throws a TypeError from the `webglcontextlost` handler in `src/ui/result.ts`; return early when destroyed. Own small hardening PR with a failing e2e first (AC-TXT18).
- DS-R17 (P2): done in ES-M2.5 as TXT-R9 (Lucide line icons).
- DS-R19 (P2): confirm before Clear tonight's steps (inline "Clear all of tonight's steps?" with "Clear steps" and "Keep", AC-DS9).

## Exact next step
- Next gap (layout, not text): at 1280 the palm pad sits in a lot of empty canvas; at 390 the reading lands below the fold after See the aura demo. TXT-R21: the Lucide toothbrush may read as a pen at 28px; check it with a real kid in AC-TXT-M (fallback: `smile`).
- Chase: review and merge the studio re-sync PR. From then on, agents named on a PR's `Agents:` line must show up in `.claude/agent-runs/<branch>.log` (the hook writes it in sessions that load the repo's agents; commit it with the PR).
- Next UI pass: ux-reviewer runs `node scripts/ux-rules.mjs dist/index.html` then `node scripts/ux-shots.mjs dist/index.html` for its 0-10 score (in a cloud sandbox, Playwright may need the preinstalled Chromium).
- Chase: a 60-second phone check of the live site (link preview, first screen, See the aura demo, palm scan, Save/Share), and rescan his three real photos on his iPhone (AC-R21a/R22b/R23b/R28 in `docs/reviews/2026-10-23-ui-review.md`); paste `/mnt/project-files/power-hour/intake-product-studio.md` into Product Studio.
- Hardening follow-up (Polish Freeze allows it): `scripts/check-logs.mjs` (installed, not wired) flags four `console.*` calls that log whole error objects (`src/ui/result.ts` x3, `src/aura/renderer.ts`). Fix them to log `e.name`, then add `node scripts/check-logs.mjs` to `npm test`.
- CLAUDE.md still says never deploy although Pages deploys on every push to the default branch; that rule is Chase's to update.

## Testing note
- No photos of real people are committed. The e2e happy path runs on the illustrated sample; `SAMPLE_PHOTO=/path/to/person.jpg npm run test:e2e` adds a check on a real local photo. The no-person e2e always runs the real model and checks that every request stays on the app's origin.

## How to run
- `npm install`, then `npm run dev`. Checks: `npm run check`. Browser test: `npm run build && npm run test:e2e` (uses the preinstalled Chromium; Playwright pinned to 1.56.1 to match it).
- In a Claude cloud sandbox the e2e needs `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e` (the preinstalled Chromium build differs from Playwright 1.56.1's default); CI is unaffected.

## Decisions to review
- TXT-R4 (Nov 22, decided: Chase chose "Tap finishes the scan"): a press on the pad shorter than the hold now finishes as a button scan, so a tap never fails (Scan button unchanged, principle 4 kept). It changes the original hold-to-scan mechanic. If Chase says no, `git revert` the last commit (4b) and the "Keep holding" fallback (4a) comes back with its tests.
- PS-R1 (Nov 21, resolved Nov 22): `src/design/tokens.json` is copied from Hearth (AGPL); Chase OK'd licensing this copy MIT here ("Ok MIT"), noted in `src/design/README.md`.
- 2026-10-29 re-sync: `agents.verify` in `studio-checks.json` is `[ -d node_modules ] || npm ci; npm run check`, so CI reruns lint, typecheck and unit tests 3x whenever a PR claims qa-tdd ran. Swap to a lighter command if agents-check gets slow.
- 2026-10-29 re-sync: this cloud session couldn't load the repo's `.claude/agents` (the Agent tool only offered built-in types), so the PR says `qa-tdd skipped` and the main session ran the suites 3x itself. Hand-written log entries are banned, so none were added.
- The review-rounds skill lives in this repo for now and ux-reviewer was edited locally (Oct 29). A studio-agents re-sync would drop the `skills:` line until Product Studio adds it upstream.
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
- Shared studio agents (`.claude/agents/`) come from holroydchase-afk/studio-agents; re-sync with its `scripts/sync.sh`. Oct 28: seven agents (architect added); orchestrator and focus-coach stay Product Studio's. No project-only agents.
- Studio refresh (Oct 28): install-rules kept the existing `.claude/settings.json` and `handoff-check.yml`; both are identical to the studio templates, so nothing needed merging by hand.

## Blockers
- Resolved Nov 22: AC-TXT1c word budgets (palm 45, photo pick 50) failed with the planned copy (47 and 51; the review's after-count was off). staff-pm kept the budgets and the "By" and "bedtime" words, and shortened the tagline to "A kids' bedtime routine with an on-device AI aura." (9 words, was 14): palm is now 42, photo pick 46.
- None. (README screenshots no longer need a real photo: they use the illustrated sample.)
