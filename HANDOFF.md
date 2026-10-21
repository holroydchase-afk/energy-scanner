# Handoff

## Done
- 2026-10-21: plan and hard rules written (PLAN.md, CLAUDE.md). Role-Radar checked: no energy scanner files exist there, so the app starts from scratch.

## In progress
- Nothing.

## Exact next step
- Start M1 Scaffold on branch `m1-scaffold`, stacked on `claude/project-thread-xq47vx`.

## Decisions to review
- Web app (Vite + TS) with in-browser MediaPipe segmentation instead of a native app: fastest to demo and link from chaseholroyd.com.
- **Shared studio agents (branch `studio-agents`):** adds six generic agents to `.claude/agents/` (staff-pm, qa-tdd, engineer, privacy-security, ux-reviewer, positioning). Each one reads this repo's `CLAUDE.md` and `HANDOFF.md` for its rules. They don't change any code. Merge or close.

## Blockers
- None.
