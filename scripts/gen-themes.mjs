// Writes the Paper color vars into src/style.css from src/design/theme.ts (ES-M2.4, DS-4), so the
// stylesheet's colors are computed, never hand-typed. Run with `npm run themes` (Node 22.18+ runs the
// .ts file directly). The block sits between the BEGIN/END markers in style.css; nothing else changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { paletteFor } from '../src/design/theme.ts';

const CSS = fileURLToPath(new URL('../src/style.css', import.meta.url));
const BEGIN = '/* BEGIN generated colors (scripts/gen-themes.mjs) */';
const END = '/* END generated colors */';
const KEYS = ['bg', 'surface', 'ink', 'muted', 'line', 'fill', 'accent', 'accentInk', 'accentSoft', 'safe', 'safeSoft', 'danger', 'dangerText', 'onDanger', 'tabLine', 'scrim', 'photo'];
const kebab = (k) => `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

function vars(dark, high, indent) {
  const c = paletteFor(dark, high);
  const lines = [`color-scheme: ${dark ? 'dark' : 'light'};`, ...KEYS.map((k) => `${kebab(k)}: ${c[k]};`)];
  return lines.map((l) => `${indent}${l}`).join('\n');
}

// Each look gets one winning rule, all at the same specificity, so source order decides:
// phone setting first, then the Look picked in Grown-ups (html[data-theme]), then more contrast.
const AUTO = ':root:not([data-theme])';
const LIGHT = `${AUTO}, :root[data-theme='light']`;
const DARK = ":root[data-theme='dark']";
const block = `${BEGIN}
/* Paper, the studio theme. Base colors from src/design/tokens.json; light, dark and high contrast
   derived by src/design/theme.ts (recipe: STUDIO-CORE.md section 3). Do not edit by hand. */
${LIGHT} {
${vars(false, false, '  ')}
}
${DARK} {
${vars(true, false, '  ')}
}
@media (prefers-color-scheme: dark) {
  ${AUTO} {
${vars(true, false, '    ')}
  }
}
@media (prefers-contrast: more) {
  ${LIGHT} {
${vars(false, true, '    ')}
  }
  ${DARK} {
${vars(true, true, '    ')}
  }
}
@media (prefers-contrast: more) and (prefers-color-scheme: dark) {
  ${AUTO} {
${vars(true, true, '    ')}
  }
}
${END}`;

const css = readFileSync(CSS, 'utf8');
const start = css.indexOf(BEGIN);
const end = css.indexOf(END);
if (start < 0 || end < start) throw new Error(`style.css needs the ${BEGIN} and ${END} markers`);
const next = css.slice(0, start) + block + css.slice(end + END.length);
if (next !== css) writeFileSync(CSS, next);
console.log(next === css ? 'style.css colors already current' : 'style.css colors updated');
