// @vitest-environment node
/**
 * Intake #50, studio wiring (docs/product/SPEC-STUDIO-WIRING.md, AC-SW1..SW8).
 * These tests check the repo's agent scripts, CI workflow and CLAUDE.md, not the app.
 * Anything that writes (SW3, SW4, SW5) runs in a throwaway temp dir and never touches this repo's git branch.
 * SW6 (full section diff) and SW8 compare against a studio-agents checkout at $STUDIO_AGENTS_DIR and skip
 * when it is unset (CI has no checkout); a non-skipped SW6 check still asserts the key CLAUDE.md rules.
 * Not automated here: AC-SW9 (PR diff vs the default branch: a review/CI step on the PR, not a unit test),
 * AC-SW10 (lint/typecheck/test/handoff-check: the commands themselves, run before every push), and
 * AC-SW11 (manual: the next code PR's Agents: line and log).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const STUDIO = process.env.STUDIO_AGENTS_DIR;
const AGENTS_DIR = join(ROOT, '.claude/agents');

const temps: string[] = [];
function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), 'studio-wiring-'));
  temps.push(d);
  return d;
}
afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

function run(cmd: string, args: string[], opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  const r = spawnSync(cmd, args, { cwd: opts.cwd ?? ROOT, env: { ...process.env, ...opts.env }, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', out: (r.stdout ?? '') + (r.stderr ?? '') };
}

/** Copies the given repo scripts and every .claude/agents file into a fresh temp dir. */
function sandbox(scripts: string[]): string {
  const d = tempDir();
  mkdirSync(join(d, 'scripts'), { recursive: true });
  mkdirSync(join(d, '.claude/agents'), { recursive: true });
  for (const s of scripts) copyFileSync(join(ROOT, 'scripts', s), join(d, 'scripts', s));
  for (const f of readdirSync(AGENTS_DIR)) copyFileSync(join(AGENTS_DIR, f), join(d, '.claude/agents', f));
  return d;
}

/** The text of a `## <heading>` section, up to the next `## ` heading or end of file, trailing space trimmed. */
function section(md: string, heading: string): string {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${heading}`));
  if (start < 0) return '';
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end < 0) end = lines.length;
  return lines.slice(start, end).join('\n').trimEnd();
}

describe('AC-SW1/SW2 agent-prompt.sh', () => {
  it('AC-SW1 builds a qa-tdd prompt that logs itself and carries the task', () => {
    const r = run('bash', ['scripts/agent-prompt.sh', 'qa-tdd', 'test']);
    expect(r.status, r.out).toBe(0);
    expect(r.stdout.trim()).not.toBe('');
    expect(r.stdout).toContain('log-agent-run.sh --as qa-tdd');
    expect(r.stdout.split('\n')).toContain('test');
  });

  it('AC-SW2 refuses an unknown agent', () => {
    const r = run('bash', ['scripts/agent-prompt.sh', 'nope', 'x']);
    expect(r.status).not.toBe(0);
  });
});

describe('AC-SW3 log-agent-run.sh --as', () => {
  it('AC-SW3 appends "<ISO-UTC> qa-tdd via-general-purpose" to the temp branch log', () => {
    const d = sandbox(['log-agent-run.sh']);
    execFileSync('git', ['init', '-q', '-b', 'feature/sw3'], { cwd: d });
    const r = run('bash', ['scripts/log-agent-run.sh', '--as', 'qa-tdd'], { cwd: d });
    expect(r.status, r.out).toBe(0);
    const log = join(d, '.claude/agent-runs/feature-sw3.log');
    expect(existsSync(log)).toBe(true);
    const lines = readFileSync(log, 'utf8').split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z qa-tdd via-general-purpose$/);
  });
});

describe('AC-SW4 check-agent-runs.sh accepts via-general-purpose runs', () => {
  function check(logLines: string[], body: string) {
    const d = sandbox(['check-agent-runs.sh']); // no studio-checks.json here, so no verify rerun
    mkdirSync(join(d, '.claude/agent-runs'), { recursive: true });
    writeFileSync(join(d, '.claude/agent-runs/feature-sw4.log'), logLines.map((l) => l + '\n').join(''));
    return run('bash', ['scripts/check-agent-runs.sh'], { cwd: d, env: { BODY: body, HEAD_REF: 'feature/sw4' } });
  }

  it('AC-SW4 passes when the log only has "<time> qa-tdd via-general-purpose"', () => {
    const r = check(['2026-11-22T04:46:03Z qa-tdd via-general-purpose'], 'Summary\n\nAgents: qa-tdd red then green, 3x\n');
    expect(r.status, r.out).toBe(0);
  });

  it('AC-SW4 fails naming qa-tdd when it is missing from the log', () => {
    const r = check(['2026-11-22T04:45:20Z staff-pm via-general-purpose'], 'Agents: qa-tdd red then green, 3x\n');
    expect(r.status).not.toBe(0);
    expect(r.out).toContain("'qa-tdd'");
  });
});

describe('AC-SW5 agents-check: qa-tdd cannot be skipped on a code PR', () => {
  const yml = readFileSync(join(ROOT, '.github/workflows/agents-check.yml'), 'utf8');

  /** The `run: |` shell of the "Agents line in the PR body" step. */
  function stepShell(): string {
    const lines = yml.split('\n');
    const at = lines.findIndex((l) => /- name: Agents line in the PR body\s*$/.test(l));
    if (at < 0) return '';
    const runAt = lines.findIndex((l, i) => i > at && /^\s*run: \|\s*$/.test(l));
    if (runAt < 0) return '';
    const indent = (lines[runAt]!.match(/^\s*/)![0].length);
    const body: string[] = [];
    for (let i = runAt + 1; i < lines.length; i++) {
      const l = lines[i]!;
      if (l.trim() !== '' && l.match(/^\s*/)![0].length <= indent) break;
      body.push(l.slice(indent + 2));
    }
    return body.join('\n');
  }

  /** Runs the step with a stub `git` whose diff lists `changed` and the given PR body. */
  function runStep(body: string, changed: string[]) {
    const d = tempDir();
    const bin = join(d, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'git'), `#!/usr/bin/env bash\nprintf '%s\\n' ${changed.map((c) => `'${c}'`).join(' ')}\n`);
    chmodSync(join(bin, 'git'), 0o755);
    writeFileSync(join(d, 'step.sh'), stepShell());
    return run('bash', ['-e', join(d, 'step.sh')], {
      cwd: d,
      env: { BODY: body, BASE: 'base', HEAD: 'head', PATH: `${bin}:${process.env.PATH ?? ''}` },
    });
  }

  it('AC-SW5 the step exists and states the rule', () => {
    expect(stepShell()).not.toBe('');
    expect(yml).toContain('qa-tdd cannot be skipped');
  });

  it('AC-SW5 a code PR with "qa-tdd skipped: no time" fails', () => {
    const r = runStep('Agents: staff-pm scoped it; qa-tdd skipped: no time', ['src/app.ts']);
    expect(r.status, r.out).not.toBe(0);
  });

  it('AC-SW5 a code PR with "qa-tdd skipped: docs only" passes', () => {
    const r = runStep('Agents: staff-pm scoped it; qa-tdd skipped: docs only', ['src/app.ts']);
    expect(r.status, r.out).toBe(0);
  });

  it('AC-SW5 a code PR where qa-tdd ran passes', () => {
    const r = runStep('Agents: qa-tdd red then green, 3x', ['src/app.ts']);
    expect(r.status, r.out).toBe(0);
  });
});

