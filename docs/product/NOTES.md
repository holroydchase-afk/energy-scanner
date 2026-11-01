# Product notes: Energy Scanner

Decisions, lessons and the marketing claims register, kept as three sections of one file until a section outgrows a screen (studio standard, section 3). IDs and rules are the same as the separate files: add a decision in the same PR as the call, write a lesson after any lost evening, broken demo or wrong call, and public copy only uses claims listed here.

## Decisions

Calls Chase made, oldest first. Quotes are his words as the sources record them; "Paraphrase" marks a faithful summary. Calls made by agents for Chase to review stay in `HANDOFF.md` under "Decisions to review" until he confirms them.

**ES-DEC-1 (2026-10-21): photos never leave the device.**
- Call (draft in his voice, CASE-STUDY.md): "Kids' faces never go to a cloud model. If there's a camera, the photo stays on the phone. No server, no account, no tracking."
- Why: a kids' bedtime app that uses a camera; the repo is public.
- Beat: a cloud vision API or a backend. The camera waited until it could run privately.
- Source: `CLAUDE.md` hard rules (d5b14fb), `CASE-STUDY.md` "Constraints I set".

**ES-DEC-2 (2026-10-21): combine the photo aura with the bedtime Energy Scanner, keep the palm scan.**
- Call (paraphrase): combine this build with the original bedtime Energy Scanner (a prototype live on chaseholroyd.com) and keep the palm scan as an option.
- Why: the routine is the point; a fake scan alone "wears off in a week" (CASE-STUDY.md). The palm scan still works without a camera.
- Beat: a standalone photo-aura toy.
- Source: `PLAN.md` M2 ("Chase's call (Oct 21)"), 3a6c84b.

**ES-DEC-3 (2026-10-21): merge the v1 stack.**
- Call (paraphrase): Chase asked to merge everything. PRs #2 to #6 merged down the stack, then #1.
- Why: get v1 onto the default branch so it could be published.
- Beat: leaving v1 as stacked draft PRs.
- Source: `HANDOFF.md` Done (Oct 21 evening).

**ES-DEC-4 (2026-10-21): publish on GitHub Pages at chaseholroyd.com/energy-scanner/.**
- Call (paraphrase): Chase turned on Pages (Source: GitHub Actions), so every push to the default branch deploys.
- Why: "Demoable in one tap, on a phone. A static site on my portfolio" (CASE-STUDY.md).
- Beat: keeping the demo unpublished. Open conflict: `CLAUDE.md` still says never deploy; that rule is Chase's to update.
- Source: 328cd48, `HANDOFF.md` Exact next step.

**ES-DEC-5 (2026-10-22): "Take a photo" opens the phone's own camera app.**
- Call (paraphrase): replace the in-page camera, which Chase hit bugs with on iPhone, with the native camera.
- Why: the native camera handles focus, flash and switching cameras.
- Beat: the in-page getUserMedia camera (removed with its tests).
- Source: 11d2472, PR #15, `CASE-STUDY.md` decision table.

**ES-DEC-6 (2026-10-22): run the Recruiter-Ready Sprint v2.**
- Call (paraphrase): Chase approved the sprint. Bar: a recruiter opens it from chaseholroyd.com and it works, looks finished and tells one true story in under 2 minutes.
- Why: the app is a portfolio piece.
- Beat: more features first.
- Source: `docs/reviews/2026-10-22-recruiter-ready.md`.

**ES-DEC-7 (2026-10-23): add "See every color".**
- Call: Chase chose "Add the button".
- Why: one tap from the Always Grey note turns it off and re-scans.
- Beat: leaving the note with no way out.
- Source: 37d75fa, `HANDOFF.md` Decisions to review.

**ES-DEC-8 (2026-10-23): ship the stack as one PR.**
- Call: Chase merged PR #16 ("ok 1") after stack #25 to #28 was collapsed into it.
- Why: one merge put the sprint, round 4 fixes and hardening (ES-R1 to R46) live.
- Beat: merging four stacked PRs one by one.
- Source: 37d75fa, `HANDOFF.md` Done (Power Hour 2).

