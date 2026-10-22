# Recruiter-ready review: Energy Scanner (2026-10-22)

Sprint: Recruiter-Ready Sprint v2 (Chase approved 2026-10-22). Bar: a recruiter or hiring manager opens Energy Scanner from chaseholroyd.com and it works, looks finished, and tells one clear, true story in under 2 minutes, on phone and laptop, with sample data and no login.

## How it was reviewed
- **Build:** local production build (`npm run build`, `vite preview`), and the same `dist` served under `/energy-scanner/` to match Pages.
- **Screens:** home (palm), palm reading, "too fast", all steps done, photo start, photo with no person, photo error, grown-ups open, photo aura (illustrated figure). Shot with Playwright at 390x844 and 1280x800, light and dark, viewport and full page. Every screenshot was opened. The app is dark-only by design (night theme, `color-scheme: dark`), so light mode renders the same.
- **Lenses:** ux-reviewer showcase review (studio-agents PR #6 version), qa-tdd, staff-pm triage.
- **Personas, least tech-savvy first:**
  1. A tired parent at bedtime with a 5-year-old (the product's own user).
  2. A non-technical recruiter on a phone with 90 seconds.
  3. A hiring manager on a laptop with 5 minutes.
- **Measured:** console errors (none, only SwiftShader GL warnings), failed or 4xx requests (none, including the model and wasm under `/energy-scanner/`), horizontal scroll (none at 390), target sizes, font sizes. **Inferred:** feel on a real iPhone (confirm with a real user).
- **Not checked live:** chaseholroyd.com is not reachable from this sandbox, so the live site was not loaded. Everything here ran on a local build of the same code.

## QA results (qa-tdd)
- Unit suite run 3 times: 82/82 each time. E2E run 3 times: 8 passed, 1 skipped each time. No flakes.
- Demo build, then link and asset crawl under `/energy-scanner/`: 11 requests, no 4xx/5xx, no page errors.
- Flows: steps persist across reload, scan mode is remembered, "Clear tonight's steps" resets.
- **Gap:** the photo happy path (aura, Save image, Save video) only runs with a private `SAMPLE_PHOTO`, so it never runs in CI. **Gap:** no CI runs the tests on pull requests (only `handoff-check`; Pages runs `npm run check` after merge).

## Findings
P0 blocks showing it, P1 hurts the impression, P2 polish. Status: open, fixed (PR), or decision.

| ID | P | Screen | Problem | Fix and acceptance criteria | Status |
|---|---|---|---|---|---|
| ES-R1 | P0 | Photo scan | A recruiter has no photo of a person handy (and won't upload their own), so they can never see the aura, the product's best moment. Nielsen 6 (recognition), 7 (flexibility). | Add **Try the sample** on the photo start screen: an illustrated person drawn in code (not a photo, no real person) goes through the real on-device scan. AC: one tap shows the aura and a reading; the photo is labeled "Illustrated sample, not a real person"; e2e covers it. | fixed (m2.7-sample-photo) |
| ES-R2 | P0 | README | The only screenshot is the pre-bedtime v1 start screen (no steps, no palm scan, no aura). Stale and contradicts the copy. | Regenerate screenshots of the current app: home, palm reading and photo aura (sample), phone and laptop. AC: README shows the aura; the stale image is gone; images are under 400 KB each. | open |
| ES-R3 | P0 | CASE-STUDY.md | Tells the old story (a friend's photo, an energy type auto-picked from colors, an in-page camera, "five milestones"). Contradicts the README, the app and the portfolio page. | Rewrite around the bedtime story: problem, constraints, decisions (routine first, privacy before camera, on-device segmentation, native camera, Always Grey), how it was built, what's next. AC: no feature or claim that the app doesn't have. | open |
| ES-R4 | P0 | Every screen | No way back to chaseholroyd.com, and nothing says what this is or who it's for. Showcase rule: "a way back to the portfolio". | Under the title, a one-line tagline "A bedtime helper for kids: finish the steps, then scan." In the footer, "A portfolio project by Chase Holroyd" linking to the Energy Scanner page, plus "Code on GitHub". AC: both links resolve; 44px targets; visible on phone without scrolling the header. | fixed (m2.8-ui-polish) |
| ES-R5 | P1 | Grown-ups | Targets too small: the Grown-ups toggle is 14px tall, the checkbox 13px, the range 16px, time input 35px, Clear 36px (WCAG 2.2 2.5.8; studio rule 44-48px). | Make each at least 44px tall (the checkbox row is the target). AC: measured at 390 and 1280. | fixed (m2.8-ui-polish) |
| ES-R6 | P1 | Reading card | Always Grey is on by default, so every scan reads Grey. A recruiter tries twice, sees the same result, and never learns the other colors exist. | Keep the default (it is the parent feature). When Always Grey is on, the card adds "Always Grey is on. Turn it off under Grown-ups to see every color." AC: shown only when the switch is on; unit test. | fixed (m2.9-copy) |
| ES-R7 | P1 | HANDOFF.md | Says portfolio PR #8 is waiting on Chase; it merged on Oct 21 (STUDIO-STATUS agrees it's merged). | Update HANDOFF "Portfolio / public presence" and PLAN. | fixed (this PR) |
| ES-R8 | P1 | Tests | The photo happy path never runs in CI (needs a private photo). | Run the happy path on the illustrated sample (ES-R1), always. AC: e2e saves an image and a video from the sample. | fixed (m2.7-sample-photo) |
| ES-R9 | P1 | CI | Pull requests aren't tested; a broken PR is only caught after merge by the Pages build. | Add a `ci` workflow on pull requests: `npm ci`, `npm run check`, `npm run build`, Playwright Chromium e2e. | open |
| ES-R10 | P2 | Reading card | At Grey, "Battery almost empty" sits next to "To drain the battery: Bath, PJs…", which reads as a contradiction. | Change to "Still to do: Bath, PJs, Teeth, Potty, Book. Then scan again." AC: unit test for `todoLine`. | fixed (m2.9-copy) |
| ES-R11 | P2 | Header, steps, Grown-ups | Text below 15px: section labels 12px, step labels 12.8px, clock 13.6px. | Labels 14px minimum, step labels 14px, body 16px+. AC: no visible text under 14px. | fixed (m2.8-ui-polish) |
| ES-R12 | P2 | Header (phone) | "bedtime 8:00 PM" wraps so "PM" sits alone on a line. | Keep the bedtime line on one line (`white-space: nowrap`). | fixed (m2.8-ui-polish) |
| ES-R13 | P2 | Grown-ups | "Clear tonight's steps" renders in the browser's default font. | Inherit the app font. | fixed (m2.8-ui-polish) |
| ES-R14 | P2 | Photo error | "That file is not an image." doesn't say what to do (Nielsen 9). | "That file is not an image. Choose a photo (JPG, PNG or HEIC)." | fixed (m2.9-copy) |
| ES-R15 | P2 | Reading card | The level text repeats the heading ("Grey Energy" then "Grey energy. The scanner says…"). | Drop the repeated name at the start of each level text. | fixed for Grey (m2.9-copy); the other levels' openers ("Red rocket!", "Blue moon.") are the original playful voice and stay |
| ES-R16 | P2 | Sharing | No Open Graph image or title, so a shared link shows a bare URL. | Add `og:` tags and a 1200x630 preview image made from the sample aura. | open |

## Decisions to review (Chase)
- **Always Grey default:** kept on (it's the parent feature). ES-R6 adds a hint instead. Alternative: default it off on the public demo.
- **Dark-only:** the app ignores light mode on purpose (bedtime, night theme).
- **Illustrated sample:** a person drawn in code, labeled as illustrated, so no real person is shown. It runs through the real model (checked: the on-device segmenter finds it).

## For the portfolio (intake for Product Studio)
Once ES-R1/ES-R2 land: the portfolio's Energy Scanner page can use `docs/screenshots/aura-mobile.png` (the illustrated sample with the aura) for WEB-M4.7.

## Rounds
- **Round 0 (review):** 16 findings: 4 P0, 5 P1, 7 P2.
