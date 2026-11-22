# SPEC: Studio wiring (intake #50)

ES chore. Wire this repo to holroydchase-afk/studio-agents: agent-prompt fallback, qa-tdd enforced, Hearth's opening. Docs, agents and CI only: the built app is unchanged, so it merges on green (CLAUDE.md shipping rule). Templates: studio-agents `templates/`.

**Bet:** a cloud thread that can't load agent types still runs real, logged agents, and no code PR ships without qa-tdd. Signal: the next code PR shows qa-tdd red then green with a matching `.claude/agent-runs/<branch>.log`.

## Acceptance criteria

| ID | Type | Given / When / Then |
|---|---|---|
| AC-SW1 | auto | Given the repo, when `bash scripts/agent-prompt.sh qa-tdd test` runs, then it exits 0 and stdout is non-empty, contains `log-agent-run.sh --as qa-tdd` and the task text `test`. |
| AC-SW2 | auto | Given an unknown agent, when `bash scripts/agent-prompt.sh nope x` runs, then it exits non-zero. |
| AC-SW3 | auto | Given a temp git branch, when `bash scripts/log-agent-run.sh --as qa-tdd` runs, then `.claude/agent-runs/<branch>.log` gains one line matching `^<ISO-UTC> qa-tdd via-general-purpose$`. |
| AC-SW4 | auto | Given a log with only `<time> qa-tdd via-general-purpose` and an `Agents:` line naming qa-tdd, when `scripts/check-agent-runs.sh` runs, then it passes; with the agent missing from the log it fails naming it. |
| AC-SW5 | auto | Given `.github/workflows/agents-check.yml`, then it has the "qa-tdd cannot be skipped" step: a code PR whose Agents: line says `qa-tdd skipped: <anything but "docs only"/"config only">` fails; `qa-tdd skipped: docs only` passes. Test the step's shell logic with sample lines. |
| AC-SW6 | auto | Given CLAUDE.md, then its Studio agents section equals `templates/CLAUDE-agents.md` (diff empty): includes the `release-captain` row, "Open every thread the same way" and "Agents come from studio-agents" rules. Hard rules and Session rules sections unchanged. |
| AC-SW7 | auto | Given the repo, when `bash scripts/check-agents.sh` runs, then it exits 0 (every table row has a `.claude/agents/` file, including `release-captain.md`, and vice versa). |
| AC-SW8 | auto | Given `.claude/agents/*.md`, then each is byte-identical to studio-agents (sync output); no hand edits. |
| AC-SW9 | auto | Given the PR diff, then no app file changes: nothing under `src/` except the new test file `src/studio-wiring.test.ts` (a test, never built into the app), and nothing in `public/`, `index.html`, `package.json` or the build config (`npm run build` output identical to the default branch). |
| AC-SW10 | auto | `npm run lint`, `npm run typecheck`, `npm test` pass; HANDOFF.md updated in the same PR (handoff-check green). |
| AC-SW11 | manual | Given the next code PR after this merges, then its Agents: line names qa-tdd red then green and its committed log has matching qa-tdd lines. Done-when for #50; close the issue on it. |

## Not doing
- Project-only agent rows (there are none). Any app change. Editing `.claude/agents/` by hand.
