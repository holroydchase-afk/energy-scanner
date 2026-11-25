# SPEC: Portfolio site header on the demo (intake #60)

Task: ES-M2.6 (Polish Freeze: UI polish, no new app behavior). Status: todo. **Live demo change: merge waits for Chase's go.**

## Bet
Visitors who land on chaseholroyd.com/energy-scanner/ from the portfolio get stuck: no nav back, and the demo doesn't look like the site (Chase, Nov 24, via the portfolio thread). One same-origin tag gives them the shared 52px site header. (It no longer forces a white page: see SH-R1 below.) It works if a visitor can get back to the site from the demo in one tap, and the demo still works (camera, Choose a photo, See the aura demo, footer links) under the shorter viewport.

## Change
In `index.html`, add exactly this line just before `</body>`, after the existing module script:

```html
<script src="/assets/demo-bar.js" defer></script>
```

The tag **no longer carries `data-page="white"`** (ux-reviewer SH-R1, P0: that attribute forced a white page under the app's own dark theme, leaving the title at about 1.2:1 contrast). The demo keeps its own light and dark themes and the bar keeps its own.

One CSS change in `src/style.css` (ux-reviewer SH-R2, P1): a `:root:has(#site-bar) { --site-bar-h: 52px; }` rule by the other `:root` rules, and `scroll-margin-top` on `.mode` and `.stage` becomes `calc(var(--site-bar-h, 0px) + var(--space-md))`, so what the app scrolls to clears the fixed bar when it is there and is unchanged when it is not. No app code, no CSP, no new dependency. The script lives on the portfolio origin (portfolio PR 103), so it **404s locally, in `vite preview` and in e2e**. That's expected and must not break anything.

## Acceptance criteria
Unit tests read `index.html` from source, and `dist/index.html` after `npm run build` (skip the dist cases with a clear message if `dist/` is missing; CI builds before e2e).

| ID | Type | Given / When / Then |
|---|---|---|
| AC-SH1 | auto | Given source `index.html` and built `dist/index.html`, when parsed, then each has exactly one `<script>` whose `src` ends in `demo-bar.js`. |
| AC-SH2 | auto | Given that tag in both files, then `src` is exactly `/assets/demo-bar.js`: a root path on the same origin, with no scheme or host, not `./assets/...` and no build hash. The build must not rewrite it. With `base: './'`, the path `./assets/` would 404 under /energy-scanner/. |
| AC-SH3 | auto | Given that tag in both files, then it has the `defer` attribute, has no `type="module"` and no `async`, and sits after the app's module script, as the last script before `</body>`. |
| ~~AC-SH4~~ | — | **Replaced by AC-SH9** (SH-R1, P0). It required `data-page="white"`, which forced the white page. |
| AC-SH9 | auto | Given that tag in source `index.html` and built `dist/index.html`, then it has no `data-page` attribute at all, and still has `src="/assets/demo-bar.js"` and `defer`. |
| AC-SH5 | auto | Given `CSP` exported from `vite.config.ts` and the CSP meta tag in `dist/index.html`, then both equal the current string byte for byte, and `script-src` lists `'self'` with no host, scheme or `*`. The meta keeps `'wasm-unsafe-eval'`, which is already there. Pin the current string in the test so any later change fails it. |
| AC-SH6 | auto | Given the demo-bar request fails with a 404, or returns HTML through the preview server's fallback, when e2e runs, then the existing suites pass with no `pageerror`, `e2e/smoke.spec.ts` included. The app renders and See the aura demo produces a reading. If `vite preview` serves `index.html` for the missing file, the e2e should stub the script as an empty 404 with `page.route('**/assets/demo-bar.js', ...)`. Never change app code to handle this. |
| AC-SH7 | auto | Given `src/` and `index.html`, then no other new external URL or host appears (grep for `http` in script, link and fetch targets is unchanged). |
| AC-SH8 | manual | Given the live demo after the go, at 1280 and 390 wide, light and dark, then the header shows with no sideways scroll; Palm/Photo, Take a photo, Choose a photo, See the aura demo, Grown-ups and the footer links all work; the reading isn't hidden under the sticky 52px header. Screenshots before and after go in the PR. |
| AC-SH10 | auto (e2e) | Given a fixed 52px `#site-bar` on the page (a stub stands in for the real portfolio bar, which 404s under `vite preview`), when See the aura demo is tapped at 1280 wide, then the Palm/Photo switch (`.mode`) sits at or below 52px, not under the bar; and with no `#site-bar`, it is still scrolled into view with the unchanged 0px fallback. |

## Out of scope (Polish Freeze)
- The info drawer that replaces the per-demo strip (the ccwatts mock): parked until Chase approves it.
- Restyling the demo's own page background or tokens to match the site. The demo keeps its own light and dark themes (SH-R1 dropped `data-page="white"`).
- Hosting a local copy of `demo-bar.js` for dev. It stays a 404 off-origin.

## Ship
One small PR from `claude/intake-60-site-header`. Order: qa-tdd writes AC-SH1 to SH7 (red), engineer adds the tag, qa-tdd runs green 3x, privacy-security confirms the same-origin script and an unchanged CSP, ux-reviewer checks AC-SH8 on the preview. List it in the open-PR merge order for Chase's go, and don't merge before. Afterwards, comment the PR link on #60.

## Fix round (ux-reviewer, Nov 25)
- **SH-R1 (P0, fixed):** `data-page="white"` painted the page white whenever the bar's own theme was light (its default), even with the app in its dark theme, leaving the title at about 1.2:1. Fix: drop the attribute. Test: AC-SH9 (`src/site-header.test.ts`), which replaces AC-SH4.
- **SH-R2 (P1, fixed):** after See the aura demo the Palm/Photo switch scrolled under the fixed 52px bar. Fix: the one CSS change above. Test: AC-SH10 (`e2e/site-header.spec.ts`).