**ES-DEC-9 (2026-10-24): night shift goal is recruiter readiness.**
- Call: "Prioritize sharing with a recruiter readiness. Move past blockers. Improve the ui".
- Why: get the live app share-ready for recruiters.
- Beat: waiting on Chase for each blocker. Under this steer the night shift turned Always Grey off for first visits (ES-R61). That one was the agent's call; it is still in Decisions to review.
- Source: 37d75fa, `HANDOFF.md` Done (Oct 24), `src/app.test.ts` ES-R61 test.

**ES-DEC-10 (2026-10-29): write the review loop down as a skill.**
- Call (paraphrase): Chase asked for the review-rounds skill and approved the merge.
- Why: reuse the round, P0 to P2 and stop-rule loop that ran ES-R1 to R68.
- Beat: keeping the loop only in review files.
- Source: 97e9adf, `HANDOFF.md` Done (Oct 29).

**ES-DEC-11 (2026-11-01): pin the CI test job to ubuntu-24.04.**
- Call (paraphrase, recorded as "Chase's call"): pin the runner rather than wait.
- Why: `ubuntu-latest` moved to 26.04, where Playwright 1.56.1 can't install Chromium.
- Beat: upgrading Playwright now (it is pinned to match the sandbox's preinstalled Chromium). Unpin once a Playwright upgrade supports 26.04.
- Source: dd77f51, `.github/workflows/ci.yml`.

## Lessons

Newest first.

**2026-11-01: a moving runner label broke CI.** `ubuntu-latest` moved to 26.04 on Oct 31 and `npx playwright install --with-deps chromium` failed there, so every PR's e2e went red with no code change. Why: CI used a floating label, and Playwright is pinned to 1.56.1. Guard: the test job runs on `ubuntu-24.04`, with a comment saying why and when to unpin (dd77f51, `ci.yml`). Rule: pin runner images for jobs that install browsers.

**2026-10-29: the agent run could not be proven.** A cloud session could not load the repo's `.claude/agents`, so qa-tdd could not run as an agent. Why: the Agent tool offered only built-in types there. Guard: the PR said `qa-tdd skipped` and the suites ran 3x by hand; no run-log line was hand-written. Rule: never edit `.claude/agent-runs/` by hand (`CLAUDE.md`, `HANDOFF.md` Decisions to review).

**2026-10-24: a layout fix caused a regression.** The ES-R46 fix (palm pad stays put on wide screens) left the palm reading left-aligned under a centred pad. Round 6 caught it as ES-R47 (P1). Why: a `.reading-card` margin rule was not scoped to photo mode. Guard: a failing e2e test first (`e2e/smoke.spec.ts` ES-R47), and every round re-checks every screen, now written down in `.claude/skills/review-rounds/SKILL.md` (30a9c24, `docs/reviews/2026-10-24-recruiter-ui.md`).

**2026-10-23: real phone photos broke what tests passed.** Chase's iPhone shots of real photos showed mosaic tiles and a jagged fringe at the mask edge (ES-R21, P0), a glow that washed the room white (R22), and an aura on a second person and a ceiling fan (R23). Why: tests ran on synthetic images and the illustrated sample in software GL; Safari's GPU path is the likely cause of the tiles (inferred, not confirmed). Guard: mask refinement, Safari on the CPU path, main-person filter (59f369e). The fixes still need Chase's iPhone rescan (AC-R21a, R22b, R23b, R28). His photos were reviewed but never committed; the review lists them as "private, not in repo" (`docs/reviews/2026-10-23-ui-review.md`).

**2026-10-23: a page left open overnight kept last night's steps.** ES-R36 (P0): the steps never reset if the tab stayed open, and unticking one wrote last night's ticks into tonight. Why: tonight's steps were loaded once at mount and never reloaded when the night changed; phones restore open tabs. Guard: failing test first (`src/app.test.ts`, "ES-R36 starts a fresh night…"), then the fix (ee42dd9, `docs/reviews/2026-10-23-hardening.md`).

**2026-10-21 to now: "live" was claimed from a green deploy.** HANDOFF said "Live app" and marked ES-M2.2 done because the Pages run succeeded (328cd48), and later "live since Oct 23" from Actions "pages" #4 (37d75fa). Nobody loaded the page: chaseholroyd.com is blocked in the sandbox. PLAN's done-criterion for M2.2 was "the link loads on a phone". Why: a deploy run was taken as proof. Guard: reviews now say "Not checked live" when they ran on a local build (`docs/reviews/2026-10-22-recruiter-ready.md`, `2026-10-24-recruiter-ui.md`); Chase's 60-second phone check of the live site is in `HANDOFF.md` waiting_on_chase. Rule: say "deployed" until someone has loaded the page.

**2026-10-22: the public story went stale.** The README's only screenshot was the pre-bedtime v1 screen (ES-R2, P0), CASE-STUDY.md told the old story (ES-R3, P0), and HANDOFF said portfolio PR #8 was still waiting after it had merged (ES-R7). Why: copy and screenshots were not regenerated when the product changed. Guard: `npm run screenshots` rebuilds README shots and `public/og.png` from the illustrated sample (6a08c1c); review-rounds counts "stale or false public claim" as P0.

**2026-10-21 to 22: no publishable photo, so no aura shown.** M1.5 (portfolio pack) was blocked on a publishable photo, and a recruiter with no photo could never see the aura (ES-R1, P0). Why: the hard rule bans photos of real people in this public repo. Guard: an illustrated child drawn in code, labeled "Illustrated sample, not a real person", runs through the real model; the e2e happy path and screenshots use it (30b6cdd, `samples/SOURCES.md`).

## Marketing claims register

Owned by positioning. Public copy only uses claims listed here.

| Claim we can make today | Proof |
|---|---|
| Photos never leave your device; no uploads | CSP `connect-src 'self'` in `vite.config.ts`; `e2e/smoke.spec.ts` (CSP blocks other origins); `e2e/aura.spec.ts` (every request stays on the app's origin) |
| The AI runs on your device, not in the cloud | `src/segment/mediapipe.ts`; model in `public/models/`, runtime copied to `public/mediapipe/` |
| Not even a CDN sees a request | Model and wasm served from the app's own origin (`mediapipe.ts`, `scripts/copy-mediapipe-wasm.mjs`); `e2e/aura.spec.ts` origin check |
| No server, account, analytics or cookies | Static Vite build, one runtime dependency (`package.json`); CSP |
| A 250 KB person-segmentation model | `public/models/selfie_segmenter.tflite` (249,537 bytes) |
| Try it with no photo: an illustrated sample, not a real person | `src/photo/sample.ts`; `e2e/aura.spec.ts` sample test; `samples/SOURCES.md` |
| No real person's photo is published | `samples/SOURCES.md`; `CLAUDE.md` hard rule |
| Save the aura as an image or a 4-second video, and share it | `src/export/export.ts`; `e2e/aura.spec.ts` (Save image, Save video) |
| WebGL2 aura with a Canvas 2D fallback | `src/aura/renderer.ts`; ES-R37 fix (993e431) |
| Lint, typecheck, unit and real-browser tests on every pull request | `.github/workflows/ci.yml` (ES-R9, eadb863) |
| 68 review findings (ES-R1 to R68) fixed, each with a failing test first | `docs/reviews/*.md`; `HANDOFF.md` Done (round 7: nothing at P2 or above left) |
| Accessible: 44px targets, AA contrast on main buttons, keyboard scan switch | ES-R11, R19, R29, R34 in `docs/reviews/`; b1ca32f, e476b7a |
| Open source, MIT | `LICENSE`; `THIRD_PARTY_NOTICES.md` |

**Not yet claimable:**
- "Live and works on your phone": the live site has not been loaded by anyone on record. Wait for Chase's phone check.
- "Clean edges on real photos": ES-R21 to R23 and R28 still need his iPhone rescan.
- Any claim that the scan measures something about a person: README says it "does not measure anything about a person".
