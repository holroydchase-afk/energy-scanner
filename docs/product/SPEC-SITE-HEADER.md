# SPEC: Portfolio site header on the demo (intake #60)

Task: ES-M2.6 (Polish Freeze: UI polish, no new app behavior). Status: todo. **Live demo change: merge waits for Chase's go.**

## Bet
Visitors who land on chaseholroyd.com/energy-scanner/ from the portfolio get stuck: no nav back, and the demo doesn't look like the site (Chase, Nov 24, via the portfolio thread). One same-origin tag gives them the shared 52px site header and a white page. It works if a visitor can get back to the site from the demo in one tap, and the demo still works (camera, Choose a photo, See the aura demo, footer links) under the shorter viewport.

## Change
In `index.html`, add exactly this line just before `</body>`, after the existing module script:

```html
<script src="/assets/demo-bar.js" data-page="white" defer></script>
```

Nothing else changes: no app code, no CSS, no CSP, no new dependency. The script lives on the portfolio origin (portfolio PR 103), so it **404s locally, in `vite preview` and in e2e**. That's expected and must not break anything.

## Acceptance criteria
Unit tests read `index.html` from source, and `dist/index.html` after `npm run build` (skip the dist cases with a clear message if `dist/` is missing; CI builds before e2e).

| ID | Type | Given / When / Then |
|---|---|---|
| AC-SH1 | auto | Given source `index.html` and built `dist/index.html`, when parsed, then each has exactly one `<script>` whose `src` ends in `demo-bar.js`. |
| AC-SH2 | auto | Given that tag in both files, then `src` is exactly `/assets/demo-bar.js`: a root path on the same origin, with no scheme or host, not `./assets/...` and no build hash. The build must not rewrite it. With `base: './'`, the path `./assets/` would 404 under /energy-scanner/. |
| AC-SH3 | auto | Given that tag in both files, then it has the `defer` attribute, has no `type="module"` and no `async`, and sits after the app's module script, as the last script before `</body>`. |
| AC-SH4 | auto | Given that tag in both files, then `data-page="white"` is present with exactly that value. |
| AC-SH5 | auto | Given `CSP` exported from `vite.config.ts` and the CSP meta tag in `dist/index.html`, then both equal the current string byte for byte, and `script-src` lists `'self'` with no host, scheme or `*`. The meta keeps `'wasm-unsafe-eval'`, which is already there. Pin the current string in the test so any later change fails it. |
| AC-SH6 | auto | Given the demo-bar request fails with a 404, or returns HTML through the preview server's fallback, when e2e runs, then the existing suites pass with no `pageerror`, `e2e/smoke.spec.ts` included. The app renders and See the aura demo produces a reading. If `vite preview` serves `index.html` for the missing file, the e2e should stub the script as an empty 404 with `page.route('**/assets/demo-bar.js', ...)`. Never change app code to handle this. |
| AC-SH7 | auto | Given `src/` and `index.html`, then no other new external URL or host appears (grep for `http` in script, link and fetch targets is unchanged). |
| AC-SH8 | manual | Given the live demo after the go, at 1280 and 390 wide, light and dark, then the header shows with no sideways scroll; Palm/Photo, Take a photo, Choose a photo, See the aura demo, Grown-ups and the footer links all work; the reading isn't hidden under the sticky 52px header. Screenshots before and after go in the PR. |

## Out of scope (Polish Freeze)
- The info drawer that replaces the per-demo strip (the ccwatts mock): parked until Chase approves it.
- Restyling the demo's own page background or tokens to match the site. `data-page="white"` is the site script's job.
- Hosting a local copy of `demo-bar.js` for dev. It stays a 404 off-origin.

## Ship
One small PR from `claude/intake-60-site-header`. Order: qa-tdd writes AC-SH1 to SH7 (red), engineer adds the tag, qa-tdd runs green 3x, privacy-security confirms the same-origin script and an unchanged CSP, ux-reviewer checks AC-SH8 on the preview. List it in the open-PR merge order for Chase's go, and don't merge before. Afterwards, comment the PR link on #60.
