/**
 * Intake #60, portfolio site header (docs/product/SPEC-SITE-HEADER.md, AC-SH1..SH7).
 * Reads index.html from source and dist/index.html from the last `npm run build`.
 * The dist cases skip, with the reason in their title, when dist/ is missing (CI builds before e2e).
 * AC-SH6 (404 / preview fallback does not break the app) is e2e: e2e/site-header.spec.ts.
 * AC-SH8 is manual (live demo at 1280 and 390, light and dark; screenshots in the PR).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CSP } from '../vite.config';

const ROOT = resolve(__dirname, '..');
const SOURCE = join(ROOT, 'index.html');
const DIST = join(ROOT, 'dist/index.html');
const HAS_DIST = existsSync(DIST);
const DEMO_BAR_SRC = '/assets/demo-bar.js';

/** The CSP as of intake #60. The header tag must not need any change to it. */
const PINNED_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' blob: data:; media-src 'self' blob: mediastream:; connect-src 'self' blob: data:; " +
  "worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'";

function parse(file: string): Document {
  return new DOMParser().parseFromString(readFileSync(file, 'utf8'), 'text/html');
}

function demoBarTags(doc: Document): HTMLScriptElement[] {
  return [...doc.querySelectorAll('script')].filter((s) => (s.getAttribute('src') ?? '').endsWith('demo-bar.js'));
}

const files: { name: string; path: string; skip: boolean }[] = [
  { name: 'source index.html', path: SOURCE, skip: false },
  { name: HAS_DIST ? 'built dist/index.html' : 'built dist/index.html (skipped: dist/ missing, run npm run build)', path: DIST, skip: !HAS_DIST },
];

for (const f of files) {
  describe.skipIf(f.skip)(`site header tag in ${f.name}`, () => {
    it('AC-SH1 has exactly one script whose src ends in demo-bar.js', () => {
      expect(demoBarTags(parse(f.path))).toHaveLength(1);
    });

    it('AC-SH2 src is exactly /assets/demo-bar.js (same-origin root path, no scheme, host, ./ or hash)', () => {
      const tags = demoBarTags(parse(f.path));
      expect(tags).toHaveLength(1);
      expect(tags[0]!.getAttribute('src')).toBe(DEMO_BAR_SRC);
    });

    it('AC-SH3 is deferred, classic (no type=module, no async), and the last script, after the app module script', () => {
      const doc = parse(f.path);
      const tags = demoBarTags(doc);
      expect(tags).toHaveLength(1);
      const tag = tags[0]!;
      expect(tag.hasAttribute('defer')).toBe(true);
      expect(tag.hasAttribute('async')).toBe(false);
      expect(tag.getAttribute('type')).toBeNull();
      expect(tag.parentElement?.tagName).toBe('BODY');
      const scripts = [...doc.querySelectorAll('script')];
      expect(scripts.at(-1)).toBe(tag);
      const appModule = scripts.find((s) => s.getAttribute('type') === 'module');
      expect(appModule).toBeDefined();
      expect(scripts.indexOf(appModule!)).toBeLessThan(scripts.indexOf(tag));
    });

    it('AC-SH4 has data-page="white"', () => {
      const tags = demoBarTags(parse(f.path));
      expect(tags).toHaveLength(1);
      expect(tags[0]!.getAttribute('data-page')).toBe('white');
    });
  });
}

describe('AC-SH5 the CSP is unchanged', () => {
  it('CSP exported from vite.config.ts equals the pinned string byte for byte', () => {
    expect(CSP).toBe(PINNED_CSP);
  });

  it("script-src lists 'self' and only keywords: no host, scheme or *", () => {
    const scriptSrc = CSP.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src '));
    expect(scriptSrc).toBe("script-src 'self' 'wasm-unsafe-eval'");
    const sources = scriptSrc!.split(/\s+/).slice(1);
    expect(sources).toContain("'self'");
    for (const s of sources) expect(s).toMatch(/^'[a-z-]+'$/);
  });

  it.skipIf(!HAS_DIST)(
    HAS_DIST ? 'the CSP meta in dist/index.html equals the pinned string' : 'the CSP meta in dist/index.html (skipped: dist/ missing, run npm run build)',
    () => {
      const metas = parse(DIST).querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
      expect(metas).toHaveLength(1);
      const content = metas[0]!.getAttribute('content');
      expect(content).toBe(PINNED_CSP);
      expect(content).toContain("'wasm-unsafe-eval'");
    },
  );
});

/** Every non-test source file under src/. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|css|html)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe('AC-SH7 no new external URL or host', () => {
  it('the absolute URLs in src/ and index.html are unchanged', () => {
    const found = new Set<string>();
    for (const file of [SOURCE, ...sourceFiles(join(ROOT, 'src'))]) {
      for (const m of readFileSync(file, 'utf8').matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
        found.add(`${file.slice(ROOT.length + 1)} ${m[0]}`);
      }
    }
    expect([...found].sort()).toEqual(
      [
        'index.html https://chaseholroyd.com/energy-scanner/',
        'index.html https://chaseholroyd.com/energy-scanner/og.png',
        'src/app.ts https://chaseholroyd.com/',
        'src/app.ts https://chaseholroyd.com/energy-scanner.html',
        'src/app.ts https://github.com/holroydchase-afk/energy-scanner',
        'src/ui/icons.ts http://www.w3.org/2000/svg',
        'src/ui/icons.ts https://lucide.dev',
      ].sort(),
    );
  });

  it('no script or link in index.html points at another origin', () => {
    const doc = parse(SOURCE);
    const targets = [
      ...[...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')!),
      ...[...doc.querySelectorAll('link[href]')].map((l) => l.getAttribute('href')!),
    ];
    for (const t of targets) expect(t).not.toMatch(/^([a-z]+:)?\/\//i);
  });
});