describe('AC-SW6 CLAUDE.md Studio agents section', () => {
  const claude = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
  const studio = section(claude, 'Studio agents');

  it('AC-SW6 has the release-captain row and the two new rules', () => {
    expect(studio).toMatch(/^\| .+ \| `release-captain` \|$/m);
    expect(studio).toContain('Open every thread the same way');
    expect(studio).toContain('Agents come from studio-agents');
  });

  it('AC-SW6 Hard rules and Session rules are unchanged from the last commit', () => {
    const r = run('git', ['show', 'HEAD:CLAUDE.md']);
    if (r.status !== 0) return; // no git history available (e.g. an exported tree): nothing to compare
    for (const h of ['Hard rules', 'Session rules']) {
      expect(section(claude, h), h).toBe(section(r.stdout, h));
      expect(section(claude, h), h).not.toBe('');
    }
  });

  it.skipIf(!STUDIO)('AC-SW6 equals studio-agents templates/CLAUDE-agents.md (needs STUDIO_AGENTS_DIR)', () => {
    const template = readFileSync(join(STUDIO!, 'templates/CLAUDE-agents.md'), 'utf8').trimEnd();
    expect(studio).toBe(template);
  });
});

describe('AC-SW7 agent roster', () => {
  it('AC-SW7 check-agents.sh exits 0 and release-captain has a file', () => {
    expect(existsSync(join(AGENTS_DIR, 'release-captain.md'))).toBe(true);
    const r = run('bash', ['scripts/check-agents.sh']);
    expect(r.status, r.out).toBe(0);
  });
});

describe('AC-SW8 agents match studio-agents', () => {
  it.skipIf(!STUDIO)('AC-SW8 every .claude/agents/*.md is byte-identical to studio-agents (needs STUDIO_AGENTS_DIR)', () => {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const theirs = join(STUDIO!, '.claude/agents', f);
      expect(existsSync(theirs), `${f} missing from studio-agents`).toBe(true);
      expect(readFileSync(join(AGENTS_DIR, f)).equals(readFileSync(theirs)), `${f} differs from studio-agents`).toBe(true);
    }
  });
});
