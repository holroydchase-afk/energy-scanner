# Design tokens (ES-M2.4)

`tokens.json` is a byte-for-byte copy of the studio design core's token export: Hearth's `tokens.json`
(generated from Hearth `app/src/ui/theme.ts`), as shared with STUDIO-CORE.md, last checked Nov 21, 2026.
Do not edit it by hand; re-copy it when the studio core changes.

`theme.ts` is this repo's own code (MIT), written from the recipe in STUDIO-CORE.md section 3 and the
public WCAG 2 contrast formula. It is not a port of Hearth's `theme.ts` (AGPL), so no Hearth code is copied.
It derives the Paper light, dark and high-contrast colors from the 7 base colors in `tokens.json`.
`npm run themes` (`scripts/gen-themes.mjs`) writes them into the marked block at the top of `src/style.css`.

Tests that read these files: `src/design/design-system.test.ts` (DS-1 to DS-5, DS-7, DS-8, DS-11, DS-12, DS-14)
and `e2e/design-system.spec.ts` (DS-4 to DS-11, DS-14).
