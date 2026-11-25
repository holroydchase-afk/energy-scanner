// @vitest-environment node
/**
 * Intake #75, shared private-data scan (AC-CP1..CP5).
 * Checks the wiring (studio-checks.json, package.json, CI) and proves the tool with a planted fake secret
 * built at runtime, so no token-shaped literal ever appears in this repo's source.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repo = resolve(__dirname, '..');
const scan = join(repo, 'scripts', 'check-private.mjs');
const temps: string[] = [];

function runScan(cwd: string) {
  const r = spawnSync('node', [scan], { cwd, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

afterEach(() => {
  while (temps.length) rmSync(temps.pop() as string, { recursive: true, force: true });
});

describe('check-private wiring', () => {
  it('AC-CP1 studio-checks.json has a top-level "private" object', () => {
    const cfg = JSON.parse(readFileSync(join(repo, 'studio-checks.json'), 'utf8'));
    expect(typeof cfg.private).toBe('object');
    expect(cfg.private).not.toBeNull();
    expect(Array.isArray(cfg.private)).toBe(false);
  });

  it('AC-CP2 package.json "check" script runs scripts/check-private.mjs', () => {
    const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
    expect(pkg.scripts.check).toContain('node scripts/check-private.mjs');
  });

  it('AC-CP3 ci.yml reaches the scan (direct step or npm run check)', () => {
    const ci = readFileSync(join(repo, '.github', 'workflows', 'ci.yml'), 'utf8');
    expect(/scripts\/check-private\.mjs|npm run check\b/.test(ci)).toBe(true);
    // npm run check only counts if the check script itself runs the scan.
    if (!/scripts\/check-private\.mjs/.test(ci)) {
      const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
      expect(pkg.scripts.check).toContain('check-private.mjs');
    }
  });
});

describe('check-private tool', () => {
  it('AC-CP4 a planted fake token fails, then passes once removed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cp-'));
    temps.push(dir);
    const git = (...a: string[]) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
    git('init', '-q');
    const secret = 'ghp_' + 'A'.repeat(36);
    const file = join(dir, 'notes.txt');
    writeFileSync(file, `token=${secret}\n`);
    git('add', 'notes.txt');

    const bad = runScan(dir);
    expect(bad.code).toBe(1);
    expect(bad.out).toMatch(/GitHub token/i);
    expect(bad.out).not.toContain(secret);

    writeFileSync(file, 'harmless text\n');
    git('add', 'notes.txt');
    const good = runScan(dir);
    expect(good.code).toBe(0);
    expect(good.out).toMatch(/clean/i);
  });

  it('AC-CP5 the scan is clean on this repo', () => {
    const r = runScan(repo);
    expect(r.out).toMatch(/clean/i);
    expect(r.code).toBe(0);
  });
});
